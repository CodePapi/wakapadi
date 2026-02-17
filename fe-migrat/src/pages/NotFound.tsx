import { Link } from 'react-router-dom'
import { useTranslation } from '../lib/i18n'

export default function NotFound() {
  const { t } = useTranslation()
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-2xl text-center p-8">
        <div className="text-6xl font-extrabold text-indigo-600 mb-4">404</div>
        <h1 className="text-2xl font-semibold mb-2">{t('error404Title') || 'Page not found'}</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">{t('error404Body') || 'We can’t find the page you’re looking for. Try searching or go back home.'}</p>

        <div className="flex items-center justify-center gap-3">
          <Link to="/" className="px-4 py-2 bg-indigo-600 text-white rounded">{t('errorActionHome') || 'Go home'}</Link>
          <Link to="/contact-us" className="px-4 py-2 border border-gray-200 rounded text-sm">{t('errorContactSupport') || 'Contact support'}</Link>
        </div>
        <div className="mt-6 text-xs text-gray-500">{t('errorMotivation') || 'Discover tours and meet people — your next adventure awaits.'}</div>
      </div>
    </main>
  )
}
