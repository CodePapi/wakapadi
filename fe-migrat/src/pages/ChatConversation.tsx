import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
  const [showInputEmojiPicker, setShowInputEmojiPicker] = useState(false)
  const emojiBtnRef = useRef<HTMLButtonElement | null>(null)
  const [pickerPos, setPickerPos] = useState<{ top: number; left: number } | null>(null)
  const pickerRef = useRef<HTMLDivElement | null>(null)
  const socketRef = useRef<any>(null)
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
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
            // replay any pending reactions that targeted the optimistic tempId
            try {
              const me = safeStorage.getItem('userId')
              const pendingKey = `${msg.tempId}:${me}`
              const pending = pendingReactionsRef.current.get(pendingKey)
              if (pending && msg._id && socketRef.current) {
                // send using backend expected shape: { messageId, emoji, toUserId }
                socketRef.current.emit('message:reaction', { messageId: msg._id, emoji: pending.emoji, toUserId: userId })
                // move pending entry to the new message id key so timeouts/cleanup still work
                pendingReactionsRef.current.delete(pendingKey)
                pendingReactionsRef.current.set(`${msg._id}:${me}`, pending)
              }
            } catch (e) {}
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
    try {
      const el = inputRef.current
      if (el) {
        el.style.height = ''
        el.style.overflowY = 'hidden'
      }
    } catch (e) {}
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
    try {
      const el = inputRef.current
      if (el) {
        el.style.height = 'auto'
        const MAX_H = 140 // px - cap the textarea height
        const newH = Math.min(el.scrollHeight, MAX_H)
        el.style.height = `${newH}px`
        el.style.overflowY = el.scrollHeight > MAX_H ? 'auto' : 'hidden'
      }
    } catch (e) {}
    if (!socketRef.current) return
    try {
      socketRef.current.emit('typing', { to: userId })
    } catch (e) {}
    if (stoppedTypingTimer.current) window.clearTimeout(stoppedTypingTimer.current)
    stoppedTypingTimer.current = window.setTimeout(() => {
      try { socketRef.current.emit('stoppedTyping', { to: userId }) } catch (e) {}
    }, 1400)
  }

  // position emoji picker relative to emoji button and close on outside click
  useEffect(() => {
    if (!showInputEmojiPicker) {
      setPickerPos(null)
      return
    }
    try {
      const btn = emojiBtnRef.current
      if (!btn) return
      const r = btn.getBoundingClientRect()
      const preferredLeft = Math.max(8, r.left + window.scrollX)
      const preferredTop = r.bottom + window.scrollY + 6
      // clamp within viewport
      const maxLeft = Math.max(8, window.innerWidth - 240)
      const left = Math.min(preferredLeft, maxLeft)
      setPickerPos({ top: preferredTop, left })
    } catch (e) {}

    const onDoc = (ev: MouseEvent) => {
      try {
        const target = ev.target as Node
        if (pickerRef.current && pickerRef.current.contains(target)) return
        if (emojiBtnRef.current && emojiBtnRef.current.contains(target)) return
        setShowInputEmojiPicker(false)
      } catch (e) {}
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [showInputEmojiPicker])

  if (!userId) return <div>Invalid conversation</div>
  if (loading) return <div>Loading messages…</div>

  return (
    <>
    <section className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-zinc-700 flex items-center justify-center text-lg font-semibold">{(otherUserMeta?.username||otherUserMeta?.name||'T').charAt(0).toUpperCase()}</div>
            <div>
              <div className="font-semibold text-lg">{otherUserMeta?.username || otherUserMeta?.name || 'Chat'}</div>
              <div className="text-xs text-gray-500">{otherTyping ? 'Typing…' : otherUserMeta?.status || ''}</div>
            </div>
          </div>
          <button onClick={() => navigate(-1)} className="text-sm text-blue-600">Back</button>
        </div>

        <div className="mt-4 chat-wrapper">
          <div ref={messagesContainerRef} className="chat-messages space-y-2">
            {messages.length === 0 ? (
              <div className="chat-empty">No messages yet — say hello 👋</div>
            ) : (
              (() => {
                const nodes: any[] = []
                let lastDateKey = ''
                for (let i = 0; i < messages.length; i++) {
                  const m = messages[i]
                  const d = new Date(m.createdAt)
                  const dateKey = d.toDateString()
                  if (dateKey !== lastDateKey) {
                    lastDateKey = dateKey
                    nodes.push(
                      <div key={`sep-${dateKey}`} className="text-center text-xs text-gray-400 my-2">{d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                    )
                  }
                  const next = messages[i + 1]
                  const showAvatar = !m.fromSelf && (!next || next.fromUserId !== m.fromUserId)
                  const avatarLetter = (m.fromUserName || otherUserMeta?.username || otherUserMeta?.name || 'T').charAt(0).toUpperCase()
                  nodes.push(
                      <ChatBubble
                        key={m._id || m.tempId}
                        message={m.message}
                        fromSelf={!!m.fromSelf}
                        username={m.fromUserName || otherUserMeta?.username || otherUserMeta?.name}
                        avatarLetter={avatarLetter}
                        showAvatar={showAvatar}
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
                            socketRef.current.emit('message:reaction', { messageId, emoji, toUserId: userId })
                            try {
                              const key = `${messageId}:${me}`
                              const timer = window.setTimeout(() => {
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
                          setMessages((prev) => prev.filter((x) => x._id !== m._id && x._id !== m.tempId))
                          if (socketRef.current && m._id) socketRef.current.emit('message:delete', { messageId: m._id })
                        } catch (e) {}
                      }}
                      onShowProfile={() => handleShowProfile(m.fromUserId || m.from || m.fromId || m.from_id)}
                    />
                  )
                }
                return nodes
              })()
            )}
          </div>

        <div className="text-sm text-gray-500">{otherTyping ? 'Typing…' : ''}</div>

        <div className="mt-4 flex gap-2 items-stretch">
          <textarea ref={inputRef} value={text} onChange={(e) => handleChange(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} placeholder="Write a message" rows={2} className="chat-textarea flex-1 h-full px-3 py-2 border rounded resize-none" />

          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-2">
              <button ref={emojiBtnRef} aria-label="Insert emoji" title="Insert emoji" onClick={() => setShowInputEmojiPicker((s) => !s)} className="h-9 w-9 flex items-center justify-center rounded bg-white dark:bg-zinc-700 border border-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-600 text-lg">
                😄
              </button>
            </div>

            <button onClick={send} className="h-full px-4 py-2 flex items-center justify-center bg-blue-50 dark:bg-blue-600 text-black dark:text-gray-100 rounded border border-blue-600 hover:bg-blue-100 dark:hover:bg-blue-700 hover:border-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 relative z-20 shadow-sm hover:shadow-md transition-colors duration-150">Send</button>
          </div>

          {showInputEmojiPicker && pickerPos && createPortal(
            <div ref={pickerRef} style={{ position: 'absolute', top: pickerPos.top, left: pickerPos.left }} className="z-50 p-2 bg-white dark:bg-zinc-800 border rounded shadow-md grid grid-cols-4 gap-2">
              {['😀','👍','❤️','🙂','🎉','😮','😢','🔥'].map((e) => (
                <button key={e} onClick={() => {
                  try {
                    const el = inputRef.current
                    if (!el) return
                    const start = el.selectionStart ?? el.value.length
                    const end = el.selectionEnd ?? start
                    const next = el.value.slice(0, start) + e + el.value.slice(end)
                    setText(next)
                    requestAnimationFrame(() => {
                      try { const pos = start + e.length; el.selectionStart = el.selectionEnd = pos; el.focus(); } catch (er) {}
                    })
                  } finally { setShowInputEmojiPicker(false) }
                }} aria-label={`Insert ${e}`} className="p-1 text-2xl">{e}</button>
              ))}
            </div>
          , document.body)}
        </div>
      </div>
      </div>
    </section>
    <ProfileModal open={profileModalOpen} onClose={() => { setProfileModalOpen(false); setProfileData(null) }} profile={profileData} />
    </>
  )
}
