import { BrowserRouter, Routes, Route, Link, NavLink, useNavigate } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import React, { useEffect, Suspense } from 'react'
import { ensureAnonymousSession } from './lib/anonymousAuth'
const Whois = React.lazy(() => import('./pages/Whois'))
const Tours = React.lazy(() => import('./pages/Tours'))
const SavedTours = React.lazy(() => import('./pages/SavedTours'))
const Profile = React.lazy(() => import('./pages/Profile'))
const ChatInbox = React.lazy(() => import('./pages/ChatInbox'))
const ChatConversation = React.lazy(() => import('./pages/ChatConversation'))
const ContactUs = React.lazy(() => import('./pages/ContactUs'))
import NotificationsDropdown from './components/NotificationsDropdown'
import { I18nProvider, useTranslation } from './lib/i18n'
import LanguageSwitcher from './components/LanguageSwitcher'
import LocaleStatus from './components/LocaleStatus'
import VisibilityIndicator from './components/VisibilityIndicator'
import PendingSyncNotice from './components/PendingSyncNotice'
import SafetyNotice from './components/SafetyNotice'
import { setLogoutBlock } from './lib/anonymousAuth'
import { api } from './lib/api'
import { useState } from 'react'
import { safeStorage } from './lib/storage'

export default function App() {
  useEffect(() => {
    // ensure an anonymous session exists on app start
    ensureAnonymousSession().catch(() => {})
  }, [])

  return (
    <I18nProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-surface text-on-surface">
          <Header />

          <main className="max-w-5xl mx-auto px-4 py-12">
            <Suspense fallback={<div className="text-center">Loading…</div>}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/contact-us" element={<ContactUs />} />
                <Route path="/whois" element={<Whois />} />
                <Route path="/tours" element={<Tours />} />
                <Route path="/saved" element={<SavedTours />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/login" element={<Login />} />
                <Route path="/chat" element={<ChatInbox />} />
                <Route path="/chat/:userId" element={<ChatConversation />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </BrowserRouter>
    </I18nProvider>
  )
}

function Header() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => Boolean(localStorage.getItem('token')))
  const navigate = useNavigate()
  const sizeClass = 'text-sm'
  const activeClass = `${sizeClass} text-blue-600 font-semibold border-b-2 border-blue-600 pb-1`
  const inactiveClass = `${sizeClass} text-gray-700 hover:text-gray-900 hover:border-b-2 hover:border-gray-300 pb-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 rounded`

  const handleLogin = () => {
    try {
      const loc = window.location.pathname + window.location.search + window.location.hash
      safeStorage.setItem('wakapadi_return_to', loc)
    } catch {}
    navigate('/login')
  }

  useEffect(() => {
    const onStorage = () => setIsLoggedIn(Boolean(localStorage.getItem('token')))
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return (
    <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-sm dark:bg-gray-900/85 border-b">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" aria-label="Wakapadi home" className="flex items-center gap-3">
          <img src="/logo1.svg" alt="Wakapadi" className="h-8" />
        </Link>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex gap-3 items-center">
            <nav aria-label="Main navigation" className="flex gap-4 items-center">
              <NavTexts />
            </nav>
            <div className="flex items-center gap-3">
              {isLoggedIn ? (
                <>
                  <NavLink to="/profile" className={({ isActive }) => (isActive ? activeClass : inactiveClass)}>{t('profile')}</NavLink>
                  <NavLink to="/chat" className={({ isActive }) => (isActive ? activeClass : inactiveClass)}>{t('chat')}</NavLink>
                  <button onClick={() => performLogout()} type="button" className="text-sm text-red-600 ml-2">{t('logout') || 'Logout'}</button>
                </>
              ) : (
                <button onClick={handleLogin} className="text-sm text-blue-600">{t('login')}</button>
              )}
            </div>
          </div>

          {isLoggedIn && <NotificationsDropdown />}
          <div className="hidden sm:flex items-center px-2">
            <VisibilityIndicator />
          </div>
          <LanguageSwitcher />
          <LocaleStatus />
        </div>

        <div className="hidden lg:flex items-center ml-4 space-x-4">
          <PendingSyncNotice />
          <SafetyNotice />
        </div>

        <button
          onClick={() => setOpen((s) => !s)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="mobile-menu"
          className="md:hidden p-2 rounded border"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-700">
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-4">
        <div className="md:hidden mt-1 flex flex-col gap-2">
          <PendingSyncNotice />
          <SafetyNotice />
        </div>
      </div>

      {open && (
        <div id="mobile-menu" className="md:hidden bg-white/95 border-t">
          <div className="px-4 py-3 max-w-6xl mx-auto flex flex-col gap-3">
            <nav aria-label="Mobile main navigation" className="flex flex-col gap-2">
              <NavTexts mobile />
            </nav>
            <div className="flex flex-col gap-2">
              {isLoggedIn ? (
                <>
                  <NavLink to="/profile" onClick={() => setOpen(false)} className={({ isActive }) => (isActive ? 'block w-full text-left px-3 py-2 text-blue-600 font-semibold' : 'block w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-50')}>{t('profile')}</NavLink>
                  <NavLink to="/chat" onClick={() => setOpen(false)} className={({ isActive }) => (isActive ? 'block w-full text-left px-3 py-2 text-blue-600 font-semibold' : 'block w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-50')}>{t('chat')}</NavLink>
                  <button onClick={() => performLogout()} type="button" className="text-sm text-red-600 text-left">{t('logout') || 'Logout'}</button>
                </>
              ) : (
                <button onClick={handleLogin} className="text-sm text-blue-600">{t('login')}</button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

function NavTexts({ mobile, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const { t } = useTranslation()
  const sizeClass = mobile ? 'text-base' : 'text-sm'
  const activeClass = `${sizeClass} text-blue-600 font-semibold border-b-2 border-blue-600 pb-1`
  const inactiveClass = `${sizeClass} text-gray-700 hover:text-gray-900 hover:border-b-2 hover:border-gray-300 pb-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 rounded`

  const handleClick = () => {
    try { if (mobile && onNavigate) onNavigate() } catch (e) {}
  }

  return (
    <>
      <NavLink to="/whois" onClick={handleClick} className={({ isActive }) => (isActive ? activeClass : inactiveClass)}>{t('whoisNearby')}</NavLink>
      <NavLink to="/tours" onClick={handleClick} className={({ isActive }) => (isActive ? activeClass : inactiveClass)}>{t('toursBrowseTitle')}</NavLink>
      <NavLink to="/saved" onClick={handleClick} className={({ isActive }) => (isActive ? activeClass : inactiveClass)}>{t('savedLabel') || 'Saved'}</NavLink>
      <NavLink to="/contact-us" onClick={handleClick} className={({ isActive }) => (isActive ? activeClass : inactiveClass)}>{t('contactUs')}</NavLink>
    </>
  )
}

// Logout handler mirrored from legacy frontend behavior
export async function performLogout() {
  try {
    // Instead of deleting the account, mark the user as hidden (not visible)
    // so they won't appear on the whois page. Call this while still
    // authenticated (before clearing token).
    try {
      const token = localStorage.getItem('token')
      if (token) {
        await api.patch('/whois', { visible: false })
      }
    } catch (e) {
      console.warn('failed to update presence during logout', e)
    }
  } catch (err) {
    console.warn('logout cleanup failed', err)
  } finally {
    // Clear local session, but keep the browser/device id so anonymous login
    // can be reused later. Also set a logout block to prevent immediate
    // auto-relogin.
    try { localStorage.removeItem('token') } catch {}
    try { localStorage.removeItem('userId') } catch {}
    try { localStorage.removeItem('authProvider') } catch {}
    try { setLogoutBlock() } catch {}
    // reload to reset UI/state
    window.location.href = '/'
  }
}
