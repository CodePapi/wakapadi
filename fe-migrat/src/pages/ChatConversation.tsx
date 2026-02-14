import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { safeStorage } from '../lib/storage'
import { io } from 'socket.io-client'
import ChatBubble from '../components/ChatBubble'
import ProfileModal from '../components/ProfileModal'

export default function ChatConversation() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [messages, setMessages] = useState<any[]>([])
  const [otherUserMeta, setOtherUserMeta] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [otherTyping, setOtherTyping] = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [profileData, setProfileData] = useState<any>(null)
  const socketRef = useRef<any>(null)
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const messagesRef = useRef(new Set<string>())
  const currentDedupeMap = useRef(new Set<string>())
  
  const pendingReactionsRef = useRef(new Map<string, { timer: number; emoji: string; fromUserId: string }>() )
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
      // handle incoming message and match optimistic tempId / dedupe
      const keyId = msg._id || msg.tempId
      if (!keyId) return
      if (messagesRef.current.has(keyId) || currentDedupeMap.current.has(keyId)) return

      setMessages((prev) => {
        // If there's an optimistic local message (temp id) that matches this server message
        try {
          const optIdx = prev.findIndex((m) => typeof m._id === 'string' && m._id.startsWith('tmp-') && m.message === msg.message && m.fromSelf)
          if (optIdx > -1) {
            const next = [...prev]
            next[optIdx] = { ...msg, fromSelf: msg.fromUserId === safeStorage.getItem('userId'), status: 'sent' }
            try { messagesRef.current.delete(prev[optIdx]._id) } catch (e) {}
            if (msg._id) try { messagesRef.current.add(msg._id) } catch (e) {}
            return next
          }
        } catch (e) {}

        // If server returns tempId matching an optimistic message, replace it in-place
        if (msg.tempId) {
          const idx = prev.findIndex((m) => m._id === msg.tempId)
          if (idx > -1) {
            const next = [...prev]
            next[idx] = { ...msg, fromSelf: msg.fromUserId === safeStorage.getItem('userId'), status: 'sent' }
            // update dedupe sets: remove tempId, add server id
            try { messagesRef.current.delete(msg.tempId) } catch (e) {}
            if (msg._id) try { messagesRef.current.add(msg._id) } catch (e) {}
            return next
          }
        }

        // Prevent duplicates by fingerprint (same from, createdAt, and text)
        const exists = prev.some((m) => {
          if (msg._id && m._id && m._id === msg._id) return true
          if (msg.tempId && (m._id === msg.tempId || m.tempId === msg.tempId)) return true
          if (m.message && msg.message && m.message === msg.message && m.fromUserId === msg.fromUserId && m.createdAt === msg.createdAt) return true
          return false
        })
        if (exists) {
          // still register id to dedupe future events
          if (msg._id) try { messagesRef.current.add(msg._id) } catch (e) {}
          return prev
        }

        if (msg._id) try { messagesRef.current.add(msg._id) } catch (e) {}
        currentDedupeMap.current.add(keyId)
        return [...prev, { ...msg, fromSelf: msg.fromUserId === safeStorage.getItem('userId'), status: msg.fromUserId === safeStorage.getItem('userId') ? 'sent' : 'received' }]
      })

      // If the message is from the other user and not marked read, acknowledge it
      try {
        const me = safeStorage.getItem('userId')
        if (msg.fromUserId && msg.fromUserId !== me && !msg.read && socketRef.current) {
          socketRef.current.emit('message:read', { fromUserId: msg.fromUserId, toUserId: me, messageIds: [msg._id || msg.tempId] })
          // optimistic local update
          setMessages((prev) => prev.map((m) => (m._id === msg._id ? { ...m, status: 'read', read: true } : m)))
        }
      } catch (e) {}
    }

    const onReaction = (payload: any) => {
      if (!payload) return
      const { messageId, reaction } = payload
      if (!messageId) return
      // Apply reaction update and clear any pending optimistic state for this message/fromUser
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId
            ? {
                ...m,
                reactions: m.reactions ? [...m.reactions.filter((r: any) => r.fromUserId !== reaction.fromUserId), reaction] : [reaction],
              }
            : m
        )
      )

      try {
        const key = `${messageId}:${reaction.fromUserId}`
        const pending = pendingReactionsRef.current.get(key)
        if (pending) {
          clearTimeout(pending.timer)
          pendingReactionsRef.current.delete(key)
        }
      } catch (e) {}
    }

    const onReactionError = (payload: any) => {
      if (!payload) return
      const { messageId, emoji, fromUserId } = payload
      if (!messageId) return
      // revert optimistic reaction for this user
      setMessages((prev) => prev.map((m) => {
        if (m._id !== messageId) return m
        const existing = Array.isArray(m.reactions) ? m.reactions.filter((r: any) => r.fromUserId !== fromUserId || r.emoji !== emoji) : []
        return { ...m, reactions: existing }
      }))
      try {
        const key = `${messageId}:${fromUserId}`
        const pending = pendingReactionsRef.current.get(key)
        if (pending) {
          clearTimeout(pending.timer)
          pendingReactionsRef.current.delete(key)
        }
      } catch (e) {}
      try {
        window.dispatchEvent(new CustomEvent('wakapadi:toast', { detail: { text: 'Failed to send reaction' } }))
      } catch (e) {}
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
    socket.on('message:reaction', onReaction)
    socket.on('connect_error', (e: any) => console.warn('socket error', e))
    socket.on('message:reaction:error', onReactionError)

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

  const handleShowProfile = async (uid: string) => {
    try {
      setProfileModalOpen(true)
      // backend exposes user preferences at /users/preferences/:id
      const res: any = await api.get(`/users/preferences/${encodeURIComponent(uid)}`)
      setProfileData(res.data || null)
    } catch (e) {
      setProfileData(null)
    }
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
    <>
    <section className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Chat</h2>
          <button onClick={() => navigate(-1)} className="text-sm text-blue-600">Back</button>
        </div>

      <div className="mt-4 flex flex-col gap-2">
        <div ref={messagesContainerRef} className="flex flex-col overflow-auto max-h-[60vh] p-2">
          {messages.map((m) => (
            <ChatBubble
              key={m._id || m.tempId}
              message={m.message}
              fromSelf={!!m.fromSelf}
              username={m.fromUserName || otherUserMeta?.username || otherUserMeta?.name}
              createdAt={m.createdAt}
              status={m.status}
              reactions={m.reactions}
              pendingReactionEmoji={pendingReactionsRef.current.get(`${m._id || m.tempId}:${safeStorage.getItem('userId')}`)?.emoji}
              onReact={(emoji: string) => {
                try {
                  const me = safeStorage.getItem('userId')
                  if (!me) return
                  const messageId = m._id || m.tempId

                  // optimistic UI: toggle/remove existing reaction from this user
                  setMessages((prev) =>
                    prev.map((msg) => {
                      if ((msg._id || msg.tempId) !== messageId) return msg
                      const existing = Array.isArray(msg.reactions) ? [...msg.reactions] : []
                      const myIdx = existing.findIndex((r: any) => r.fromUserId === me)
                      const hadSame = myIdx > -1 && existing[myIdx].emoji === emoji
                      if (myIdx > -1) existing.splice(myIdx, 1)
                      if (!hadSame) existing.push({ emoji, fromUserId: me })
                      return { ...msg, reactions: existing }
                    })
                  )

                      if (socketRef.current && messageId) {
                    socketRef.current.emit('message:reaction', { messageId, reaction: { emoji, fromUserId: me }, toUserId: userId })
                    try {
                      const key = `${messageId}:${me}`
                      const timer = window.setTimeout(() => {
                        // timeout: consider reaction failed -> revert optimistic change and notify
                        setMessages((prev) => prev.map((msg) => {
                          if ((msg._id || msg.tempId) !== messageId) return msg
                          const existing = Array.isArray(msg.reactions) ? msg.reactions.filter((r: any) => r.fromUserId !== me || r.emoji !== emoji) : []
                          return { ...msg, reactions: existing }
                        }))
                        try { window.dispatchEvent(new CustomEvent('wakapadi:toast', { detail: { text: 'Failed to send reaction' } })) } catch (e) {}
                        pendingReactionsRef.current.delete(key)
                      }, 8000)
                      pendingReactionsRef.current.set(key, { timer, emoji, fromUserId: me })
                    } catch (e) {}
                  }
                } catch (e) {}
              }}
              onCopy={() => { try { alert('Copied') } catch {} }}
              onDelete={() => {
                try {
                  // optimistic remove
                  setMessages((prev) => prev.filter((x) => x._id !== m._id && x._id !== m.tempId))
                  if (socketRef.current && m._id) socketRef.current.emit('message:delete', { messageId: m._id })
                } catch (e) {}
              }}
              onShowProfile={() => handleShowProfile(m.fromUserId || m.from || m.fromId || m.from_id)}
            />
          ))}
        </div>

        <div className="text-sm text-gray-500">{otherTyping ? 'Typing…' : ''}</div>

        <div className="mt-4 flex gap-2">
          <input ref={inputRef} value={text} onChange={(e) => handleChange(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} placeholder="Write a message" className="flex-1 px-3 py-2 border rounded" />
          <button onClick={send} className="px-4 py-2 bg-blue-600 text-white rounded">Send</button>
        </div>
      </div>
      </div>
    </section>
    <ProfileModal open={profileModalOpen} onClose={() => { setProfileModalOpen(false); setProfileData(null) }} profile={profileData} />
    </>
  )
}
