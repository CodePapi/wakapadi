import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { safeStorage } from '../lib/storage'
import ProfileModal from '../components/ProfileModal'

export default function ChatInbox() {
  const [convos, setConvos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [me, setMe] = useState<string | null>(null)
  

  const fetchInbox = async () => {
    setLoading(true)
    setError(null)
    try {
      const res: any = await api.get('/whois/chat/inbox')
      setConvos(res.data || [])
    } catch (err) {
      console.error('Failed to fetch inbox', err)
      setError('Failed to load inbox')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setMe(safeStorage.getItem('userId') || null)
    fetchInbox()
  }, [])

  const resolveOtherId = (c: any) => {
    return (c?.otherUser?._id || c?.otherUser?.id || c?.otherUser?.userId || c?.otherId || c?._id || c?.id || '')
  }

  

  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [profileData, setProfileData] = useState<any>(null)

  const openProfile = async (id: string) => {
    if (!id) return
    setProfileModalOpen(true)
    setProfileData(null)
    try {
      const res: any = await api.get(`/users/preferences/${encodeURIComponent(id)}`)
      setProfileData(res.data || res)
    } catch (e) {
      console.error('Failed to load profile', e)
      setProfileData(null)
    }
  }

  if (loading) return <div>Loading inbox…</div>
  if (error) return <div className="text-red-600">{error}</div>

  return (
    <>
      <section className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold">Messages</h2>
          <div className="mt-4 grid gap-3">
            {convos.length === 0 && <div className="text-gray-600">No conversations yet — start by messaging someone from #Whois Nearby.</div>}
            {convos.map((c) => {
              const otherId = resolveOtherId(c)
              const username = c.otherUser?.username || c.otherUser?.name || c.otherName || 'Traveler'
              const last = c.lastMessage || c.last || null
              const unread = last && !last.read && last.fromUserId !== me
              const avatar = c.otherUser?.avatarUrl || c.avatarUrl || (otherId ? `https://i.pravatar.cc/48?u=${otherId}` : '')

              return (
                <div key={otherId || c._id || c.id} className="p-3 border rounded hover:bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={avatar} alt={username} className="w-10 h-10 rounded-full object-cover" />
                    <div>
                      <div className="font-medium">{username}</div>
                      <div className="text-sm text-gray-600 truncate max-w-md">{last?.messagePreview || last?.message || ''}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-xs text-gray-500">{last?.createdAt ? new Date(last.createdAt).toLocaleString() : ''}</div>
                    {unread && <div className="w-2 h-2 bg-blue-500 rounded-full" aria-hidden />}
                    <div className="flex gap-2">
                      <div className="flex items-center gap-2">
                        <a aria-label={`Open chat with ${username}`} title="Open chat" href={`/chat/${otherId}`} className="p-2 rounded hover:bg-gray-100 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 3.866-3.582 7-8 7-1.218 0-2.367-.18-3.417-.513L3 20l1.513-5.583A9.959 9.959 0 0 1 3 12c0-5.523 4.477-10 10-10s10 4.477 10 10z"/></svg>
                          <span className="sr-only">Open</span>
                        </a>

                        <button aria-label={`View profile ${username}`} title="Profile" onClick={() => openProfile(otherId)} className="p-2 rounded hover:bg-gray-100 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A8.966 8.966 0 0 1 12 15c2.21 0 4.21.895 5.657 2.343M15 11a3 3 0 1 0-6 0 3 3 0 0 0 6 0z"/></svg>
                          <span className="sr-only">Profile</span>
                        </button>

                        {/* Report/Block removed from inbox actions; available in Profile modal */}

                        {/* desktop labels handled inline next to icons */}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <ProfileModal open={profileModalOpen} onClose={() => { setProfileModalOpen(false); setProfileData(null) }} profile={profileData} />
    </>
  )
}
