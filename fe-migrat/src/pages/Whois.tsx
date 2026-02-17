import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import VisibilityToggle from '../components/VisibilityToggle'
import NearbyUserCard from '../components/NearbyUserCard'
import { api } from '../lib/api'
import { safeStorage } from '../lib/storage'
import { io } from 'socket.io-client'
import { useTranslation } from '../lib/i18n'
import { ensureAnonymousSession } from '../lib/anonymousAuth'
import { anonymousLabel } from '../lib/anonymousNames'

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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ id: string; text: string } | null>(null)
  const [hiddenList, setHiddenList] = useState<string[]>([])
  const [showHiddenPanel, setShowHiddenPanel] = useState(false)
  const [hiddenProfiles, setHiddenProfiles] = useState<Record<string, any>>({})
  const [showLocationPrompt, setShowLocationPrompt] = useState(false)
  const [manualCity, setManualCity] = useState('')
  const [geoInProgress, setGeoInProgress] = useState(false)

  const fetchNearby = useCallback(async (targetCity: string, pageNum = 1) => {
    try {
      if (pageNum > 1) setLoadingMore(true)
      else setLoading(true)
      setError(null)
      const userId = safeStorage.getItem('userId') || ''
      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams('')
      const useSeed = urlParams.get('useSeed') === '1'
      const limit = 15
      // when using seed data, fetch local file and paginate client-side
      if (useSeed) {
        try {
          const resp = await fetch('/test/whoisSeed.json', { cache: 'no-store' })
          const all: any[] = await resp.json()
          // apply same filters as server: hidden, exclude self, deleted flags
          let data = Array.isArray(all) ? all.slice() : []
          try {
            const raw = safeStorage.getItem('whois_hidden_v1')
            const hidden = raw ? (JSON.parse(raw) as string[]) : []
            if (hidden.length) data = data.filter((d: any) => {
              const id = d.userId || d._id || d.id
              return !hidden.includes(id)
            })
          } catch (e) {}

          try {
            const me = currentUserId || safeStorage.getItem('userId') || ''
            if (me) {
              data = data.filter((d: any) => {
                const id = (d.userId || d._id || d.id || '').toString()
                return id !== me
              })
            }
          } catch (e) {}

          try {
            data = data.filter((d: any) => {
              if (!d) return false
              if (d.deleted === true) return false
              if (d.isDeleted === true) return false
              if (d.removed === true) return false
              if (d.accountDeleted === true) return false
              if (typeof d.status === 'string' && d.status.toLowerCase() === 'deleted') return false
              return true
            })
          } catch (e) {}

          const augmented = data.map((u: any) => {
            if (typeof u.distanceKm === 'number') return { ...u }
            if (!currentCoords || !u.coordinates) return { ...u, distanceKm: null }
            const d = haversineKm(currentCoords.lat, currentCoords.lng, u.coordinates.lat, u.coordinates.lng)
            return { ...u, distanceKm: d }
          })

          const start = (pageNum - 1) * limit
          const pageSlice = augmented.slice(start, start + limit)
          setUsers((prev) => (pageNum === 1 ? pageSlice : [...prev, ...pageSlice]))
          setHasMore(start + limit < augmented.length)
          return
        } catch (err) {
          console.error('Failed to load seed whois:', err)
        }
      }
      // prefer live coords, fall back to persisted device coords if available
      let effectiveCoords = currentCoords
      if (!effectiveCoords) {
        try {
          const raw = safeStorage.getItem('last_device_coords')
          if (raw) {
            const parsed = JSON.parse(raw)
            if (parsed && typeof parsed.lat !== 'undefined' && typeof parsed.lng !== 'undefined') {
              effectiveCoords = { lat: Number(parsed.lat), lng: Number(parsed.lng) }
            }
          }
        } catch (e) {}
      }
      const latQs = effectiveCoords ? `&lat=${encodeURIComponent(String(effectiveCoords.lat))}&lon=${encodeURIComponent(String(effectiveCoords.lng))}` : ''
      const qs = `?city=${encodeURIComponent(targetCity)}&page=${pageNum}&limit=15${userId ? `&userId=${encodeURIComponent(userId)}` : ''}${latQs}`
      const res: any = await api.get(`/whois/nearby${qs}`, { cache: 'no-store' })
      let data = Array.isArray(res?.data) ? res.data : []
      // filter out locally hidden users
      try {
        const raw = safeStorage.getItem('whois_hidden_v1')
        const hidden = raw ? (JSON.parse(raw) as string[]) : []
        if (hidden.length) data = data.filter((d: any) => {
          const id = d.userId || d._id || d.id
          return !hidden.includes(id)
        })
      } catch (e) {}

      // Exclude the current user from results (defensive guard)
      try {
        const me = currentUserId || safeStorage.getItem('userId') || ''
        if (me) {
          data = data.filter((d: any) => {
            const id = (d.userId || d._id || d.id || '').toString()
            return id !== me
          })
        }
      } catch (e) {}

      // filter out obvious deleted-account markers returned by the API
      try {
        data = data.filter((d: any) => {
          if (!d) return false
          if (d.deleted === true) return false
          if (d.isDeleted === true) return false
          if (d.removed === true) return false
          if (d.accountDeleted === true) return false
          if (typeof d.status === 'string' && d.status.toLowerCase() === 'deleted') return false
          return true
        })
      } catch (e) {}

      const augmented = data.map((u: any) => {
        // Prefer server-provided distance if available
        if (typeof u.distanceKm === 'number') return { ...u }
        if (!currentCoords || !u.coordinates) return { ...u, distanceKm: null }
        const d = haversineKm(currentCoords.lat, currentCoords.lng, u.coordinates.lat, u.coordinates.lng)
        return { ...u, distanceKm: d }
      })

      setUsers((prev) => {
        if (pageNum === 1) return augmented
        const existingIds = new Set(prev.map((p) => (p.userId || p._id || p.id)))
        const filtered = augmented.filter((a: any) => !existingIds.has(a.userId || a._id || a.id))
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

  // Ensure we have an anonymous session & current user id
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const session = await ensureAnonymousSession()
        if (!mounted) return
        if (session?.userId) setCurrentUserId(session.userId)
      } catch (e) {
        // ignore
      }
    })()
    return () => { mounted = false }
  }, [])

  // listen for hide events from cards to remove users immediately
  useEffect(() => {
    const onHide = (ev: any) => {
      const id = ev?.detail
      if (!id) return
      setUsers((prev) => prev.filter((u) => (u.userId || u._id || u.id) !== id))
      // refresh hidden list
      try {
        const raw = safeStorage.getItem('whois_hidden_v1')
        const arr = raw ? JSON.parse(raw) as string[] : []
        setHiddenList(arr)
      } catch (e) {}
    }
    window.addEventListener('wakapadi:whois:hidden', onHide as EventListener)
    return () => window.removeEventListener('wakapadi:whois:hidden', onHide as EventListener)
  }, [])

  // load hidden list on mount
  useEffect(() => {
    try {
      const raw = safeStorage.getItem('whois_hidden_v1')
      const arr = raw ? JSON.parse(raw) as string[] : []
      setHiddenList(arr)
    } catch (e) {}
  }, [])

  // fetch profile info for hidden IDs
  useEffect(() => {
    if (!hiddenList || hiddenList.length === 0) return
    let mounted = true
    ;(async () => {
      const next: Record<string, any> = { ...hiddenProfiles }
      for (const id of hiddenList) {
        if (next[id]) continue
        try {
          const res: any = await api.get(`/users/preferences/${encodeURIComponent(id)}`, { cache: 'no-store' })
          next[id] = {
            username: res?.username || res?.data?.username || res?.data?.name || id,
            avatar: res?.avatarUrl || res?.data?.avatarUrl || undefined,
          }
        } catch (e) {
          next[id] = { username: id }
        }
      }
      if (!mounted) return
      setHiddenProfiles(next)
    })()
    return () => { mounted = false }
  }, [hiddenList])

  const unhideUser = (id: string) => {
    try {
      const raw = safeStorage.getItem('whois_hidden_v1')
      const arr = raw ? JSON.parse(raw) as string[] : []
      const next = arr.filter((x: string) => x !== id)
      safeStorage.setItem('whois_hidden_v1', JSON.stringify(next))
      setHiddenList(next)
      // refresh nearby list
      if (city) fetchNearby(city, 1)
      try { window.dispatchEvent(new CustomEvent('wakapadi:toast', { detail: { text: 'User unhidden' } })) } catch (e) {}
    } catch (e) { console.warn('unhide failed', e) }
  }

  const unhideAll = () => {
    try {
      safeStorage.setItem('whois_hidden_v1', JSON.stringify([]))
      setHiddenList([])
      if (city) fetchNearby(city, 1)
      try { window.dispatchEvent(new CustomEvent('wakapadi:toast', { detail: { text: 'All users unhidden' } })) } catch (e) {}
    } catch (e) { console.warn('unhide all failed', e) }
  }

  const pingPresence = async (targetCity: string) => {
    try {
      // only ping if we have an auth token
      const token = safeStorage.getItem('token')
      if (!token) return
      const payload: any = { city: targetCity }
      // prefer live coords, fall back to persisted device coords
      let coordsToSend = currentCoords
      if (!coordsToSend) {
        try {
          const raw = safeStorage.getItem('last_device_coords')
          if (raw) {
            const parsed = JSON.parse(raw)
            if (parsed && typeof parsed.lat !== 'undefined' && typeof parsed.lng !== 'undefined') {
              coordsToSend = { lat: Number(parsed.lat), lng: Number(parsed.lng) }
            }
          }
        } catch (e) {}
      }
      if (coordsToSend) payload.coordinates = { lat: Number(coordsToSend.lat), lng: Number(coordsToSend.lng) }
      // debug removed
      await api.post('/whois/ping', payload)
    } catch (err) {
      console.error('Ping presence failed:', err)
    }
  }

  const handleFindNearby = async () => {
    setLoading(true)
    setError(null)
    setPage(1)
    setGeoInProgress(true)

    // ensure we have an anonymous session so we can reliably exclude current user
    try {
      const session = await ensureAnonymousSession()
      if (session?.userId) setCurrentUserId(session.userId)
    } catch (e) {
      // continue — presence/fetch will still run but may not exclude self until session created
    }

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
    // On initial mount: try to use a previously stored device location, or request device location
    let mounted = true

    const tryStoredOrPrompt = async () => {
      try {
        // ensure we have a session early so fetchNearby can exclude current user
        try {
          const session = await ensureAnonymousSession()
          if (session?.userId) setCurrentUserId(session.userId)
        } catch (e) {
          // ignore session errors
        }
        // if we already have a city set, skip
        if (!mounted) return
        const stored = safeStorage.getItem('last_device_coords')
        if (stored) {
          try {
            const parsed = JSON.parse(stored)
            if (parsed?.lat && parsed?.lng) {
              setCurrentCoords({ lat: Number(parsed.lat), lng: Number(parsed.lng) })
              // reverse geocode to get city and fetch
              try {
                const geo: any = await api.get(`/geolocation/reverse?lat=${parsed.lat}&lon=${parsed.lng}`, { cache: 'no-store' })
                const detectedCity = (geo?.data?.address?.city || geo?.data?.address?.town || geo?.data?.address?.village || '').trim().toLowerCase()
                if (detectedCity) {
                    setCity(detectedCity)
                    await pingPresence(detectedCity)
                    await fetchNearby(detectedCity, 1)
                    return
                  }
              } catch (e) {
                // fallthrough to prompt
              }
            }
          } catch (e) {}
        }

        // If no stored coords, attempt to request device location (this may prompt the user)
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(async (pos) => {
            if (!mounted) return
            const { latitude, longitude } = pos.coords
            // persist for future visits
            try { safeStorage.setItem('last_device_coords', JSON.stringify({ lat: latitude, lng: longitude })) } catch (e) {}
            setCurrentCoords({ lat: latitude, lng: longitude })
            try {
              const geo: any = await api.get(`/geolocation/reverse?lat=${latitude}&lon=${longitude}`, { cache: 'no-store' })
              const detectedCity = (geo?.data?.address?.city || geo?.data?.address?.town || geo?.data?.address?.village || '').trim().toLowerCase()
              if (detectedCity) {
                setCity(detectedCity)
                // ensure session again before ping/fetch
                try { const session = await ensureAnonymousSession(); if (session?.userId) setCurrentUserId(session.userId) } catch (e) {}
                await pingPresence(detectedCity)
                await fetchNearby(detectedCity, 1)
              }
            } catch (e) {
              console.warn('reverse geocode failed on mount', e)
            }
          }, (err) => {
            // user denied or error; leave UI as-is (they can click the button)
            console.warn('device location not available on mount', err)
          }, { timeout: 8000 })
        }
      } catch (e) {
        console.warn('initial location attempt failed', e)
      }
    }

    tryStoredOrPrompt()

    return () => { mounted = false }
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

    // Simple debounce/dedupe map to avoid rapid duplicate online/offline events
    const ACTIVITY_DEBOUNCE_MS = 3000
    const recentActivity = new Map<string, number>()

    socket.on('connect', () => {
      // optionally re-join notifications room
      const currentUserId = safeStorage.getItem('userId')
      if (currentUserId) socket.emit('joinNotifications', { userId: currentUserId })
    })

    socket.on('userOnline', async (userId: string) => {
      try {
        const now = Date.now()
        const last = recentActivity.get(userId) || 0
        if (now - last < ACTIVITY_DEBOUNCE_MS) return
        recentActivity.set(userId, now)

        // mark user active in the current list if present
        let found = false
        setUsers((prev) => {
          const next = prev.map((u) => {
            const cid = (u.userId || u._id || u.id)
            if (cid === userId) {
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
              // dedupe: ensure we don't already have this id (race guard)
              setUsers((prev) => {
                if (prev.some((p) => ((p.userId || p._id || p.id) === userId))) return prev
                return [item, ...prev]
              })
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
      } catch (e) {
        console.warn('userOnline handler error', e)
      }
    })

    socket.on('userOffline', (userId: string) => {
      try {
        const nowTs = Date.now()
        const last = recentActivity.get(userId) || 0
        if (nowTs - last < ACTIVITY_DEBOUNCE_MS) return
        recentActivity.set(userId, nowTs)
        // mark user offline in the current list if present
        const now = new Date().toISOString()
        setUsers((prev) => prev.map((u) => ((u.userId || u._id || u.id) === userId ? { ...u, active: false, lastSeen: now } : u)))
      } catch (e) {
        console.warn('userOffline handler error', e)
      }
    })

    socket.on('connect_error', (err: any) => {
      console.warn('Socket connect error', err)
    })

    return () => {
      try { socket.disconnect() } catch (e) {}
    }
  }, [fetchNearby])

  // Listen for local hide toast events
  useEffect(() => {
    const onToast = (ev: any) => {
      const d = ev?.detail
      if (!d || !d.text) return
      try {
        setToast({ id: String(Date.now()), text: d.text })
        setTimeout(() => setToast(null), 3200)
      } catch (e) {}
    }
    window.addEventListener('wakapadi:toast', onToast as EventListener)
    return () => window.removeEventListener('wakapadi:toast', onToast as EventListener)
  }, [])

  const visibleUsers = useMemo(() => users.filter((u) => {
    if (!u) return false
    const hasId = !!(u.userId || u._id || u.id)
    const hasLocation = (
      (u.coordinates && typeof u.coordinates.lat !== 'undefined' && typeof u.coordinates.lng !== 'undefined') ||
      (typeof u.distanceKm === 'number')
    )
    return hasId && hasLocation
  }), [users])

  return (
    <section aria-labelledby="whois-heading" className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 id="whois-heading" className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{t('whoisNearby')}</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{t('whoisDescription')}</p>
          {currentUserId && (
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">{t('whoisYouNotListed') || "You won't appear in this list"}</div>
          )}
        </div>
        <div className="mt-2 sm:mt-0">
          <div role="status" className="flex items-start gap-3 text-sm bg-yellow-50 dark:bg-yellow-900 border-l-4 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 px-3 py-2 rounded">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.72-1.36 3.485 0l5.516 9.8c.75 1.333-.213 2.98-1.742 2.98H4.483c-1.529 0-2.492-1.647-1.742-2.98l5.516-9.8zM11 13a1 1 0 10-2 0 1 1 0 002 0zm-1-8a1 1 0 00-.993.883L8.9 7.5a1 1 0 001.993 0l-.107-1.617A1 1 0 0010 5z" clipRule="evenodd"/></svg>
            <div className="text-sm">{t('whoisSafetyWarning')}</div>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <VisibilityToggle />

       <>{safeStorage.getItem('userId') &&<div className="mt-3">
          <button
            onClick={() => setShowLocationPrompt(true)}
            className="px-4 py-2 bg-blue-600 text-gray-700 dark:text-gray-100 rounded-md hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600"
          >{t('whoisFindNearby')}</button>
          <button
            onClick={() => setShowHiddenPanel(true)}
            className="ml-3 px-3 py-2 border rounded-md text-sm"
          >Manage hidden users</button>
        </div>
}</>
        {/* Location permission explanation / fallback */}
        {showLocationPrompt && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{t('whoisAllowLocationTitle')}</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{t('whoisAllowLocationBody')}</p>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={async () => {
                    setGeoInProgress(true)
                    setShowLocationPrompt(false)
                    try { await handleFindNearby() } finally { setGeoInProgress(false) }
                  }}
                  className="px-4 py-2 bg-green-600 text-gray-700 dark:text-gray-100 rounded-md hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-300"
                >
                  {t('whoisAllow')}
                </button>
                <button onClick={() => setShowLocationPrompt(false)} className="px-4 py-2 border rounded-md">{t('cancel')}</button>
              </div>

              <div className="mt-4">
                <label className="block text-xs text-gray-500">{t('whoisEnterCityManualLabel')}</label>
                <div className="flex gap-2 mt-2">
                  <input value={manualCity} onChange={(e) => setManualCity(e.target.value)} placeholder={t('exampleCity')} className="flex-1 px-3 py-2 border rounded-md" />
                  <button onClick={async () => {
                    if (!manualCity.trim()) return
                    const normalized = manualCity.trim().toLowerCase()
                    setShowLocationPrompt(false)
                    setCity(normalized)
                    setPage(1)
                    setLoading(true)
                    try {
                        // ensure session exists so we can exclude current user
                        try { const session = await ensureAnonymousSession(); if (session?.userId) setCurrentUserId(session.userId) } catch (e) {}
                        await pingPresence(normalized)
                        await fetchNearby(normalized, 1)
                    } catch (e) {
                      console.warn('manual city fetch failed', e)
                      setError('Failed to load nearby users')
                    } finally {
                      setLoading(false)
                    }
                  }} className="px-3 py-2 bg-blue-600 text-gray-700 dark:text-gray-100 rounded-md hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">{t('whoisUseCity')}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showHiddenPanel && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Hidden users</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Users you've hidden locally. Unhide to show them again.</p>
              <div className="mt-4 space-y-2 max-h-64 overflow-auto">
                {hiddenList.length === 0 ? (
                  <div className="text-sm text-gray-600">No hidden users</div>
                ) : (
                  hiddenList.map((id) => (
                    <div key={id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        {hiddenProfiles[id]?.avatar ? (
                          <img src={hiddenProfiles[id].avatar} alt={(hiddenProfiles[id]?.profileVisible === false ? anonymousLabel(undefined, id) : hiddenProfiles[id]?.username) || id} className="w-10 h-10 md:w-8 md:h-8 rounded-full" />
                        ) : (
                          <div className="w-10 h-10 md:w-8 md:h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs">{((hiddenProfiles[id]?.profileVisible === false ? anonymousLabel(undefined, id) : hiddenProfiles[id]?.username) || id).charAt(0)}</div>
                        )}
                        <div className="text-sm truncate">{hiddenProfiles[id]?.profileVisible === false ? anonymousLabel(undefined, id) : (hiddenProfiles[id]?.username || id)}</div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { unhideUser(id) }} className="px-2 py-1 bg-green-600 text-white rounded text-xs">Unhide</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => { unhideAll(); setShowHiddenPanel(false) }} className="px-3 py-2 border rounded">Unhide all</button>
                <button onClick={() => setShowHiddenPanel(false)} className="px-3 py-2 bg-blue-600 text-white rounded">Close</button>
              </div>
            </div>
          </div>
        )}

        {geoInProgress && (
          <div className="mt-2 text-sm text-gray-600">{t('whoisRequestingLocation')}</div>
        )}

        {error && <div className="text-red-700 text-sm">{error}</div>}

        {/* Toast for new nearby user */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50">
            <div className="bg-white text-gray-900 border shadow px-4 py-2 rounded-md text-sm dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700">{toast.text}</div>
          </div>
        )}

        <div className="grid gap-3 mt-4">
          {loading && visibleUsers.length === 0 ? (
            Array.from({ length: 3 }).map((_, i) => <div key={i} className="p-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse h-20" />)
          ) : visibleUsers.length > 0 ? (
            visibleUsers.map((u) => <NearbyUserCard key={u.userId || u._id || u.id} user={u} />)
          ) : (
            city && !loading ? (
              <div className="text-center text-gray-600 space-y-3">
                <div className="text-base font-medium">{t('whoisNoTravelersTitle')}</div>
                <div className="text-sm">{t('whoisNoTravelersSubtitle')}</div>
                <ul className="list-disc list-inside text-sm text-gray-600">
                  <li>{t('whoisNoTravelersOptionOne')}</li>
                  <li>{t('whoisNoTravelersOptionTwo')}</li>
                  <li>{t('whoisNoTravelersOptionThree')}</li>
                </ul>
                <div className="mt-3 flex justify-center gap-3">
                  <button onClick={() => fetchNearby(city, 1)} className="px-4 py-2 border rounded dark:border-gray-700 dark:text-gray-100">{t('retry')}</button>
                  <a href="/tours" className="px-4 py-2 bg-white dark:bg-gray-800 border rounded-md dark:border-gray-700 dark:text-gray-100">{t('heroCtaExplore')}</a>
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

