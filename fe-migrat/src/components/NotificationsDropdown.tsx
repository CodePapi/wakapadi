import { useState } from 'react';
import { useNotifications } from '../hooks/useNotifications'
import { safeStorage } from '../lib/storage'

export default function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const currentUserId = safeStorage.getItem('userId') || ''
  const { notifications, markAllRead, markReadFromUser } = useNotifications(currentUserId)

  return (
    <div className="relative">
      <button id="notifications-button" aria-haspopup="true" aria-expanded={open} aria-controls="notifications-pop" onClick={() => setOpen((v) => !v)} className="p-2 rounded-full hover:bg-gray-100">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11c0-3.07-1.64-5.64-4.5-6.32V4a1.5 1.5 0 0 0-3 0v.68C7.64 5.36 6 7.92 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>

      {open && (
        <div id="notifications-pop" role="menu" className="absolute mt-2 w-11/12 sm:w-72 md:w-80 bg-white border rounded-md shadow-lg z-40 left-1/2 transform -translate-x-1/2 md:left-auto md:right-0">
          <div className="p-2">
            <div className="flex items-center justify-between px-2 mb-2">
              <div className="text-sm font-medium">Notifications</div>
              <div className="flex items-center gap-2">
                <button onClick={() => markAllRead()} className="text-xs text-gray-500">Clear</button>
                <button onClick={() => setOpen(false)} className="text-xs text-gray-500">Close</button>
              </div>
            </div>
            {notifications.length === 0 ? (
              <div className="px-2 py-3 text-sm text-gray-600">You're all caught up</div>
            ) : (
              notifications.map((n) => (
                <div key={n.fromUserId} className="px-2 py-2 text-sm text-gray-700 border-b last:border-b-0 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{n.fromUsername}</div>
                    <div className="text-xs text-gray-500 truncate max-w-full sm:max-w-xs">{n.messagePreview}</div>
                  </div>
                  <div className="ml-2 text-xs">
                    <button onClick={() => markReadFromUser(n.fromUserId)} className="text-xs text-blue-600">Mark read</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
