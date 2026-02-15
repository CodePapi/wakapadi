import { useEffect, useRef, useState } from 'react'
import { anonymousLabel } from '../lib/anonymousNames'
import BlockButton from './BlockButton'

export default function ProfileModal({ open, onClose, profile, t: propT }: any) {
  const t = propT || ((k: string) => k)
  const dialogRef = useRef<HTMLDivElement | null>(null)

  const [blockState, setBlockState] = useState<{ blockedByMe: boolean; blockedByThem: boolean; anyReported: boolean } | null>(null)

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
    if (uid) window.location.href = `/chat/${uid}`
  }


  const userid = profile?._id || profile?.userId
  

  // useEffect(() => {
  //   if (!open) return
  //   setBlockState(null)
  // }, [open, userid])

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

        <div className="mt-6 flex flex-col md:flex-row gap-2 items-center">
          <button
            onClick={() => {
              // check block state before navigating
              if (blockState && (blockState.anyReported || blockState.blockedByThem)) {
                try { window.dispatchEvent(new CustomEvent('wakapadi:toast', { detail: { text: t('messagingDisabledBlocked') || 'Messaging disabled' } })) } catch (e) {}
                return
              }
              handleMessage(userid)
            }}
            disabled={!!(blockState && (blockState.anyReported || blockState.blockedByThem))}
            className="flex-1 px-4 py-2 bg-blue-600 text-gray-700 dark:text-gray-100 rounded hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
          >{t('message') || 'Message'}</button>

          <div className="flex-1">
            {userid ? <BlockButton userId={String(userid)} onChange={(s) => setBlockState(s)} /> : null}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <a href={`/whois/profile/${userid}`} className="flex-1 px-4 py-2 border rounded text-center">View full profile</a>
          <button onClick={onClose} className="px-4 py-2 bg-transparent text-gray-700 rounded">Close</button>
        </div>
      </div>
    </div>
  )
}
