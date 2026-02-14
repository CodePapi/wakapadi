import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { safeStorage } from '../lib/storage'
import anonymousAuth from '../lib/anonymousAuth'
import TagInput from '../components/TagInput'
import { useTranslation } from '../lib/i18n'

type Socials = {
  instagram?: string
  twitter?: string
  website?: string
}

const isValidUrl = (s?: string) => {
  if (!s) return true
  try { new URL(s); return true } catch { return false }
}

export default function Profile() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle'|'success'|'error'>('idle')
  const { t } = useTranslation()

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const userId = safeStorage.getItem('userId')
        if (!userId) {
          // No userId — show a helpful prompt instead of a raw error.
          setError('NOT_LOGGED_IN')
          setLoading(false)
          return
        }
        const res: any = await api.get(`/users/preferences/${encodeURIComponent(userId)}`, { cache: 'no-store' })
        setData(res.data || res)
      } catch (err: any) {
        setError('Failed to load profile')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const save = async () => {
    setSaving(true)
    setSaveStatus('idle')
    let payload: any = null
    try {
      payload = {
        username: data.username,
        bio: data.bio,
        profileVisible: Boolean(data.profileVisible),
        languages: data.languages || [],
        travelPrefs: data.travelPrefs || [],
        socials: data.socials || {},
        avatarUrl: data.avatarUrl,
      }
      const res: any = await api.patch('/users/preferences', payload)
      const updated = res?.data || res
      if (updated) setData(updated)
      setSaveStatus('success')
      // clear success after a short delay
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (err) {
      console.error('save failed', err)
      setSaveStatus('error')
      try {
        if (payload) anonymousAuth.savePendingProfileEdits(payload)
      } catch {}
      setTimeout(() => setSaveStatus('idle'), 3000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div>{t('profileLoading')}</div>
  if (error === 'NOT_LOGGED_IN') {
    return (
      <section className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center py-12">
          <h2 className="text-xl font-semibold">{t('authDeprecatedTitle')}</h2>
          <p className="mt-3 text-gray-600">{t('authDeprecatedBody')}</p>
          <div className="mt-6">
            <a href="/login" className="px-4 py-2 bg-blue-600 text-white rounded">{t('login')}</a>
          </div>
        </div>
      </section>
    )
  }

  if (error) return <div className="text-red-600">{t('profileLoadError')}</div>

  

  const updateSocial = (k: keyof Socials, v: string) => setData({ ...data, socials: { ...(data.socials || {}), [k]: v } })

  const usernameValid = (data.username || '').trim().length > 0
  const bioValid = (data.bio || '').length <= 300
  const socialsValid = isValidUrl(data.socials?.website) && isValidUrl(data.socials?.instagram) && isValidUrl(data.socials?.twitter)
  const canSave = usernameValid && bioValid && socialsValid

  return (
    <section className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">{t('profileTitle')}</h2>
        </div>
        <div className="mt-4 grid gap-4 max-w-xl">
          <label className="block">
            <div className="text-sm mb-1 text-gray-800 dark:text-gray-200">{t('profileDisplayNameLabel')}</div>
            <input id="username" value={data.username || ''} onChange={(e) => setData({ ...data, username: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {!usernameValid && <div className="text-xs text-red-600">{t('profileDisplayNameRequired')}</div>}
          </label>

          <label className="block">
            <div className="text-sm mb-1 text-gray-800 dark:text-gray-200">{t('profileBioLabel')}</div>
            <textarea id="bio" value={data.bio || ''} onChange={(e) => setData({ ...data, bio: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} />
            {!bioValid && <div className="text-xs text-red-600">{t('profileBioTooLong')}</div>}
          </label>

          <label className="block">
            <div className="text-sm mb-1 text-gray-800 dark:text-gray-200">{t('profileVisibilityLabel')}</div>
            <select id="profileVisible" value={String(Boolean(data.profileVisible))} onChange={(e) => setData({ ...data, profileVisible: e.target.value === 'true' })} className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="true">{t('profileVisibilityOn')}</option>
              <option value="false">{t('profileVisibilityOff')}</option>
            </select>
          </label>

          <div>
            <div className="text-sm text-gray-800 dark:text-gray-200">{t('profileLanguagesLabel')}</div>
            <div className="mt-2">
              <TagInput value={data.languages || []} onChange={(v) => setData({ ...data, languages: v })} placeholder="Add language (e.g. English)" />
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-800 dark:text-gray-200">{t('profileTravelInterestsLabel')}</div>
            <div className="mt-2">
              <TagInput value={data.travelPrefs || []} onChange={(v) => setData({ ...data, travelPrefs: v })} placeholder="e.g. hiking, food" />
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-800 dark:text-gray-200">{t('profileSocialTitle')}</div>
            <div className="mt-2 grid gap-2">
              <input id="instagram" value={data.socials?.instagram || ''} onChange={(e) => updateSocial('instagram', e.target.value)} placeholder="Instagram URL or username" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input id="twitter" value={data.socials?.twitter || ''} onChange={(e) => updateSocial('twitter', e.target.value)} placeholder="Twitter URL or username" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input id="website" value={data.socials?.website || ''} onChange={(e) => updateSocial('website', e.target.value)} placeholder="Website (https://example.com)" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {!socialsValid && <div className="text-xs text-red-600">{t('profileSocialsInvalid')}</div>}
            </div>
          </div>

          <div className="flex gap-2 items-center">
            <button onClick={save} disabled={saving || !canSave} className={`px-4 py-2 rounded ${!canSave ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'} focus:outline-none focus:ring-2 focus:ring-blue-500`}>
              {saving ? t('profileSaving') : t('profileSaveButton')}
            </button>
            <div aria-live="polite" className="min-h-[1rem]">
              {saveStatus === 'success' && <span className="text-sm text-green-600">{t('profileSaveSuccess')}</span>}
              {saveStatus === 'error' && <span className="text-sm text-red-600">{t('profileSaveError')}</span>}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
