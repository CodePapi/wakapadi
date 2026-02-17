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
  // Prevent layout shift when modals open by ensuring a stable scrollbar
  useEffect(() => {
    try {
      const prev = document.body.style.overflowY
      document.body.style.overflowY = 'scroll'
      return () => { document.body.style.overflowY = prev }
    } catch (e) {
      return () => {}
    }
    }, [])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => (safeStorage.getItem('whois_view') as 'grid' | 'list') || 'grid')

  // Local UI & data state
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [city, setCity] = useState('')
  const [hiddenList, setHiddenList] = useState<string[]>([])
  const [hiddenProfiles, setHiddenProfiles] = useState<Record<string, any>>({})
  const [fetchingCities, setFetchingCities] = useState(false)
  const [availableCities, setAvailableCities] = useState<Array<{ city: string; count: number; display: string }>>([])
  const [manualCity, setManualCity] = useState('')
  const [showLocationPrompt, setShowLocationPrompt] = useState(false)
  const [showHiddenPanel, setShowHiddenPanel] = useState(false)
  const [geoInProgress, setGeoInProgress] = useState(false)
  const [authToken, setAuthToken] = useState<string | null>(() => safeStorage.getItem('token') || null)
  const [toast, setToast] = useState<{ id: string; text: string } | null>(null)

  const fetchNearby = useCallback(async (targetCity: string, pageNum = 1) => {
    try {
      if (pageNum > 1) setLoadingMore(true)
      else setLoading(true)
      setError(null)
      // Only include userId when authenticated (token present). Anonymous sessions should not reveal identities.
      const token = safeStorage.getItem('token')
      const userId = token ? (safeStorage.getItem('userId') || '') : ''
      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams('')
      const useSeed = urlParams.get('useSeed') === '1'
      // When requesting a global/initial load (no city, first page), request up to 100 users to populate the page.
      const limit = (!targetCity && pageNum === 1) ? 100 : 15
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

          // sort by proximity (unknown distances last)
          augmented.sort((a: any, b: any) => {
            const ad = typeof a.distanceKm === 'number' ? a.distanceKm : null
            const bd = typeof b.distanceKm === 'number' ? b.distanceKm : null
            if (ad === null && bd === null) return 0
            if (ad === null) return 1
            if (bd === null) return -1
            return ad - bd
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
      const qs = `?city=${encodeURIComponent(targetCity)}&page=${pageNum}&limit=${encodeURIComponent(String(limit))}${userId ? `&userId=${encodeURIComponent(userId)}` : ''}${latQs}`
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

      // sort by proximity (unknown distances last)
      augmented.sort((a: any, b: any) => {
        const ad = typeof a.distanceKm === 'number' ? a.distanceKm : null
        const bd = typeof b.distanceKm === 'number' ? b.distanceKm : null
        if (ad === null && bd === null) return 0
        if (ad === null) return 1
        if (bd === null) return -1
        return ad - bd
      })

      // Fetch preferences in batch to avoid N individual requests and merge
      try {
        const ids = augmented.map((u: any) => (u.userId || u._id || u.id)).filter(Boolean)
        if (ids.length) {
          const idsParam = encodeURIComponent(ids.join(','))
          const prefsRes: any = await api.get(`/public/users/preferences/batch?ids=${idsParam}`, { cache: 'no-store' })
          const prefsArr: any[] = Array.isArray(prefsRes?.data) ? prefsRes.data : []
          const prefsMap: Record<string, any> = {}
          for (const p of prefsArr) {
            try { if (p && p._id) prefsMap[String(p._id)] = p } catch (e) {}
          }
          for (let i = 0; i < augmented.length; i++) {
            const id = (augmented[i].userId || augmented[i]._id || augmented[i].id) as string
            const pref = prefsMap[String(id)]
            if (pref) {
              augmented[i] = {
                ...augmented[i],
                // merge common public preference fields
                username: pref.username || augmented[i].username,
                avatarUrl: pref.avatarUrl || augmented[i].avatarUrl,
                profileVisible: typeof pref.profileVisible === 'boolean' ? pref.profileVisible : augmented[i].profileVisible,
                travelPrefs: pref.travelPrefs || augmented[i].travelPrefs,
                languages: pref.languages || augmented[i].languages,
                socials: pref.socials || augmented[i].socials,
                bio: pref.bio || augmented[i].bio,
              }
            }
          }
        }
      } catch (e) {
        // ignore batch merge errors — fallback to original augmented items
        console.warn('Batch preferences merge failed', e)
      }

      setUsers((prev) => {
        if (pageNum === 1) return augmented
        const existingIds = new Set(prev.map((p) => (p.userId || p._id || p.id)))
        const filtered = augmented.filter((a: any) => !existingIds.has(a.userId || a._id || a.id))
        // append new unique items and keep list sorted by distance
        const combined = [...prev, ...filtered]
        combined.sort((a: any, b: any) => {
          const ad = typeof a.distanceKm === 'number' ? a.distanceKm : null
          const bd = typeof b.distanceKm === 'number' ? b.distanceKm : null
          if (ad === null && bd === null) return 0
          if (ad === null) return 1
          if (bd === null) return -1
          return ad - bd
        })
        return combined
      })

      setHasMore(data.length === limit)
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

  const fetchAvailableCities = async () => {
    setFetchingCities(true)
    try {
      // Fetch a bounded set of worldwide/online whois users and derive cities from them.
      // Use an empty city query so backend returns global/online users.
      const wRes: any = await api.get('/whois/nearby?city=&page=1&limit=100', { cache: 'no-store' })
      const users: any[] = Array.isArray(wRes?.data) ? wRes.data : []

      const counts: Record<string, number> = {}
      const displays: Record<string, string> = {}
      for (const u of users) {
        if (!u) continue
        // Attempt to detect a user city from common fields
        let raw = ''
        if (typeof u.city === 'string' && u.city.trim()) raw = u.city.trim()
        else if (u.location && typeof u.location.city === 'string' && u.location.city.trim()) raw = u.location.city.trim()
        else if (u.address && typeof u.address.city === 'string' && u.address.city.trim()) raw = u.address.city.trim()
        else if (typeof u.region === 'string' && u.region.trim()) raw = u.region.trim()
        if (!raw) continue
        const key = raw.toLowerCase()
        counts[key] = (counts[key] || 0) + 1
        if (!displays[key]) displays[key] = raw
      }

      const active = Object.keys(counts).map((cityKey) => ({ city: cityKey, count: counts[cityKey], display: displays[cityKey] || cityKey })).sort((a, b) => b.count - a.count)
      setAvailableCities(active)
    } catch (e) {
      setAvailableCities([])
    } finally {
      setFetchingCities(false)
    }
  }

  useEffect(() => {
    if (!showLocationPrompt) return
    fetchAvailableCities()
  }, [showLocationPrompt])

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
      // notify any socket listener that we've successfully pinged presence
      try { window.dispatchEvent(new CustomEvent('wakapadi:whois:pinged', { detail: { city: targetCity, coordinates: payload.coordinates } })) } catch (e) {}
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
          const detectedCity = (geo?.data?.address?.city || geo?.data?.address?.town || geo?.data?.address?.village || '').trim()
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
      async () => {
        // location permission denied — attempt IP-based lookup as a graceful fallback
        try {
          const r = await api.get('/geolocation/ip', { cache: 'no-store' })
          const info = r?.data || {}
          const cityFromIp = info.city || info.region || info.region_code || info.country_name
          const lat = info.latitude || info.lat
          const lon = info.longitude || info.lon || info.long

          if (lat && lon) {
            try { safeStorage.setItem('last_device_coords', JSON.stringify({ lat, lng: lon })) } catch (e) {}
            setCurrentCoords({ lat: Number(lat), lng: Number(lon) })
          }

          if (cityFromIp) {
            const normalized = String(cityFromIp).trim()
            setCity(normalized)
            try { const session = await ensureAnonymousSession(); if (session?.userId) setCurrentUserId(session.userId) } catch (e) {}
            await pingPresence(normalized)
            await fetchNearby(normalized, 1)
            setGeoInProgress(false)
            setLoading(false)
            return
          }

          if (lat && lon) {
            try {
              const geo: any = await api.get(`/geolocation/reverse?lat=${lat}&lon=${lon}`, { cache: 'no-store' })
              const detectedCity = (geo?.data?.address?.city || geo?.data?.address?.town || geo?.data?.address?.village || '').trim()
              if (detectedCity) {
                setCity(detectedCity)
                try { const session = await ensureAnonymousSession(); if (session?.userId) setCurrentUserId(session.userId) } catch (e) {}
                await pingPresence(detectedCity)
                await fetchNearby(detectedCity, 1)
                setGeoInProgress(false)
                setLoading(false)
                return
              }
            } catch (e) {
              // fallthrough to set error below
            }
          }
        } catch (e) {
          // ignore IP lookup errors
        }

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
    // Also fetch global online users so the page shows people immediately.
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
                const detectedCity = (geo?.data?.address?.city || geo?.data?.address?.town || geo?.data?.address?.village || '').trim()
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
              const detectedCity = (geo?.data?.address?.city || geo?.data?.address?.town || geo?.data?.address?.village || '').trim()
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

    ;(async () => {
      await tryStoredOrPrompt()
      try { await fetchNearby('', 1) } catch (e) {}
    })()

    return () => { mounted = false }
  }, [])

  // live updates: subscribe to userOnline/userOffline and refresh nearby list
  const cityRef = useRef(city)
  useEffect(() => {
    cityRef.current = city
  }, [city])

  // keep a ref of latest coordinates for socket handlers
  const coordsRef = useRef<{ lat: number; lng: number } | null>(currentCoords)
  useEffect(() => {
    coordsRef.current = currentCoords
  }, [currentCoords])

  useEffect(() => {
    const token = authToken
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

    socket.on('userOnline', async (userIdOrPayload: any) => {
      try {
        const now = Date.now()
        const id = typeof userIdOrPayload === 'string' ? userIdOrPayload : (userIdOrPayload && userIdOrPayload.userId)
        if (!id) return
        const last = recentActivity.get(id) || 0
        if (now - last < ACTIVITY_DEBOUNCE_MS) return
        recentActivity.set(id, now)

        // mark user active in the current list if present
        let found = false
        setUsers((prev) => {
          const next = prev.map((u) => {
            const cid = (u.userId || u._id || u.id)
            if (cid === id) {
              found = true
              return { ...u, active: true, lastSeen: null }
            }
            return u
          })
          return next
        })

        // If the gateway supplied a presence payload, we can add the user immediately without an extra HTTP fetch.
        const presence = userIdOrPayload && userIdOrPayload.presence ? userIdOrPayload.presence : null
        if (!found) {
          if (presence && presence.coordinates && typeof presence.coordinates.lat === 'number' && typeof presence.coordinates.lng === 'number') {
            try {
              const item = {
                _id: id,
                userId: id,
                city: presence.city || '',
                coordinates: presence.coordinates,
                active: true,
                lastSeen: null,
                distanceKm: null,
              }
              setUsers((prev) => {
                if (prev.some((p) => ((p.userId || p._id || p.id) === id))) return prev
                return [item, ...prev]
              })
              try { setToast({ id, text: `Someone is nearby` }); setTimeout(() => setToast(null), 3200) } catch (e) {}
            } catch (e) {
              console.warn('Failed to prepend presence from socket payload', e)
              try { await fetchNearby(cityRef.current || '', 1) } catch (err) { console.warn('Failed to refresh nearby users on userOnline event', err) }
            }
          } else {
            // Fallback: refresh nearby list so the client picks up the new presence (server-side stored)
            try { await fetchNearby(cityRef.current || '', 1) } catch (err) { console.warn('Failed to refresh nearby users on userOnline event', err) }
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

    // Listen for visibility changes, logout, and ping events so we can emit join/leave in real-time
    const onVisibilityChanged = (ev: any) => {
      try {
        const detail = ev && ev.detail
        const visible = !!(detail && detail.visible)
        const uid = safeStorage.getItem('userId') || ''
        const coords = coordsRef.current
        if (!uid) return
        if (visible && coords) {
          try { if (socket && typeof (socket as any).emit === 'function') socket.emit('whois:join', { userId: uid, city: cityRef.current || '', coordinates: { lat: coords.lat, lng: coords.lng } }) } catch (e) { console.warn('whois join emit failed', e) }
        } else {
          try { if (socket && typeof (socket as any).emit === 'function') socket.emit('whois:leave', { userId: uid }) } catch (e) { console.warn('whois leave emit failed', e) }
        }
      } catch (e) { console.warn('onVisibilityChanged handler failed', e) }
    }

    const onLogout = () => {
      try {
        const uid = safeStorage.getItem('userId') || ''
        if (!uid) return
        try { if (socket && typeof (socket as any).emit === 'function') socket.emit('whois:leave', { userId: uid }) } catch (e) { console.warn('whois leave emit failed', e) }
      } catch (e) { console.warn('onLogout handler failed', e) }
    }

    const onPing = (ev: any) => {
      try {
        const detail = ev && ev.detail
        const uid = safeStorage.getItem('userId') || ''
        const coords = detail && detail.coordinates ? detail.coordinates : coordsRef.current
        if (!uid || !coords) return
        try { if (socket && typeof (socket as any).emit === 'function') socket.emit('whois:join', { userId: uid, city: detail?.city || cityRef.current || '', coordinates: { lat: Number(coords.lat), lng: Number(coords.lng) } }) } catch (e) { console.warn('whois join emit failed (ping)', e) }
      } catch (e) { console.warn('onPing handler failed', e) }
    }

    window.addEventListener('wakapadi:visibility-changed', onVisibilityChanged as EventListener)
    window.addEventListener('wakapadi:logout', onLogout as EventListener)
    window.addEventListener('wakapadi:whois:pinged', onPing as EventListener)

    return () => {
      try { window.removeEventListener('wakapadi:visibility-changed', onVisibilityChanged as EventListener) } catch (e) {}
      try { window.removeEventListener('wakapadi:logout', onLogout as EventListener) } catch (e) {}
      try { window.removeEventListener('wakapadi:whois:pinged', onPing as EventListener) } catch (e) {}
      try { socket.disconnect() } catch (e) {}
    }
  }, [fetchNearby, authToken])

  // Listen for login events so we can initialize socket real-time subscriptions
  useEffect(() => {
    const onLogin = () => {
      try {
        const t = safeStorage.getItem('token') || null
        setAuthToken(t)
      } catch (e) {
        setAuthToken(null)
      }
    }
    const onLogoutLocal = () => setAuthToken(null)
    const onStorage = (ev: StorageEvent) => {
      try {
        if (!ev) return
        if (ev.key === 'token') {
          setAuthToken(ev.newValue || null)
        }
      } catch (e) {}
    }

    window.addEventListener('wakapadi:login', onLogin as EventListener)
    window.addEventListener('wakapadi:logout', onLogoutLocal as EventListener)
    window.addEventListener('storage', onStorage as EventListener)
    // also update authToken on mount in case token was set earlier
    onLogin()
    return () => {
      window.removeEventListener('wakapadi:login', onLogin as EventListener)
      window.removeEventListener('wakapadi:logout', onLogoutLocal as EventListener)
      window.removeEventListener('storage', onStorage as EventListener)
    }
  }, [])

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
    // Show users even if location data is not available so visitors see online people immediately.
    // Only include users that have shared coordinates or a server-provided distance.
    const hasCoords = !!(u.coordinates && typeof u.coordinates.lat === 'number' && typeof u.coordinates.lng === 'number')
    const hasDistance = typeof u.distanceKm === 'number' && u.distanceKm !== null
    return hasId && (hasCoords || hasDistance)
  }), [users])

  return (
    <section aria-labelledby="whois-heading" className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="p-4 rounded-xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm border border-gray-100/60 dark:border-zinc-800/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 id="whois-heading" className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{t('whoisNearby')}</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{t('whoisDescription')}</p>
        </div>
        <div className="mt-2 sm:mt-0">
          <div role="status" className="flex items-start gap-3 text-sm bg-yellow-50 dark:bg-yellow-900 border-l-4 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 px-3 py-2 rounded">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.72-1.36 3.485 0l5.516 9.8c.75 1.333-.213 2.98-1.742 2.98H4.483c-1.529 0-2.492-1.647-1.742-2.98l5.516-9.8zM11 13a1 1 0 10-2 0 1 1 0 002 0zm-1-8a1 1 0 00-.993.883L8.9 7.5a1 1 0 001.993 0l-.107-1.617A1 1 0 0010 5z" clipRule="evenodd"/></svg>
            <div className="text-sm">{t('whoisSafetyWarning')}</div>
          </div>
        </div>
      </div>

      {/* Share prompt: encourage users to invite others */}
      <div className="mt-4">
        <div className="p-4 rounded-md bg-blue-50 dark:bg-blue-900 border border-blue-100 dark:border-blue-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="font-semibold text-gray-900 dark:text-gray-100">{t('whoisShareTitle')}</div>
            <div className="text-sm text-gray-700 dark:text-gray-200 mt-1">{t('whoisShareBody')}</div>
          </div>
          <div className="flex gap-2 flex-nowrap">
            <button
              onClick={async () => {
                const shareUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '/'
                try {
                  await navigator.clipboard.writeText(shareUrl)
                  try { window.dispatchEvent(new CustomEvent('wakapadi:toast', { detail: { text: t('whoisShareCopiedToast') || 'Link copied to clipboard' } })) } catch (e) {}
                } catch (e) {
                  try { window.prompt(t('whoisShareCopyPrompt') || 'Copy this link', shareUrl) } catch (err) {}
                }
              }}
              className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 whitespace-nowrap"
            >
              {t('whoisShareCopy')}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <VisibilityToggle />

        <div className="mt-2 hidden sm:flex items-center justify-end">
          <div className="inline-flex items-center rounded-md bg-white/50 dark:bg-zinc-900/50 px-1 border border-gray-200 dark:border-zinc-800">
            <button onClick={() => { setViewMode('grid'); try { safeStorage.setItem('whois_view', 'grid') } catch (e) {} }} aria-pressed={viewMode === 'grid'} className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100 dark:bg-zinc-800 rounded-md' : 'hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-md'}`} title="Grid view">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-700 dark:text-gray-200" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>
            </button>
            <button onClick={() => { setViewMode('list'); try { safeStorage.setItem('whois_view', 'list') } catch (e) {} }} aria-pressed={viewMode === 'list'} className={`p-2 ${viewMode === 'list' ? 'bg-gray-100 dark:bg-zinc-800 rounded-md' : 'hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-md'}`} title="List view">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-700 dark:text-gray-200" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="3" rx="1"/><rect x="3" y="10.5" width="18" height="3" rx="1"/><rect x="3" y="17" width="18" height="3" rx="1"/></svg>
            </button>
          </div>
        </div>

       <>{safeStorage.getItem('userId') &&<div className="mt-3">
          <button
            onClick={() => setShowLocationPrompt(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600"
          >{t('whoisFindNearby')}</button>
          <button
            onClick={() => { setCity(''); setPage(1); setLoading(true); fetchNearby('', 1).catch(() => {}); }}
            className="ml-3 px-3 py-2 border border-gray-200 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm hover:bg-gray-50 dark:hover:bg-gray-600"
          >Show everyone</button>
          <button
            onClick={() => setShowHiddenPanel(true)}
            className="ml-3 px-3 py-2 border border-gray-200 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm hover:bg-gray-50 dark:hover:bg-gray-600"
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
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                >
                  {t('whoisAllow')}
                </button>
                <button onClick={() => setShowLocationPrompt(false)} className="px-4 py-2 border border-gray-300 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md">{t('cancel')}</button>
              </div>

              <div className="mt-4">
                <label className="block text-xs text-gray-500">{t('whoisEnterCityManualLabel')}</label>
                <div className="flex gap-2 mt-2">
                  {fetchingCities ? (
                    <div className="flex-1 px-3 py-2 border rounded-md text-sm text-gray-600">{t('loadingNearby') || 'Loading...'}</div>
                  ) : availableCities && availableCities.length > 0 ? (
                    <select value={manualCity} onChange={(e) => setManualCity(e.target.value)} className="flex-1 px-3 py-2 border rounded-md">
                      <option value="">{t('whoisSelectCityPlaceholder') || 'Select a city'}</option>
                      {availableCities.map((c) => (
                        <option key={c.city} value={c.display}>{`${c.display}`}</option>
                      ))}
                    </select>
                  ) : (
                    <input value={manualCity} onChange={(e) => setManualCity(e.target.value)} placeholder={t('exampleCity')} className="flex-1 px-3 py-2 border rounded-md" />
                  )}
                  <button onClick={async () => {
                    if (!manualCity.trim()) return
                      const normalized = manualCity.trim()
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

        {viewMode === 'grid' && (
          <div className="grid gap-6 mt-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {loading && visibleUsers.length === 0 ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl p-4 bg-gray-100/80 dark:bg-zinc-800 animate-pulse h-36" />
              ))
            ) : visibleUsers.length > 0 ? (
              visibleUsers.map((u) => <NearbyUserCard key={u.userId || u._id || u.id} user={u} />)
            ) : null}

            {visibleUsers.length === 0 && !loading && (
              city ? (
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
        )}

        {viewMode === 'list' && (
          <div className="mt-6 flex flex-col gap-4">
            {loading && visibleUsers.length === 0 ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-2xl p-4 bg-gray-100/80 dark:bg-zinc-800 animate-pulse h-24" />
              ))
            ) : visibleUsers.length > 0 ? (
              visibleUsers.map((u) => (
                <div key={u.userId || u._id || u.id} className="w-full">
                  <NearbyUserCard user={u} />
                </div>
              ))
            ) : null}

            {visibleUsers.length === 0 && !loading && (
              city ? (
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
        )}
        
        {hasMore && !loading && (
          <div className="mt-4 text-center">
            <button onClick={loadMore} className="px-4 py-2 border rounded">{loadingMore ? 'Loading...' : 'Load more'}</button>
          </div>
        )}
      </div>
    </section>
  )
}

