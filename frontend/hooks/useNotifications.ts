// hooks/useNotifications.ts
import { useEffect, useMemo, useState } from 'react';
import io from 'socket.io-client';
import { safeStorage } from '../lib/storage';

export interface Notification {
  fromUserId: string;
  fromUsername: string;
  messagePreview: string;
  createdAt: string;
  conversationId: string;
  count: number;
}

export function useNotifications(currentUserId: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lastNotification, setLastNotification] = useState<Notification | null>(null);
  const [connected, setConnected] = useState(false);
  const storageKey = useMemo(
    () => (currentUserId ? `wakapadi-notifications-${currentUserId}` : ''),
    [currentUserId]
  );

  useEffect(() => {
    if (!storageKey) return;
    const cached = safeStorage.getItem(storageKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as Notification[];
        if (Array.isArray(parsed)) setNotifications(parsed);
      } catch (error) {
        console.warn('Failed to parse notifications cache', error);
      }
    }
  }, [storageKey]);

  useEffect(() => {
    if (!currentUserId) return;

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
      path: '/socket.io',
      transports: ['websocket'],
      auth: { token: safeStorage.getItem('token') },
    });

    socket.emit('joinNotifications', { userId: currentUserId });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));

    socket.on('notification:new', (data) => {
        if (!data.fromUserId || !data.fromUsername) return;

      setNotifications((prev) => {
        const existing = prev.find(n => n.fromUserId === data.fromUserId);
        const next = existing
          ? prev.map(n =>
              n.fromUserId === data.fromUserId
                ? { ...n, messagePreview: data.messagePreview, createdAt: data.createdAt, count: n.count + 1 }
                : n
            )
          : [...prev, { ...data, count: 1 }];
        const sorted = [...next].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        return sorted.slice(0, 20);
      });
      setLastNotification({ ...data, count: 1 });
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUserId]);

  useEffect(() => {
    if (!storageKey) return;
    safeStorage.setItem(storageKey, JSON.stringify(notifications));
  }, [notifications, storageKey]);

  const clearNotificationsFromUser = (userId: string) => {
    setNotifications((prev) => prev.filter(n => n.fromUserId !== userId));
  };
  const clearAllNotifications = () => {
    setNotifications([]);
  };

  return {
    notifications,
    clearNotificationsFromUser,
    clearAllNotifications,
    lastNotification,
    connected,
  };
}
