import { useEffect, useState, useMemo, useRef } from 'react'
import { useTranslation } from '../lib/i18n'
import TourCard from '../components/TourCard'
import { api } from '../lib/api'
import { safeStorage } from '../lib/storage'

export default function SavedTours() {
  const { t } = useTranslation()
  const [tours, setTours] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const topRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      setError(null)
      try {
        const res: any = await api.get('/tours', { cache: 'no-store' })
        const data = Array.isArray(res?.data) ? res.data : []
        setTours(data)
      } catch (err: any) {
        console.error('fetch saved tours', err)
        setError(err?.message || 'Failed to load tours')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  const savedKeys = useMemo(() => {
    try {
      const raw = safeStorage.getItem('saved_tours_v1')
      return raw ? (JSON.parse(raw) as string[]) : []
    } catch {
      return []
    }
  }, [/* recalculated on mount; users toggling saved state will fire storage events */])

  const filtered = useMemo(() => {
    if (!savedKeys.length) return []
    return tours.filter((t) => {
      const key = t.externalPageUrl || t.sourceUrl || t.title
      return savedKeys.includes(key)
    })
  }, [tours, savedKeys])

  useEffect(() => {
    const onStorage = () => {
      // trigger re-render by updating state via memoized savedKeys (we can't directly change it)
      // so simply force a fetch of tours again to refresh view
      // lightweight enough for this list
      (async () => {
        try {
          const res: any = await api.get('/tours', { cache: 'no-store' })
          const data = Array.isArray(res?.data) ? res.data : []
          setTours(data)
        } catch (e) { }
      })()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return (
    <section aria-labelledby="saved-heading" className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div ref={topRef} />
      <h2 id="saved-heading" className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{t('savedLabel') || 'Saved tours'}</h2>
      <p className="mt-2 text-sm text-gray-600">{t('savedSubtitle') || 'Tours you saved on this device'}</p>

      <div className="mt-6">
        {error && <div role="alert" className="text-red-700">{error}</div>}
        {loading ? (
          <div className="text-gray-600">Loading…</div>
        ) : (
          filtered.length === 0 ? (
            <div className="p-6 text-center text-gray-600">
              <div className="text-lg font-medium">{t('noSavedTours') || 'No saved tours'}</div>
              <div className="mt-2">{t('savedEmpty') || 'Save tours to view them here later.'}</div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((t, i) => (
                <TourCard key={t._id || t.id || i} tour={t} />
              ))}
            </div>
          )
        )}
      </div>
    </section>
  )
}
