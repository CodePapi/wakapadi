import { Link } from 'react-router-dom'
import { useTranslation } from '../lib/i18n'

export default function ErrorPage({ status = 500 }: { status?: number }) {
  const { t } = useTranslation()
  const title = status === 403 ? t('error403Title') : t('error500Title')
  const body = status === 403 ? t('error403Body') : t('error500Body')

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-2xl text-center p-8">
        <div className="text-6xl font-extrabold text-pink-600 mb-4">{status}</div>
        <h1 className="text-2xl font-semibold mb-2">{title || (status === 403 ? 'Forbidden' : 'Something went wrong')}</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">{body || 'An unexpected error occurred. Try again or contact support.'}</p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/" className="px-4 py-2 bg-pink-600 text-white rounded">{t('errorActionHome') || 'Go home'}</Link>
          <Link to="/contact-us" className="px-4 py-2 border border-gray-200 rounded text-sm">{t('errorContactSupport') || 'Contact support'}</Link>
        </div>
      </div>
    </main>
  )
}
