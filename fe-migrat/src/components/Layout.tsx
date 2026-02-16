import type { ReactNode } from 'react'
import NavBar, { MobileBottomNav } from './NavBar'
import { api } from '../lib/api'
import { setLogoutBlock } from '../lib/anonymousAuth'
import { safeStorage } from '../lib/storage'

export default function Layout({ children }: { children: ReactNode }) {
    const isLoggedIn= safeStorage.getItem('userId')!==null
  async function performLogout() {
    try {
      try {
        const token = localStorage.getItem('token')
        if (token) await api.patch('/whois', { visible: false })
      } catch (e) {
        console.warn('failed to update presence during logout', e)
      }
    } finally {
      try { localStorage.removeItem('token') } catch {}
      try { localStorage.removeItem('userId') } catch {}
      try { localStorage.removeItem('authProvider') } catch {}
      try { setLogoutBlock() } catch {}
      window.location.href = '/'
    }
  }
  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <NavBar />
      <main style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6rem)' }}>
        <div className="max-w-5xl mx-auto px-2 sm:px-6 lg:px-8 py-4">
          {children}
        </div>
      </main>
      <MobileBottomNav isLoggedIn={isLoggedIn} onLogout={performLogout} />

    </div>
  )
}
