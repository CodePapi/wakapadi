import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '../lib/i18n'
import { ensureAnonymousSession, clearLogoutBlock } from '../lib/anonymousAuth'
import { safeStorage } from '../lib/storage'

export default function Login() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)
    // user-initiated login should clear any logout block
    try { clearLogoutBlock() } catch {}
    ensureAnonymousSession()
      .then((res) => {
        if (!mounted) return
        if (res && (res as any).token) {
          // on success, return to previously-stored path (if any)
          try {
            const ret = safeStorage.getItem('wakapadi_return_to')
            if (ret) safeStorage.removeItem('wakapadi_return_to')
            const goto = ret && ret !== '/login' ? ret : '/'
            window.location.href = goto
          } catch {
            window.location.href = '/'
          }
        } else {
          setError('Anonymous sign-in blocked or failed')
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!mounted) return
        setError(err?.message || 'Anonymous sign-in failed')
        setLoading(false)
      })
    return () => { mounted = false }
  }, [nav])

  return (
    <section className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto text-center py-12">
        <h2 className="text-2xl font-semibold">{t('authAnonymousTitle') || 'Sign in anonymously'}</h2>
        <p className="mt-3 text-gray-600">{t('authAnonymousBody') || 'We sign you in using your device so you can chat with nearby people without creating an account.'}</p>
        <div className="mt-6">
          {loading ? (
            <div className="text-sm text-gray-700">Signing you in anonymously…</div>
          ) : error ? (
              <div className="space-y-3">
              <div className="text-sm text-red-600">{error}</div>
              <button
                onClick={() => {
                  setLoading(true); setError(null);
                  try { clearLogoutBlock() } catch {}
                  ensureAnonymousSession()
                    .then((res) => {
                      if (res && (res as any).token) {
                        try {
                          const ret = safeStorage.getItem('wakapadi_return_to')
                          if (ret) safeStorage.removeItem('wakapadi_return_to')
                          const goto = ret && ret !== '/login' ? ret : '/'
                          window.location.href = goto
                        } catch { window.location.href = '/' }
                      } else { setError('Anonymous sign-in blocked or failed'); setLoading(false) }
                    })
                    .catch((e) => { setError(e?.message || 'Failed'); setLoading(false) })
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >Try again</button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
