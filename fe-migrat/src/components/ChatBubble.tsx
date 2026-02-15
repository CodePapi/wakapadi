import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

const DEFAULT_EMOJIS = ['😀', '👍', '❤️', '🙂', '🎉', '😮', '😢', '🔥']

export default function ChatBubble({
  message,
  fromSelf,
  username,
  avatarLetter,
  showAvatar = false,
  createdAt,
  status,
  reactions,
  pendingReactionEmoji,
  onReact,
  onCopy,
  onShowProfile,
}: any) {
  const [open, setOpen] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target as Node)) {
        setOpen(false)
        setShowPicker(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const handleEmojiSelect = (emoji: string) => {
    try {
      if (onReact) onReact(emoji)
    } finally {
      setShowPicker(false)
      setOpen(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message || '')
      if (onCopy) onCopy()
    } catch {}
    setOpen(false)
  }

  useEffect(() => {
    if (!open) {
      setMenuPos(null)
      return
    }
    try {
      const btn = triggerRef.current
      if (!btn) return
      const r = btn.getBoundingClientRect()
      const top = Math.max(8, r.bottom + window.scrollY + 6)
      // prefer aligning menu to the trigger's left, but clamp to viewport
      const preferredLeft = r.left + window.scrollX
      const maxLeft = Math.max(8, window.innerWidth - 320)
      const left = Math.min(preferredLeft, maxLeft)
      setMenuPos({ top, left })
    } catch (e) {}
  }, [open])
  return (
    <div className={`chat-message-appear msg-row ${fromSelf ? 'justify-end' : 'justify-start'}`}> 
      {!fromSelf && showAvatar ? (
        <button onClick={() => onShowProfile && onShowProfile()} className="avatar-sm" aria-label={`Open profile ${username || ''}`}>{avatarLetter || (username||'T').charAt(0).toUpperCase()}</button>
      ) : (
        !fromSelf ? <div style={{width:36}} /> : null
      )}

      <div className={`${fromSelf ? 'bubble bubble--self' : 'bubble bubble--other'}`} style={{ maxWidth: 'var(--bubble-max-width)' }}>
        {!fromSelf && showAvatar && (
          <div className="text-xs font-medium mb-1 text-gray-700 dark:text-gray-100">{username || 'Traveler'}</div>
        )}

        <div className="text-sm whitespace-pre-wrap break-words">{message}</div>

        <div className="bubble-meta">
          <div className="bubble-time" aria-label={`Sent at ${new Date(createdAt).toLocaleTimeString()}`}>{new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          <div className="flex items-center gap-2">
            {reactions && reactions.length > 0 && (
              <div className="reactions-inline">
                {(
                  Array.from(reactions.reduce((map: Map<string, number>, r: any) => {
                    map.set(r.emoji, (map.get(r.emoji) || 0) + 1)
                    return map
                  }, new Map()) as Map<string, number>).entries() as IterableIterator<[string, number]>
                ? Array.from((reactions.reduce((map: Map<string, number>, r: any) => {
                    map.set(r.emoji, (map.get(r.emoji) || 0) + 1)
                    return map
                  }, new Map()) as Map<string, number>).entries() as IterableIterator<[string, number]>) as [string, number][]
                : []).map(([emoji, count]) => (
                  <span key={emoji} className="inline-flex items-center px-2 py-0.5 bg-white dark:bg-zinc-700 rounded text-sm">{emoji}{count > 1 ? ` ${count}` : ''}</span>
                ))}
                {pendingReactionEmoji && (
                  <span className="inline-block w-3 h-3 rounded-full bg-gray-400 animate-pulse" aria-hidden="true" />
                )}
              </div>
            )}

            <div className="text-xs text-gray-500 dark:text-gray-400">{status === 'sending' ? 'Sending…' : status === 'sent' ? 'Sent' : status === 'received' ? '' : status === 'read' ? 'Read' : ''}</div>
            <button ref={triggerRef} aria-label="message options" onClick={() => setOpen((s) => !s)} className="ml-2 text-gray-600 dark:text-gray-200">⋮</button>
          </div>
        </div>
      </div>
      {open && menuPos && createPortal(
        <div ref={menuRef} style={{ position: 'absolute', top: menuPos.top, left: menuPos.left }} className={`z-[9999] bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded shadow-md py-1 w-36 sm:w-auto max-w-[90vw] sm:max-w-sm text-gray-900 dark:text-gray-100`}>
          <div className="flex flex-col">
            <button className="block w-full text-left px-2 py-1 hover:bg-gray-100 dark:hover:bg-zinc-700 flex items-center justify-between" onClick={() => setShowPicker((s) => !s)} aria-haspopup="true" aria-expanded={showPicker} aria-label={showPicker ? 'Close reactions' : 'Open reactions'}>
              <span className="flex items-center gap-2 text-lg">😄</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">{showPicker ? '▴' : '▾'}</span>
            </button>
            {showPicker && (
              <div className="p-2 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                {DEFAULT_EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => handleEmojiSelect(e)}
                    aria-label={`React ${e}`}
                    className="flex items-center justify-center text-2xl leading-none px-2 py-1 bg-white border border-gray-100 rounded-md hover:bg-gray-100 dark:bg-zinc-700 dark:border-zinc-600 dark:hover:bg-zinc-600"
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
            <button className="block w-full text-left px-2 py-1 hover:bg-gray-100 dark:hover:bg-zinc-700 flex items-center gap-2" onClick={handleCopy} aria-label="Copy message">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600 dark:text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
          </div>
        </div>
      , document.body)}
    </div>
  )
}
