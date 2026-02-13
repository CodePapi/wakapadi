import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Link } from 'react-router-dom'

export default function ChatInbox() {
  const [convos, setConvos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => { fetchInbox() }, [])

  if (loading) return <div>Loading inbox…</div>
  if (error) return <div className="text-red-600">{error}</div>

  return (
    <section className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-semibold">Messages</h2>
        <div className="mt-4 grid gap-3">
        {convos.length === 0 && <div className="text-gray-600">No conversations yet — start by messaging someone from #Whois Nearby.</div>}
        {convos.map((c) => (
          <Link key={c._id || c.id} to={`/chat/${c._id || c.id}`} className="p-3 border rounded hover:bg-gray-50 flex items-center justify-between">
            <div>
              <div className="font-medium">{c.otherUser?.username || c.otherUser?.name || 'Traveler'}</div>
              <div className="text-sm text-gray-600 truncate max-w-md">{c.lastMessage?.messagePreview || c.lastMessage?.message || ''}</div>
            </div>
            <div className="text-xs text-gray-500">{c.lastMessage?.createdAt ? new Date(c.lastMessage.createdAt).toLocaleString() : ''}</div>
          </Link>
        ))}
      </div>
      </div>
    </section>
  )
}
