// hooks/useNotifications.ts
import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!currentUserId) return;

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
      path: '/socket.io',
      transports: ['websocket'],
      auth: { token: safeStorage.getItem('token') },
    });

    socket.emit('joinNotifications', { userId: currentUserId });

    socket.on('notification:new', (data) => {
        if (!data.fromUserId || !data.fromUsername) return;

      setNotifications((prev) => {
        const existing = prev.find(n => n.fromUserId === data.fromUserId);
        if (existing) {
          return prev.map(n =>
            n.fromUserId === data.fromUserId
              ? { ...n, messagePreview: data.messagePreview, createdAt: data.createdAt, count: n.count + 1 }
              : n
          );
        }
        return [...prev, { ...data, count: 1 }];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUserId]);

  const clearNotificationsFromUser = (userId: string) => {
    setNotifications((prev) => prev.filter(n => n.fromUserId !== userId));
  };

  return { notifications, clearNotificationsFromUser };
}
