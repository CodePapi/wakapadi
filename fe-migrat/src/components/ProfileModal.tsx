import { useEffect, useRef } from 'react'
import { anonymousLabel } from '../lib/anonymousNames'
import { useTranslation } from '../lib/i18n'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

export default function ProfileModal({ open, onClose, profile }: any) {
  const navigate = useNavigate()
  const dialogRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose?.()
  }

  const handleMessage = (id?: string) => {
    const uid = id || profile?._id || profile?.userId
    onClose?.()
    if (uid) navigate(`/chat/${uid}`)
  }

  const handleReport = async (id?: string) => {
    const uid = id || profile?._id || profile?.userId
    if (!uid) return
    const reason = prompt('Why are you reporting this user? (optional)') || 'Reported via profile'
    try { await api.post(`/users/report/${encodeURIComponent(uid)}`, { reason }); alert('Report submitted') } catch (e) { console.error(e); alert('Report failed') }
  }

  const handleBlock = async (id?: string) => {
    const uid = id || profile?._id || profile?.userId
    if (!uid) return
    if (!confirm('Block this user? You will no longer receive messages.')) return
    try { await api.post(`/users/block/${encodeURIComponent(uid)}`); alert('User blocked'); onClose?.() } catch (e) { console.error(e); alert('Block failed') }
  }

  // Loading skeleton
  if (open && !profile) {
    return (
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40" onClick={handleBackdrop}>
        <div ref={dialogRef} className="bg-white dark:bg-zinc-900 rounded-t-xl md:rounded-lg shadow-xl w-full md:max-w-md p-6">
          <div className="animate-pulse">
            <div className="h-12 w-12 bg-gray-200 rounded-full mb-4" />
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-5/6 mb-4" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-10 bg-gray-200 rounded" />
              <div className="h-10 bg-gray-200 rounded" />
            </div>
            <div className="mt-4 h-10 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    )
  }

  const userid = profile?._id || profile?.userId
  const { t } = useTranslation()

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40" onClick={handleBackdrop} role="dialog" aria-modal="true">
      <div ref={dialogRef} className="bg-white dark:bg-zinc-900 rounded-t-xl md:rounded-lg shadow-xl w-full md:max-w-md p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <img src={profile?.avatar || `https://i.pravatar.cc/80?u=${userid||profile?.username||'anon'}`} alt={`${profile?.profileVisible === false ? anonymousLabel(undefined, userid) : (profile?.username || 'Traveler')} avatar`} className="w-16 h-16 rounded-full object-cover" />
            <div>
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{profile?.profileVisible === false ? anonymousLabel(t('anonymousTraveler') || 'Anonymous', userid) : (profile?.username || profile?.name || 'Traveler')}</div>
              {profile?.bio && <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">{profile.bio}</div>}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close profile" className="text-gray-500">✕</button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-800 dark:text-gray-200">
          {profile?.languages && (
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Languages</div>
              <div className="mt-1">{Array.isArray(profile.languages) ? profile.languages.join(', ') : profile.languages}</div>
            </div>
          )}
          {profile?.travelPrefs && (
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Interests</div>
              <div className="mt-1">{Array.isArray(profile.travelPrefs) ? profile.travelPrefs.join(', ') : profile.travelPrefs}</div>
            </div>
          )}
          {profile?.location && (
            <div className="md:col-span-2 text-sm text-gray-600">{profile.location}</div>
          )}
        </div>

        <div className="mt-6 flex flex-col md:flex-row gap-2">
          <button onClick={() => handleMessage(userid)} className="flex-1 px-4 py-2 bg-blue-600 text-gray-700 dark:text-gray-100 rounded hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">Message</button>
          <button onClick={() => handleReport(userid)} className="flex-1 px-4 py-2 border rounded">Report</button>
          <button onClick={() => handleBlock(userid)} className="flex-1 px-4 py-2 text-red-600 border rounded">Block</button>
        </div>

        <div className="mt-4 flex gap-2">
          <a href={`/whois/profile/${userid}`} className="flex-1 px-4 py-2 border rounded text-center">View full profile</a>
          <button onClick={onClose} className="px-4 py-2 bg-transparent text-gray-700 rounded">Close</button>
        </div>
      </div>
    </div>
  )
}
