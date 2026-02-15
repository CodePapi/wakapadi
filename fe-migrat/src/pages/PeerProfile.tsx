import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useTranslation } from '../lib/i18n'
import VisibilityIndicator from '../components/VisibilityIndicator'
import { anonymousLabel } from '../lib/anonymousNames'
import BlockButton from '../components/BlockButton'
import { ensureAnonymousSession } from '../lib/anonymousAuth'

export default function PeerProfile() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)
  
  const [blockState, setBlockState] = useState<{ blockedByMe: boolean; blockedByThem: boolean; anyReported: boolean } | null>(null)

  useEffect(() => {
    if (!userId) return
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res: any = await api.get(`/public/users/preferences/${encodeURIComponent(userId)}`, { cache: 'no-store' })
        // api.get returns { data, status, headers }
        const payload = res.data ?? res
        if (!payload) {
          setError(t('profileLoadError') || 'Profile not found')
          setData(null)
        } else {
          setData(payload)
        }
      } catch (err: any) {
        setError('Failed to load profile')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [userId])

  if (!userId) return <div className="container mx-auto px-4 py-6">Invalid user</div>
  if (loading) return <div className="container mx-auto px-4 py-6">{t('profileLoading')}</div>
  if (error) return <div className="container mx-auto px-4 py-6 text-red-600">{t('profileLoadError') || error}</div>

  return (
    <section className="container mx-auto px-4 py-6">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-900 border border-gray-100 dark:border-zinc-800 rounded-lg shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <img src={data?.avatarUrl || data?.avatar || `https://i.pravatar.cc/160?u=${userId}`} alt={(data?.profileVisible === false ? anonymousLabel(undefined, userId) : data?.username) || 'Traveler'} className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover ring-2 ring-gray-100 dark:ring-zinc-800" />
            <div>
              <h1 className="text-2xl font-semibold leading-tight">{data?.profileVisible === false ? anonymousLabel(undefined, userId) : (data?.username || t('peerTitle') || 'Traveler')}</h1>
              {typeof data?.profileVisible !== 'undefined' && (
                <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">{data.profileVisible ? t('profileVisibilityOn') : t('profileVisibilityOff')}</div>
              )}
              <div className="mt-3 text-gray-800 dark:text-gray-200 max-w-prose whitespace-pre-wrap">{data?.bio || <span className="text-sm text-gray-500">{t('profileNoBio') || 'No bio provided.'}</span>}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <VisibilityIndicator />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-100">{t('profileLanguagesLabel')}</h3>
            <div className="mt-2 flex flex-wrap gap-2">{(data.languages && data.languages.length > 0) ? (data.languages.map((l: string) => <span key={l} className="px-2 py-1 bg-gray-100 dark:bg-zinc-800 rounded text-sm">{l}</span>)) : (<span className="text-sm text-gray-500">{t('profileNoLanguages') || 'No languages listed.'}</span>)}</div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-100">{t('profileTravelInterestsLabel')}</h3>
            <div className="mt-2 flex flex-wrap gap-2">{(data.travelPrefs && data.travelPrefs.length > 0) ? (data.travelPrefs.map((p: string) => <span key={p} className="px-2 py-1 bg-gray-100 dark:bg-zinc-800 rounded text-sm">{p}</span>)) : (<span className="text-sm text-gray-500">{t('profileNoInterests') || 'No travel interests listed.'}</span>)}</div>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-100">{t('profileSocialTitle')}</h3>
          <div className="mt-2 flex flex-col gap-2 text-sm">
            {data?.socials?.instagram ? <a className="text-blue-600 hover:underline" href={data.socials.instagram.startsWith('http') ? data.socials.instagram : `https://instagram.com/${data.socials.instagram}`} target="_blank" rel="noreferrer">Instagram</a> : <span className="text-sm text-gray-500">{t('profileNoInstagram') || 'No Instagram'}</span>}
            {data?.socials?.twitter ? <a className="text-blue-600 hover:underline" href={data.socials.twitter.startsWith('http') ? data.socials.twitter : `https://twitter.com/${data.socials.twitter}`} target="_blank" rel="noreferrer">Twitter</a> : <span className="text-sm text-gray-500">{t('profileNoTwitter') || 'No Twitter'}</span>}
            {data?.socials?.website ? <a className="text-blue-600 hover:underline" href={data.socials.website} target="_blank" rel="noreferrer">Website</a> : <span className="text-sm text-gray-500">{t('profileNoWebsite') || 'No website'}</span>}
          </div>
        </div>

            <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex gap-3">
            <button
              onClick={async () => {
                try {
                  await ensureAnonymousSession()
                } catch {}
                    // Prevent navigation if blocked/reported
                    if (blockState && (blockState.anyReported || blockState.blockedByMe || blockState.blockedByThem)) {
                      try { window.dispatchEvent(new CustomEvent('wakapadi:toast', { detail: { text: t('actionFailed') || 'Action failed' } })) } catch {}
                      return
                    }
                    navigate(`/chat/${userId}`)
              }}
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded shadow"
            >
              {t('chatWithAssistant') || 'Message'}
            </button>

            <button onClick={() => window.history.back()} className="px-4 py-2 border rounded text-sm">{t('back') || 'Back'}</button>
          </div>

          <div className="flex gap-2">
            <BlockButton userId={String(userId)} onChange={(s) => setBlockState(s)} />
          </div>
        </div>
      </div>
    </section>
  )
}
