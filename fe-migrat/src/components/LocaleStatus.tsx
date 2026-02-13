import { useI18nStatus } from '../lib/i18n'

export default function LocaleStatus() {
  const { loading, error } = useI18nStatus()

  if (loading) {
    return (
      <div title="loading locale" className="flex items-center text-sm text-gray-500">
        <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
          <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </svg>
        <span>...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div title={error.message} className="flex items-center text-sm text-red-500">
        <svg className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-9V7a1 1 0 112 0v2a1 1 0 11-2 0zm0 4a1 1 0 112 0 1 1 0 01-2 0z" clipRule="evenodd" />
        </svg>
        <span>!</span>
      </div>
    )
  }

  return null
}
