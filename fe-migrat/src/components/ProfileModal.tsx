export default function ProfileModal({ open, onClose, profile }: any) {
  if (!open) return null

  // Show loading state while profile is being fetched
  if (open && !profile) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 text-center">
          <div className="text-lg font-semibold">Loading…</div>
          <div className="mt-4 text-sm text-gray-600">Fetching profile...</div>
          <div className="mt-6">
            <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded">Close</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <img src={profile.avatar || `https://i.pravatar.cc/80?u=${profile._id||profile.userId||profile.username}`} alt="avatar" className="w-16 h-16 rounded-full object-cover" />
            <div>
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{profile.username || profile.name || 'Traveler'}</div>
              {profile.bio && <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">{profile.bio}</div>}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500">✕</button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-gray-800 dark:text-gray-200">
          {profile.languages && (
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Languages</div>
              <div className="mt-1">{Array.isArray(profile.languages) ? profile.languages.join(', ') : profile.languages}</div>
            </div>
          )}
          {profile.travelPrefs && (
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Interests</div>
              <div className="mt-1">{Array.isArray(profile.travelPrefs) ? profile.travelPrefs.join(', ') : profile.travelPrefs}</div>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-2">
          <a href={`/whois/profile/${profile._id || profile.userId}`} className="flex-1 px-4 py-2 border rounded text-center">View full profile</a>
          <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded">Close</button>
        </div>
      </div>
    </div>
  )
}
