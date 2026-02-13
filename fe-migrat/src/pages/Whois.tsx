import { useState, useEffect, useCallback, useRef } from 'react'
import VisibilityToggle from '../components/VisibilityToggle'
import NearbyUserCard from '../components/NearbyUserCard'
import { api } from '../lib/api'
import { safeStorage } from '../lib/storage'
import { io } from 'socket.io-client'
import { useTranslation } from '../lib/i18n'

const toRadians = (value: number) => (value * Math.PI) / 180
const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const earthRadiusKm = 6371
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadiusKm * c
}

export default function Whois() {
  const { t } = useTranslation()
  const [city, setCity] = useState('')
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [toast, setToast] = useState<{ id: string; text: string } | null>(null)
  const [showLocationPrompt, setShowLocationPrompt] = useState(false)
  const [manualCity, setManualCity] = useState('')
  const [geoInProgress, setGeoInProgress] = useState(false)

  const fetchNearby = useCallback(async (targetCity: string, pageNum = 1) => {
    try {
      if (pageNum > 1) setLoadingMore(true)
      setError(null)
      const userId = safeStorage.getItem('userId') || ''
      const qs = `?city=${encodeURIComponent(targetCity)}&page=${pageNum}&limit=15${userId ? `&userId=${encodeURIComponent(userId)}` : ''}`
      const res: any = await api.get(`/whois/nearby${qs}`, { cache: 'no-store' })
      const data = Array.isArray(res?.data) ? res.data : []

      const augmented = data.map((u: any) => {
        if (!currentCoords || !u.coordinates) return { ...u, distanceKm: null }
        const d = haversineKm(currentCoords.lat, currentCoords.lng, u.coordinates.lat, u.coordinates.lng)
        return { ...u, distanceKm: d }
      })

      setUsers((prev) => {
        if (pageNum === 1) return augmented
        const existingIds = new Set(prev.map((p) => p._id))
        const filtered = augmented.filter((a: any) => !existingIds.has(a._id))
        return [...prev, ...filtered]
      })

      setHasMore(data.length === 15)
    } catch (err) {
      console.error('Fetch nearby failed:', err)
      setError('Failed to load nearby users')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [currentCoords])

  const pingPresence = async (targetCity: string) => {
    try {
      // only ping if we have an auth token
      const token = safeStorage.getItem('token')
      if (!token) return
      await api.post('/whois/ping', { city: targetCity })
    } catch (err) {
      console.error('Ping presence failed:', err)
    }
  }

  const handleFindNearby = async () => {
    setLoading(true)
    setError(null)
    setPage(1)
    setGeoInProgress(true)

    if (!navigator.geolocation) {
      setError('Geolocation is not available in your browser')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords
          setCurrentCoords({ lat: latitude, lng: longitude })
          const geo: any = await api.get(`/geolocation/reverse?lat=${latitude}&lon=${longitude}`, { cache: 'no-store' })
          const detectedCity = (geo?.data?.address?.city || geo?.data?.address?.town || geo?.data?.address?.village || '').trim().toLowerCase()
          if (!detectedCity) {
            setError('Could not determine city from your location')
            setLoading(false)
            setGeoInProgress(false)
            return
          }
          setCity(detectedCity)
          await pingPresence(detectedCity)
          await fetchNearby(detectedCity, 1)
        } catch (err) {
          setError('Failed to detect city')
          setLoading(false)
        } finally {
          setGeoInProgress(false)
        }
      },
      () => {
        setError('Location permission denied')
        setLoading(false)
        setGeoInProgress(false)
      },
      { timeout: 10000 }
    )
  }

  const loadMore = () => {
    if (!city || loadingMore || !hasMore) return
    const next = page + 1
    setPage(next)
    fetchNearby(city, next)
  }

  useEffect(() => {
    // initial mount: no-op
  }, [])

  // live updates: subscribe to userOnline/userOffline and refresh nearby list
  const cityRef = useRef(city)
  useEffect(() => {
    cityRef.current = city
  }, [city])

  useEffect(() => {
    const token = safeStorage.getItem('token')
    if (!token) return

    const SOCKET = import.meta.env.VITE_SOCKET_URL || ''
    const socket = io(SOCKET || undefined, { path: '/socket.io', transports: ['websocket'], auth: { token } })

    socket.on('connect', () => {
      // optionally re-join notifications room
      const currentUserId = safeStorage.getItem('userId')
      if (currentUserId) socket.emit('joinNotifications', { userId: currentUserId })
    })

    socket.on('userOnline', async (userId: string) => {
      // mark user active in the current list if present
      let found = false
      setUsers((prev) => {
        const next = prev.map((u) => {
          if (u._id === userId || u.id === userId) {
            found = true
            return { ...u, active: true, lastSeen: null }
          }
          return u
        })
        return next
      })

      // if not found in current list, attempt to fetch minimal profile and prepend
      if (!found) {
        try {
          const profile: any = await api.get(`/users/preferences/${encodeURIComponent(userId)}`, { cache: 'no-store' })
          if (profile) {
            const item = {
              _id: userId,
              username: profile.username || 'Traveler',
              name: profile.username || profile.name || undefined,
              avatar: profile.avatarUrl || `https://i.pravatar.cc/40?u=${userId}`,
              bio: profile.bio || undefined,
              travelPrefs: profile.travelPrefs || undefined,
              languages: profile.languages || undefined,
              socials: profile.socials || undefined,
              gender: profile.gender || undefined,
              profileVisible: typeof profile.profileVisible === 'boolean' ? profile.profileVisible : undefined,
              active: true,
              lastSeen: null,
              coordinates: profile.coordinates || null,
            }
            setUsers((prev) => [item, ...prev])
            // show toast for new nearby user
            try {
              setToast({ id: userId, text: `${item.username || 'Traveler'} is nearby` })
              setTimeout(() => setToast(null), 3200)
            } catch (e) {}
          }
        } catch (err) {
          // ignore failures to fetch profile
          console.warn('Could not fetch user profile for', userId)
        }
      }
    })

    socket.on('userOffline', (userId: string) => {
      // mark user offline in the current list if present
      const now = new Date().toISOString()
      setUsers((prev) => prev.map((u) => (u._id === userId || u.id === userId ? { ...u, active: false, lastSeen: now } : u)))
    })

    socket.on('connect_error', (err: any) => {
      console.warn('Socket connect error', err)
    })

    return () => {
      try { socket.disconnect() } catch (e) {}
    }
  }, [fetchNearby])

  return (
    <section aria-labelledby="whois-heading" className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 id="whois-heading" className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{t('whoisNearby')}</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-300">{t('whoisDescription')}</p>
        </div>
        <div className="text-sm text-gray-700">{t('whoisSafetyWarning')}</div>
      </div>

      <div className="mt-6 space-y-4">
        <VisibilityToggle />

        <div className="mt-3">
          <button onClick={() => setShowLocationPrompt(true)} className="px-4 py-2 bg-blue-600 text-white rounded-md">{t('whoisFindNearby')}</button>
        </div>

        {/* Location permission explanation / fallback */}
        {showLocationPrompt && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('whoisAllowLocationTitle')}</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{t('whoisAllowLocationBody')}</p>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={async () => {
                    setGeoInProgress(true)
                    setShowLocationPrompt(false)
                    try { await handleFindNearby() } finally { setGeoInProgress(false) }
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-md"
                >
                  {t('whoisAllow')}
                </button>
                <button onClick={() => setShowLocationPrompt(false)} className="px-4 py-2 border rounded-md">{t('cancel')}</button>
              </div>

              <div className="mt-4">
                <label className="block text-xs text-gray-500">{t('whoisEnterCityManualLabel')}</label>
                <div className="flex gap-2 mt-2">
                  <input value={manualCity} onChange={(e) => setManualCity(e.target.value)} placeholder={t('exampleCity')} className="flex-1 px-3 py-2 border rounded-md" />
                  <button onClick={async () => { if (manualCity.trim()) { setShowLocationPrompt(false); setCity(manualCity.trim().toLowerCase()); await pingPresence(manualCity.trim().toLowerCase()); await fetchNearby(manualCity.trim().toLowerCase(), 1) } }} className="px-3 py-2 bg-blue-600 text-white rounded-md">{t('whoisUseCity')}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {geoInProgress && (
          <div className="mt-2 text-sm text-gray-600">{t('whoisRequestingLocation')}</div>
        )}

        {error && <div className="text-red-700">{error}</div>}

        {/* Toast for new nearby user */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50">
            <div className="bg-white border shadow px-4 py-2 rounded-md text-sm">{toast.text}</div>
          </div>
        )}

        <div className="grid gap-3 mt-4">
          {loading && users.length === 0 ? (
            Array.from({ length: 3 }).map((_, i) => <div key={i} className="p-3 bg-gray-100 rounded animate-pulse h-20" />)
          ) : users.length > 0 ? (
            users.map((u) => <NearbyUserCard key={u._id || u.id} user={u} />)
          ) : (
            city && !loading ? (
              <div className="text-center text-gray-600 space-y-3">
                <div className="text-lg font-medium">{t('whoisNoTravelersTitle')}</div>
                <div className="text-sm">{t('whoisNoTravelersSubtitle')}</div>
                <ul className="list-disc list-inside text-sm text-gray-600">
                  <li>{t('whoisNoTravelersOptionOne')}</li>
                  <li>{t('whoisNoTravelersOptionTwo')}</li>
                  <li>{t('whoisNoTravelersOptionThree')}</li>
                </ul>
                <div className="mt-3 flex justify-center gap-3">
                  <button onClick={() => fetchNearby(city, 1)} className="px-4 py-2 border rounded">{t('retry')}</button>
                  <a href="/tours" className="px-4 py-2 bg-white border rounded-md">{t('heroCtaExplore')}</a>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-600">No users found nearby — try again later or explore tours.</div>
            )
          )}
        </div>

        {hasMore && !loading && (
          <div className="mt-4 text-center">
            <button onClick={loadMore} className="px-4 py-2 border rounded">{loadingMore ? 'Loading...' : 'Load more'}</button>
          </div>
        )}
      </div>
    </section>
  )
}

