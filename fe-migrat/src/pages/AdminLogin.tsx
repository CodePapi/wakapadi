import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '../lib/i18n'
import useAdminAuth from '../hooks/useAdminAuth'

export default function AdminLogin() {
  const { t } = useTranslation()
  const { isAdmin, login } = useAdminAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  if (isAdmin) {
    navigate('/admin')
    return null
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const ok = login(email)
    if (ok) {
      navigate('/admin')
    } else {
      setError(t('adminLoginError') || 'Invalid admin email')
    }
  }

  return (
    <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-md mx-auto bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h1 className="text-xl font-semibold mb-4">{t('adminLoginTitle') || 'Admin login'}</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{t('adminLoginHelp') || 'Sign in with the admin email to access the dashboard.'}</p>
        {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
        <form onSubmit={handleSubmit}>
          <label className="block mb-3">
            <div className="text-sm mb-1 text-gray-700 dark:text-gray-300">{t('email') || 'Email'}</div>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </label>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-blue-600 text-white rounded" type="submit">{t('signIn') || 'Sign in'}</button>
          </div>
        </form>
      </div>
    </main>
  )
}
