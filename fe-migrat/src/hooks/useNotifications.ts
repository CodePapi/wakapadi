import { useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'
import { safeStorage } from '../lib/storage'
import { api } from '../lib/api'

export type Notification = {
  fromUserId: string
  fromUsername: string
  messagePreview: string
  createdAt: string
  conversationId: string
  count: number
}

export function useNotifications(currentUserId: string) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [lastNotification, setLastNotification] = useState<Notification | null>(null)
  const [connected, setConnected] = useState(false)
  const storageKey = useMemo(() => (currentUserId ? `wakapadi-notifications-${currentUserId}` : ''), [currentUserId])

  useEffect(() => {
    if (!storageKey) return
    const cached = safeStorage.getItem(storageKey)
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as Notification[]
        if (Array.isArray(parsed)) setNotifications(parsed)
      } catch (err) {
        // ignore
      }
    }
  }, [storageKey])

  useEffect(() => {
    if (!currentUserId) return
    const SOCKET = import.meta.env.VITE_SOCKET_URL || ''
    const socket = io(SOCKET || undefined, { path: '/socket.io', transports: ['websocket'], auth: { token: safeStorage.getItem('token') } })
    socket.emit('joinNotifications', { userId: currentUserId })

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on('connect_error', () => setConnected(false))

    socket.on('notification:new', (data: any) => {
      if (!data || !data.fromUserId) return
      setNotifications((prev) => {
        const existing = prev.find((n) => n.fromUserId === data.fromUserId)
        const next = existing
          ? prev.map((n) => (n.fromUserId === data.fromUserId ? { ...n, messagePreview: data.messagePreview, createdAt: data.createdAt, count: n.count + 1 } : n))
          : [{ ...data, count: 1 }, ...prev]
        const sorted = [...next].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        return sorted.slice(0, 20)
      })
      setLastNotification({ ...data, count: 1 })
    })

    return () => {
      socket.disconnect()
    }
  }, [currentUserId])

  useEffect(() => {
    if (!storageKey) return
    try { safeStorage.setItem(storageKey, JSON.stringify(notifications)) } catch {}
  }, [notifications, storageKey])

  const clearNotificationsFromUser = (userId: string) => setNotifications((prev) => prev.filter((n) => n.fromUserId !== userId))
  const clearAllNotifications = () => setNotifications([])

  const markReadFromUser = async (userId: string) => {
    try {
      await api.put('/notifications/mark-read', { fromUserId: userId })
    } catch (err) {
      // ignore server error but still clear locally for optimistic UX
    }
    clearNotificationsFromUser(userId)
  }

  const markAllRead = async () => {
    try {
      await api.put('/notifications/mark-read', { all: true })
    } catch (err) {
      // ignore
    }
    clearAllNotifications()
  }

  return { notifications, clearNotificationsFromUser, clearAllNotifications, markReadFromUser, markAllRead, lastNotification, connected }
}
