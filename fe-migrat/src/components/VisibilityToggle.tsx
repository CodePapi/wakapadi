import { useState, useEffect } from 'react'
import { safeStorage } from '../lib/storage'
import { useTranslation } from '../lib/i18n'
import { api } from '../lib/api'

const STORAGE_KEY = 'wakapadi_visibility'

export default function VisibilityToggle() {
  const { t } = useTranslation()
  const [visible, setVisible] = useState<boolean>(() => {
    try {
      const raw = safeStorage.getItem(STORAGE_KEY)
      return raw === null ? true : raw === '1'
    } catch {
      return true
    }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sync toggle with backend
  const handleToggle = async (next: boolean) => {
    setLoading(true)
    setError(null)
    const prev = visible
    setVisible(next)
    try {
      safeStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      await api.patch('/whois', { visible: next })
      // notify other components (header indicator) that visibility changed
      try { window.dispatchEvent(new CustomEvent('wakapadi:visibility-changed')) } catch {}
    } catch (e: any) {
      setVisible(prev)
      setError(t('visibilityUpdateFailed') || 'Failed to update visibility')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-white p-4 rounded-lg border">
      <div>
        <div className="text-sm font-semibold text-gray-900">{t('visibilityTitle') || t('toggleVisibility')}</div>
        <div className="text-xs text-gray-600 mt-1">{t('visibilityBody') || 'Control whether other travelers can see you nearby. Toggle off to browse anonymously.'}</div>
      </div>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={visible} onChange={(e) => handleToggle(e.target.checked)} className="sr-only" disabled={loading} />
          <span className={`w-11 h-6 rounded-full p-1 ${visible ? 'bg-blue-600' : 'bg-gray-300'}`} aria-hidden>
            <span className={`block w-4 h-4 rounded-full bg-white transform ${visible ? 'translate-x-5' : ''} transition`} />
          </span>
        </label>
        <div className="text-sm text-gray-700">{visible ? (t('visibilityVisible') || 'Visible to travelers') : (t('visibilityHidden') || 'Hidden (anonymous)')}</div>
        {loading && <span className="ml-2 text-xs text-gray-500">{t('saving') || 'Saving...'}</span>}
        {error && <span className="ml-2 text-xs text-red-600">{error}</span>}
      </div>
    </div>
  )
}
