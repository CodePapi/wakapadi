import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { safeStorage } from '../lib/storage'
import { io } from 'socket.io-client'

export default function ChatConversation() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [messages, setMessages] = useState<any[]>([])
  const [otherUserMeta, setOtherUserMeta] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [otherTyping, setOtherTyping] = useState(false)
  const socketRef = useRef<any>(null)
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const messagesRef = useRef(new Set<string>())
  const stoppedTypingTimer = useRef<number | null>(null)

  useEffect(() => {
    if (!userId) return
    const load = async () => {
      setLoading(true)
      try {
        const res: any = await api.get(`/whois/chat/${encodeURIComponent(userId)}?limit=50`, { cache: 'no-store' })
        const msgs = (res.data?.messages || []).map((m: any) => ({ ...m, fromSelf: m.fromUserId === safeStorage.getItem('userId') }))
        setOtherUserMeta(res.data?.otherUser || null)
        msgs.forEach((m: any) => messagesRef.current.add(m._id))
        setMessages(msgs)
      } catch (err) {
        console.error('Failed to load messages', err)
      } finally {
        setLoading(false)
      }
    }
    load()

    const SOCKET = import.meta.env.VITE_SOCKET_URL || ''
    const socket = io(SOCKET || undefined, { path: '/socket.io', transports: ['websocket'], auth: { token: safeStorage.getItem('token') } })
    socketRef.current = socket

    const onNew = (msg: any) => {
      if (!msg) return
      // handle incoming message and match optimistic tempId
      const keyId = msg._id || msg.tempId
      if (messagesRef.current.has(keyId)) return
      messagesRef.current.add(keyId)

      setMessages((prev) => {
        // If server returns tempId matching an optimistic message, replace it
        if (msg.tempId) {
          const idx = prev.findIndex((m) => m._id === msg.tempId)
          if (idx > -1) {
            const next = [...prev]
            next[idx] = { ...msg, fromSelf: msg.fromUserId === safeStorage.getItem('userId'), status: 'sent' }
            return next
          }
        }
        return [...prev, { ...msg, fromSelf: msg.fromUserId === safeStorage.getItem('userId'), status: msg.fromUserId === safeStorage.getItem('userId') ? 'sent' : 'received' }]
      })
    }

    const onError = (payload: any) => {
      // handle send errors for optimistic messages
      if (!payload) return
      const tempId = payload?.tempId
      if (!tempId) return
      setMessages((prev) => prev.map((m) => (m._id === tempId ? { ...m, status: 'error', error: payload?.error || 'Failed' } : m)))
    }

    const onTyping = (payload: any) => {
      if (!payload || !payload.fromUserId) return
      if (payload.fromUserId === userId) setOtherTyping(true)
    }

    const onStoppedTyping = (payload: any) => {
      if (!payload || !payload.fromUserId) return
      if (payload.fromUserId === userId) setOtherTyping(false)
    }

    socket.on('message:new', onNew)
    socket.on('typing', onTyping)
    socket.on('stoppedTyping', onStoppedTyping)
    socket.on('message:read:confirm', (data: any) => {
      try {
        const ids = Array.isArray(data?.messageIds) ? data.messageIds : []
        setMessages((prev) => prev.map((m) => (ids.includes(m._id) ? { ...m, status: 'read' } : m)))
      } catch (e) {}
    })
    socket.on('message:error', onError)
    socket.on('connect_error', (e: any) => console.warn('socket error', e))

    // join conversation room for targeted events
    try {
      const me = safeStorage.getItem('userId')
      if (me && userId) socket.emit('joinConversation', { userId1: me, userId2: userId })
    } catch (e) {}

    return () => { try { socket.disconnect() } catch (e) {} }
  }, [userId])

  // scroll to bottom when messages change
  useEffect(() => {
    try {
      if (!messagesContainerRef.current) return
      // allow DOM to update then scroll
      requestAnimationFrame(() => {
        const el = messagesContainerRef.current!
        el.scrollTop = el.scrollHeight
      })
    } catch (e) {}
  }, [messages])

  // mark unread messages as read when conversation loads or when new messages arrive
  useEffect(() => {
    const markRead = () => {
      try {
        const me = safeStorage.getItem('userId')
        if (!me || !userId || !socketRef.current) return
        const unread = messages.filter((m) => m.fromUserId === userId && !m.read && m._id)
        const ids = unread.map((m) => m._id)
        if (ids.length === 0) return
        socketRef.current.emit('message:read', { fromUserId: userId, toUserId: me, messageIds: ids })
        // optimistic local update
        setMessages((prev) => prev.map((m) => (ids.includes(m._id) ? { ...m, status: 'read', read: true } : m)))
      } catch (e) {}
    }
    markRead()
  }, [messages, userId])

  const send = async () => {
    if (!text.trim() || !socketRef.current) return
    const tempId = `tmp-${Date.now()}`
    const optimistic = { _id: tempId, message: text, fromSelf: true, createdAt: new Date().toISOString(), status: 'sending' }
    setMessages((prev) => [...prev, optimistic])
    messagesRef.current.add(tempId)
    socketRef.current.emit('message', { to: userId, message: text, tempId })
    setText('')
  }

  // typing events: emit 'typing' while user is typing, and 'stoppedTyping' after pause
  const handleChange = (val: string) => {
    setText(val)
    if (!socketRef.current) return
    try {
      socketRef.current.emit('typing', { to: userId })
    } catch (e) {}
    if (stoppedTypingTimer.current) window.clearTimeout(stoppedTypingTimer.current)
    stoppedTypingTimer.current = window.setTimeout(() => {
      try { socketRef.current.emit('stoppedTyping', { to: userId }) } catch (e) {}
    }, 1400)
  }

  if (!userId) return <div>Invalid conversation</div>
  if (loading) return <div>Loading messages…</div>

  return (
    <section className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Chat</h2>
          <button onClick={() => navigate(-1)} className="text-sm text-blue-600">Back</button>
        </div>

      <div className="mt-4 flex flex-col gap-2">
        <div ref={messagesContainerRef} className="flex flex-col overflow-auto max-h-[60vh] p-2">
          {messages.map((m) => (
            <div key={m._id || m.tempId} className={`p-2 rounded max-w-md ${m.fromSelf ? 'bg-blue-50 self-end ml-auto' : 'bg-gray-100 mr-auto'}`}>
              {!m.fromSelf && (
                <div className="text-xs font-medium text-gray-700">{m.fromUserName || otherUserMeta?.username || otherUserMeta?.name || 'Traveler'}</div>
              )}
              <div className="text-sm">{m.message}</div>
              <div className="flex items-center justify-between mt-1">
                <div className="text-xs text-gray-500">{new Date(m.createdAt).toLocaleTimeString()}</div>
                <div className="text-xs text-gray-500">{m.status === 'sending' ? 'Sending…' : m.status === 'sent' ? 'Sent' : m.status === 'received' ? '' : m.status === 'read' ? 'Read' : ''}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-sm text-gray-500">{otherTyping ? 'Typing…' : ''}</div>

        <div className="mt-4 flex gap-2">
          <input ref={inputRef} value={text} onChange={(e) => handleChange(e.target.value)} placeholder="Write a message" className="flex-1 px-3 py-2 border rounded" />
          <button onClick={send} className="px-4 py-2 bg-blue-600 text-white rounded">Send</button>
        </div>
      </div>
      </div>
    </section>
  )
}
