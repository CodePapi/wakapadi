import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../lib/i18n'
import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { useNotifications } from '../hooks/useNotifications'
import { safeStorage } from '../lib/storage'

export default function NotificationsDropdown({ triggerClassName, iconClassName }: { triggerClassName?: string; iconClassName?: string } = {}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const portalRef = useRef<HTMLDivElement | null>(null)
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties | undefined>(undefined)
  const [isDesktop, setIsDesktop] = useState<boolean>(() => typeof window !== 'undefined' ? window.innerWidth > 650 : true)
  const currentUserId = safeStorage.getItem('userId') || ''
  const { notifications, markAllRead, markReadFromUser, lastNotification } = useNotifications(currentUserId)
  const navigate = useNavigate()
  const [toastOpen, setToastOpen] = useState(false)
  const { t } = useTranslation()

  // close on outside click or ESC
  useEffect(() => {
      const onDoc = (e: MouseEvent) => {
        if (!open) return
        if (!containerRef.current) return
        if (containerRef.current.contains(e.target as Node)) return
        if (buttonRef.current && buttonRef.current.contains(e.target as Node)) return
        setOpen(false)
      }
      const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
      document.addEventListener('mousedown', onDoc)
      document.addEventListener('keydown', onKey)
      return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

    // render the trigger inline but the panel in a portal to escape header stacking contexts
    useEffect(() => {
      // ensure portal container exists
      if (!portalRef.current) {
        const el = document.createElement('div')
        el.className = 'notifications-portal'
        document.body.appendChild(el)
        portalRef.current = el
      }
      return () => {
        if (portalRef.current && portalRef.current.parentElement) {
          portalRef.current.parentElement.removeChild(portalRef.current)
          portalRef.current = null
        }
      }
    }, [])

    // compute panel position when opening and on resize
    useEffect(() => {
      const compute = () => {
        const desktop = window.innerWidth > 650
        setIsDesktop(desktop)
        if (!desktop) {
          setPanelStyle(undefined)
          return
        }
        const btn = buttonRef.current
        if (!btn) return
        const rect = btn.getBoundingClientRect()
        const style: React.CSSProperties = {
          position: 'fixed',
          top: rect.bottom + 8,
          right: Math.max(8, window.innerWidth - rect.right) + 8,
          width: 320,
          zIndex: 9999,
        }
        setPanelStyle(style)
      }
      if (open) compute()
      window.addEventListener('resize', compute)
      return () => window.removeEventListener('resize', compute)
    }, [open])

    // lock body scroll on mobile when panel is open to keep panel visible at viewport bottom
    useEffect(() => {
      if (!open) return
      if (isDesktop) return
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }, [open, isDesktop])

    const panel = (
      <div id="notifications-pop" role="menu" aria-labelledby="notifications-button" ref={containerRef} style={panelStyle} className={`${isDesktop ? 'bg-white dark:bg-zinc-900 border sm:rounded-md sm:border shadow-lg' : 'fixed inset-x-0 bottom-0 bg-white dark:bg-zinc-900 border-t shadow-lg rounded-t-md pb-6 z-[10001]'} p-3 max-h-[60vh] overflow-auto`}>
          <div className="flex items-center justify-between px-2 mb-2">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('notificationsTitle')}</div>
            <div className="flex items-center gap-2">
              <button onClick={() => { markAllRead(); setOpen(false) }} className="text-xs text-gray-500 dark:text-gray-300">{t('notificationsMarkAll')}</button>
              <button onClick={() => setOpen(false)} className="text-xs text-gray-500 dark:text-gray-300">{t('close') || 'Close'}</button>
            </div>
          </div>
        {notifications.length === 0 ? (
          <div className="px-2 py-6 text-center text-sm text-gray-600 dark:text-gray-400">{t('notificationsEmpty')}</div>
        ) : (
          notifications.map((n) => (
            <button
              key={n.fromUserId}
              onClick={() => {
                markReadFromUser(n.fromUserId)
                setOpen(false)
                navigate(`/chat/${n.fromUserId}`)
              }}
              className="w-full text-left px-2 py-3 text-sm text-gray-800 dark:text-gray-200 border-b last:border-b-0 flex items-start gap-3"
            >
              <img src={`https://i.pravatar.cc/40?u=${n.fromUserId}`} alt="avatar" className="w-8 h-8 rounded-full flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-sm truncate">{n.fromUsername}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{timeAgo(n.createdAt)}</div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{n.messagePreview}</div>
              </div>
              <div className="ml-2 flex-shrink-0 text-xs text-blue-600 dark:text-sky-400">{n.count}</div>
            </button>
          ))
        )}
      </div>
    )

  useEffect(() => { if (lastNotification) setToastOpen(true) }, [lastNotification])

  useEffect(() => {
    if (!toastOpen) return
    const t = setTimeout(() => setToastOpen(false), 5000)
    return () => clearTimeout(t)
  }, [toastOpen])

  const handleToastClose = () => setToastOpen(false)
  const handleToastView = () => {
    if (!lastNotification) return
    markReadFromUser(lastNotification.fromUserId)
    setToastOpen(false)
    navigate(`/chat/${lastNotification.fromUserId}`)
  }

  // simple relative time helper
  function timeAgo(iso?: string) {
    if (!iso) return ''
    const diff = Date.now() - new Date(iso).getTime()
    const sec = Math.floor(diff / 1000)
    if (sec < 60) return `${sec}s`
    const min = Math.floor(sec / 60)
    if (min < 60) return `${min}m`
    const hr = Math.floor(min / 60)
    if (hr < 24) return `${hr}h`
    const day = Math.floor(hr / 24)
    return `${day}d`
  }

    return (
      <>
        <div className="relative">
            <button id="notifications-button" ref={buttonRef} aria-haspopup="true" aria-expanded={open} aria-controls="notifications-pop" onClick={() => setOpen((v) => !v)} className={triggerClassName ?? 'p-2 rounded-full hover:bg-gray-100  relative' } style={{background:"inherit"}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={iconClassName ?? 'text-gray-700 dark:text-gray-200'}><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11c0-3.07-1.64-5.64-4.5-6.32V4a1.5 1.5 0 0 0-3 0v.68C7.64 5.36 6 7.92 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium leading-none text-white bg-red-600 rounded-full">{notifications.reduce((s, n) => s + (n.count || 1), 0)}</span>
              )}
          </button>
        </div>

        {portalRef.current && open && createPortal(panel, portalRef.current)}
        {toastOpen && lastNotification && (
          <div className="fixed left-1/2 bottom-20 sm:bottom-12 transform -translate-x-1/2 z-[10002]">
            <div className="max-w-lg w-full bg-blue-600 dark:bg-sky-500 text-white rounded shadow-lg px-4 py-2 flex items-center gap-3">
              <div className="flex-1 text-sm">{t('notificationsNewMessage', { name: lastNotification.fromUsername })}</div>
              <button onClick={handleToastView} className="text-sm underline">{t('notificationsViewChat')}</button>
              <button onClick={handleToastClose} className="ml-2 text-white/80">✕</button>
            </div>
          </div>
        )}
      </>
    )
}
