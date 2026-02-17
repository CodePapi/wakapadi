import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import React, { useEffect, Suspense } from 'react'
import { ensureAnonymousSession } from './lib/anonymousAuth'
const Whois = React.lazy(() => import('./pages/Whois'))
const Tours = React.lazy(() => import('./pages/Tours'))
const SavedTours = React.lazy(() => import('./pages/SavedTours'))
const Profile = React.lazy(() => import('./pages/Profile'))
const PeerProfile = React.lazy(() => import('./pages/PeerProfile'))
const ChatInbox = React.lazy(() => import('./pages/ChatInbox'))
const ChatConversation = React.lazy(() => import('./pages/ChatConversation'))
const ContactUs = React.lazy(() => import('./pages/ContactUs'))
const AdminLogin = React.lazy(() => import('./pages/AdminLogin'))
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'))
const NotFound = React.lazy(() => import('./pages/NotFound'))
const ErrorPage = React.lazy(() => import('./pages/ErrorPage'))
import { I18nProvider } from './lib/i18n'
import Layout from './components/Layout'

export default function App() {
  useEffect(() => {
    // ensure an anonymous session exists on app start
    ensureAnonymousSession().catch(() => {})
  }, [])

  return (
    <I18nProvider>
      <BrowserRouter>
        <Layout>
          <Suspense fallback={<div className="text-center">Loading…</div>}>
            <Routes>
                <Route path="/" element={<Home />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/contact-us" element={<ContactUs />} />
                <Route path="/forbidden" element={<ErrorPage status={403} />} />
                <Route path="/whois" element={<Whois />} />
                <Route path="/tours" element={<Tours />} />
                <Route path="/saved" element={<SavedTours />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/whois/profile/:userId" element={<PeerProfile />} />
                <Route path="/login" element={<Login />} />
                <Route path="/chat" element={<ChatInbox />} />
                <Route path="/chat/:userId" element={<ChatConversation />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
        </Layout>
      </BrowserRouter>
    </I18nProvider>
  )
}
  // use the extracted NavBar component

 
