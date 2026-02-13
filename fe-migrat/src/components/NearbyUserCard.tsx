type User = {
  id?: string
  _id?: string
  username?: string
  name?: string
  anonymous?: boolean
  distance?: string
  distanceKm?: number | null
  active?: boolean
  avatarUrl?: string
  avatar?: string
  bio?: string
  travelPrefs?: string[]
  languages?: string[]
  socials?: Record<string, string>
  gender?: string
  profileVisible?: boolean
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ensureAnonymousSession } from '../lib/anonymousAuth'
import { useTranslation } from '../lib/i18n'
import { safeStorage } from '../lib/storage'

export default function NearbyUserCard({ user }: { user: User }) {
  const { t } = useTranslation()
  const [highlight, setHighlight] = useState(false)
  const [hidden, setHidden] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (user.active) {
      setHighlight(true)
      const t = setTimeout(() => setHighlight(false), 2200)
      return () => clearTimeout(t)
    }
  }, [user.active])

  const avatar = user.avatarUrl || user.avatar
  const displayName = user.anonymous ? (t('anonymousTraveler') || 'Anonymous Traveler') : (user.username || user.name || t('traveler') || 'Traveler')
  const formatDistance = (u: User) => {
    if (u.distance) return u.distance
    if (typeof u.distanceKm === 'number' && u.distanceKm !== null) {
      if (u.distanceKm < 1) {
        const m = Math.round(u.distanceKm * 1000)
        // round to nearest 25m for perceived anonymity
        const approx = Math.round(m / 25) * 25
        return `≈ ${approx} m`
      }
      const km = (u.distanceKm).toFixed(1)
      return `≈ ${km} km`
    }
    return '—'
  }

  return (
    <article className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-white border rounded-lg shadow-sm transition-transform duration-200 ${highlight ? 'scale-101 ring-2 ring-green-300/60' : ''}`}>
      <div className="relative flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
          {avatar ? (
            <img src={avatar} alt={`${displayName} avatar`} className="w-full h-full object-cover" />
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-gray-300"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          )}
        </div>
        {user.active && (
          <span className="absolute -bottom-0.5 -right-0.5 inline-flex">
            <span className="flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-600 border border-white"></span>
            </span>
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium text-gray-900 truncate">{displayName}</div>
            {user.anonymous && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">anonymous</span>}
          </div>
          <div className="text-xs text-gray-500">{formatDistance(user)}</div>
        </div>
        {user.profileVisible === true && user.bio && <div className="mt-1 text-xs text-gray-600 truncate">{user.bio}</div>}
      </div>

      {!hidden && (
        <div className="flex flex-col items-end gap-2">
          <button onClick={async () => {
              try { await ensureAnonymousSession() } catch (e) {}
              const id = user._id || user.id
              if (id) navigate(`/chat/${encodeURIComponent(id)}`)
            }}
            aria-label={t('chat') || 'Chat'}
            className="text-sm px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            {t('chat') || 'Chat'}
          </button>

          <button onClick={() => {
              const id = user._id || user.id
              if (!id) return
              try {
                const raw = safeStorage.getItem('whois_hidden_v1')
                const arr = raw ? JSON.parse(raw) as string[] : []
                const next = Array.from(new Set([id, ...arr]))
                safeStorage.setItem('whois_hidden_v1', JSON.stringify(next))
              } catch (e) { console.warn('hide save failed', e) }
              // remove locally and notify listeners
              setHidden(true)
              try { window.dispatchEvent(new CustomEvent('wakapadi:whois:hidden', { detail: id })) } catch (e) {}
              try { window.dispatchEvent(new CustomEvent('wakapadi:toast', { detail: { text: t('userHiddenToast') || 'User hidden' } })) } catch (e) {}
            }}
            aria-label={t('hide') || 'Hide'}
            className="text-xs px-2 py-1 border rounded text-gray-700"
          >{t('hide') || 'Hide'}</button>
        </div>
      )}
    </article>
  )
}
