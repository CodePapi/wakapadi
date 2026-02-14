import { useState, useRef, useEffect } from 'react'

const DEFAULT_EMOJIS = ['😀', '👍', '❤️', '🙂', '🎉', '😮', '😢', '🔥']

export default function ChatBubble({
  message,
  fromSelf,
  username,
  createdAt,
  status,
  reactions,
  pendingReactionEmoji,
  onReact,
  onCopy,
  onDelete,
  onShowProfile,
}: any) {
  const [open, setOpen] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

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

  const handleDelete = () => {
    setOpen(false)
    if (onDelete) onDelete()
  }

  return (
    <div className={`p-2 rounded max-w-[80%] sm:max-w-md ${fromSelf ? 'bg-blue-50 self-end ml-auto text-gray-900 dark:bg-blue-900/40 dark:text-white' : 'bg-gray-100 mr-auto text-gray-900 dark:bg-gray-800 dark:text-gray-100'} relative`}> 
      {!fromSelf && (
        <div className="flex items-center gap-2">
          <button onClick={() => onShowProfile && onShowProfile()} className="w-7 h-7 rounded-full bg-gray-200 dark:bg-zinc-700 dark:text-white flex items-center justify-center text-xs font-semibold">{(username||'T').charAt(0).toUpperCase()}</button>
          <div className="text-xs font-medium text-gray-700 dark:text-gray-100">{username || 'Traveler'}</div>
        </div>
      )}

      <div className="text-sm whitespace-pre-wrap">{message}</div>

      <div className="flex items-center justify-between mt-1">
        <div className="text-xs text-gray-500 dark:text-gray-400">{new Date(createdAt).toLocaleTimeString()}</div>
        <div className="flex items-center gap-2">
          {reactions && reactions.length > 0 && (
            <div className="text-xs text-gray-700 dark:text-gray-100 px-2 py-0.5 bg-white dark:bg-zinc-700 rounded flex items-center gap-2">
              <div className="flex items-center gap-1">
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
                  <span key={emoji} className="inline-flex items-center px-1 py-0.5 bg-transparent rounded">{emoji}{count > 1 ? ` ${count}` : ''}</span>
                ))}
              </div>
              {pendingReactionEmoji && (
                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-gray-400 animate-pulse inline-block" aria-hidden="true" />
                </div>
              )}
            </div>
          )}
          <div className="text-xs text-gray-500 dark:text-gray-400">{status === 'sending' ? 'Sending…' : status === 'sent' ? 'Sent' : status === 'received' ? '' : status === 'read' ? 'Read' : ''}</div>
          <button aria-label="message options" onClick={() => setOpen((s) => !s)} className="ml-2 text-gray-600 dark:text-gray-200">⋮</button>
        </div>
      </div>

      {open && (
        <div ref={menuRef} className="absolute right-2 top-6 z-40 bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded shadow-md py-1 w-40 text-gray-900 dark:text-gray-100">
          <div className="flex flex-col">
            <button className="block w-full text-left px-3 py-1 hover:bg-gray-100 dark:hover:bg-zinc-700 flex items-center justify-between" onClick={() => setShowPicker((s) => !s)}>
              <span>React</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">{showPicker ? '▴' : '▾'}</span>
            </button>
            {showPicker && (
              <div className="p-2 grid grid-cols-4 gap-2">
                {DEFAULT_EMOJIS.map((e) => (
                  <button key={e} onClick={() => handleEmojiSelect(e)} className="text-2xl leading-none">{e}</button>
                ))}
              </div>
            )}
            <button className="block w-full text-left px-3 py-1 hover:bg-gray-100 dark:hover:bg-zinc-700" onClick={handleCopy}>Copy</button>
            {fromSelf && (
              <button className="block w-full text-left px-3 py-1 text-red-600 hover:bg-gray-100 dark:hover:bg-zinc-700" onClick={handleDelete}>Delete</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
