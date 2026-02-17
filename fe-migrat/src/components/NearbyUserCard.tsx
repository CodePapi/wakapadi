import { useEffect, useState } from 'react'

type User = {
  id?: string
  _id?: string
  userId?: string
  username?: string
  name?: string
  anonymous?: boolean
  distance?: string
  distanceKm?: number | null
  active?: boolean
  avatarUrl?: string
  avatar?: string
  bio?: string
  profileVisible?: boolean
  city?: string
  coordinates?: { lat: number; lng: number }
}
import { useNavigate } from 'react-router-dom'
import { ensureAnonymousSession } from '../lib/anonymousAuth'
import { getAnonymousHandleForId } from '../lib/anonymousNames'
import { useTranslation } from '../lib/i18n'
import { safeStorage } from '../lib/storage'

export default function NearbyUserCard({ user }: { user: User }) {
  const { t } = useTranslation()
  const [highlight, setHighlight] = useState(false)
  const [, setHidden] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (user?.active) {
      setHighlight(true)
      const timer = setTimeout(() => setHighlight(false), 2200)
      return () => clearTimeout(timer)
    }
  }, [user?.active])

  const avatar = user?.avatarUrl || user?.avatar
  const anonPrefix = t('anonymousTraveler') || 'Anonymous'
  const displayName = (user?.profileVisible === false || user?.anonymous)
    ? `${anonPrefix} ${getAnonymousHandleForId(String(user?.userId || user?._id || user?.id || user?.name))}`
    : (user?.username || user?.name || t('traveler') || 'Traveler')

  const formatCity = (c?: string) => {
    if (!c) return ''
    return c.split(' ').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')
  }

  const formatDistance = (u?: User) => {
    if (!u) return '—'
    if (u.distance) return u.distance
    if (typeof u.distanceKm === 'number' && u.distanceKm !== null) {
      if (u.distanceKm < 1) {
        const m = Math.round(u.distanceKm * 1000)
        const approx = Math.round(m / 25) * 25
        return `≈ ${approx} m`
      }
      return `≈ ${(u.distanceKm).toFixed(1)} km`
    }
    return '—'
  }

  const computeFallbackDistance = (u?: User) => {
    try {
      const raw = safeStorage.getItem('last_device_coords')
      if (!raw) return null
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed.lat === 'undefined' || typeof parsed.lng === 'undefined') return null
      if (!u) return null
      const originLat = Number(parsed.lat)
      const originLng = Number(parsed.lng)
      const dest = (u as any).coordinates || null
      if (!dest || typeof dest.lat === 'undefined' || typeof dest.lng === 'undefined') return null
      const destLat = Number(dest.lat)
      const destLng = Number(dest.lng)
      if (Number.isNaN(originLat) || Number.isNaN(originLng) || Number.isNaN(destLat) || Number.isNaN(destLng)) return null
      const toRadians = (value: number) => (value * Math.PI) / 180
      const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
        const earthRadiusKm = 6371
        const dLat = toRadians(lat2 - lat1)
        const dLng = toRadians(lng2 - lng1)
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        return earthRadiusKm * c
      }
      const km = haversineKm(originLat, originLng, destLat, destLng)
      if (km < 1) {
        const m = Math.round(km * 1000)
        const approx = Math.round(m / 25) * 25
        return `≈ ${approx} m`
      }
      return `≈ ${km.toFixed(1)} km`
    } catch (e) {
      return null
    }
  }

  let distanceStr = formatDistance(user)
  if (distanceStr === '—') {
    const fallback = computeFallbackDistance(user)
    if (fallback) distanceStr = fallback
  }

  const onChat = async () => {
    try {
      const session = await ensureAnonymousSession()
      const id = user?.userId || user?._id || user?.id
      if (!session || !session.token) {
        try { safeStorage.setItem('wakapadi_return_to', window.location.pathname + window.location.search + window.location.hash) } catch (e) {}
        navigate('/login')
        return
      }
      if (id) navigate(`/chat/${encodeURIComponent(String(id))}`)
    } catch (e) {
      try { safeStorage.setItem('wakapadi_return_to', window.location.pathname + window.location.search + window.location.hash) } catch (err) {}
      navigate('/login')
    }
  }

  const onHide = () => {
    const id = user?.userId || user?._id || user?.id
    if (!id) return
    try {
      const raw = safeStorage.getItem('whois_hidden_v1')
      const arr = raw ? JSON.parse(raw) as string[] : []
      const next = Array.from(new Set([String(id), ...arr]))
      safeStorage.setItem('whois_hidden_v1', JSON.stringify(next))
    } catch (e) { console.warn('hide save failed', e) }
    setHidden(true)
    try { window.dispatchEvent(new CustomEvent('wakapadi:whois:hidden', { detail: id })) } catch (e) {}
    try { window.dispatchEvent(new CustomEvent('wakapadi:toast', { detail: { text: t('userHiddenToast') || 'User hidden' } })) } catch (e) {}
  }

  return (
    <article className={`rounded-2xl p-4 bg-white/80 dark:bg-zinc-900/80 border border-gray-100 dark:border-zinc-800 shadow-md hover:shadow-2xl transition transform duration-200 ${highlight ? 'ring-2 ring-green-300/40' : ''}`}>
      <div className="md:grid md:grid-cols-[72px_1fr_auto] md:gap-4 flex flex-col items-center md:items-start md:flex-row">
        <div className="flex-shrink-0 w-20 md:w-18">
          <div className="w-20 h-20 md:w-18 md:h-18 rounded-full bg-gradient-to-b from-gray-100 to-gray-50 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center overflow-hidden ring-1 ring-gray-100 dark:ring-zinc-800">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt={`${displayName} ${t('avatar') || 'avatar'}`} className="w-full h-full object-cover rounded-full" />
            ) : (
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-gray-300"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            )}
          </div>
          {/* {user?.active && (
            <span className="inline-flex -mt-3 -ml-3">
              <span className="flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-600 border border-white"></span>
              </span>
            </span>
          )} */}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-col items-center md:flex-row md:items-start md:justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-col items-center md:flex-row md:items-center gap-3 text-center md:text-left">
                <div className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight">{displayName}</div>
                {user?.anonymous && <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-100 px-2 py-0.5 rounded-full">{t('anonymousBadge') || 'Anonymous'}</span>}
              </div>
              {user?.bio && (
                <div
                  className="mt-2 text-sm text-gray-600 dark:text-gray-300 text-center md:text-left max-w-prose"
                  style={{ overflow: 'hidden', display: '-webkit-box' as any, WebkitLineClamp: 2 as any, WebkitBoxOrient: 'vertical' as any }}
                >
                  {user.bio}
                </div>
              )}
            </div>

            {/* Desktop: right column shows only icons + values for compact mature alignment */}
            <div className="hidden md:flex md:flex-col md:items-end md:justify-center text-xs text-gray-500 dark:text-gray-300">
              <div className="inline-flex items-center gap-3 mb-1">
                {user?.city && (
                  <div className="inline-flex items-center gap-2 text-xs text-gray-500 dark:text-gray-300">
                    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-gray-500 dark:text-gray-300"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
                    <span className="truncate">{formatCity(user.city)}</span>
                  </div>
                )}
                {distanceStr !== '—' && (
                  <div className="inline-flex items-center gap-2 text-xs text-gray-500 dark:text-gray-300">
                    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 dark:text-gray-300"><path d="M3 12h6l2 2 6-6 4 4"/></svg>
                    <span className="font-medium">{distanceStr}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile: inline icon row beneath name */}
          <div className="mt-3 md:hidden flex items-center justify-center gap-3 text-xs text-gray-500 dark:text-gray-300">
            {user?.city && (
              <span className="inline-flex items-center gap-2">
                <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-gray-500 dark:text-gray-300"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
                <span>{formatCity(user.city)}</span>
              </span>
            )}
            {distanceStr !== '—' && (
              <span className="inline-flex items-center gap-2">
                <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 dark:text-gray-300"><path d="M3 12h6l2 2 6-6 4 4"/></svg>
                <span>{distanceStr}</span>
              </span>
            )}
          </div>
        </div>

        <div className="mt-3 md:mt-0 flex flex-row md:flex-col items-center md:items-end justify-center md:justify-center gap-3 w-full md:w-auto">
          {(user?.userId || user?._id || user?.id) && (
            <button onClick={onChat}
              aria-label={t('chat') || 'Chat'}
              className="flex items-center justify-center p-3 bg-blue-600 text-white rounded-full shadow-md hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 border border-transparent"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </button>
          )}

          {safeStorage.getItem('userId') && (
            <button onClick={onHide}
              aria-label={t('hide') || 'Hide'}
              className="flex items-center justify-center p-2 border border-gray-200 rounded-full text-gray-700 bg-white hover:bg-gray-50 dark:text-gray-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M18.36 6.64a9 9 0 11-12.73 12.73"/></svg>
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

