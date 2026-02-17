import { useState, useMemo } from 'react'
import { api } from '../lib/api'
import { useTranslation } from '../lib/i18n'

export default function ContactUs() {
  const { t } = useTranslation()
  const [form, setForm] = useState({ name: '', email: '', type: 'inquiry', message: '' })
  const [status, setStatus] = useState<'idle'|'sending'|'success'|'error'>('idle')
  const [showMsg, setShowMsg] = useState<string | null>(null)

  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email), [form.email])
  const formValid = useMemo(() => form.name.trim().length > 1 && emailValid && form.message.trim().length > 6, [form.name, emailValid, form.message])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formValid) {
      setShowMsg(t('contactFormValidationError') || 'Please complete the form correctly')
      setStatus('error')
      return
    }
    setStatus('sending')
    setShowMsg(null)
    try {
      const res = await api.post('/contact', { ...form })
      // api.request normalizes to { data, status }
      console.info('contact submit response', res)
      if (res && (res.status === 200 || res.status === 201)) {
        setStatus('success')
        setShowMsg(t('contactFormStatusSuccess'))
        setForm({ name: '', email: '', type: 'inquiry', message: '' })
        setTimeout(() => setShowMsg(null), 4000)
      } else {
        setStatus('error')
        setShowMsg(`${t('contactFormStatusError')}: ${res?.status || 'unknown'}`)
      }
    } catch (err: any) {
      console.error('contact submit failed', err)
      setStatus('error')
      setShowMsg(err?.message || t('contactFormStatusError'))
    }
  }

  return (
    <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-6 text-center sm:text-left">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2 text-gray-900 dark:text-white">{t('contactTitle')}</h1>
          <p className="text-base text-gray-600 dark:text-gray-300 max-w-2xl">{t('contactHeroBody')}</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <form onSubmit={handleSubmit} className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl shadow-lg text-gray-900 dark:text-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">{t('contactFormTitle')}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('contactSubtitle')}</p>
              </div>
              <div className="text-sm text-gray-500">{t('contactResponseShort')}</div>
            </div>

            {showMsg && (
              <div className={`mb-4 px-4 py-3 rounded-md ${status === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`} role="status" aria-live="polite">
                {showMsg}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <div className="text-sm mb-1 font-medium text-gray-700 dark:text-gray-300">{t('contactFormNameLabel')}</div>
                <input id="name" name="name" required value={form.name} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </label>

              <label className="block">
                <div className="text-sm mb-1 font-medium text-gray-700 dark:text-gray-300">{t('contactFormEmailLabel')}</div>
                <input id="email" name="email" type="email" required value={form.email} onChange={handleChange} className={`w-full px-3 py-2 border ${form.email && !emailValid ? 'border-red-300' : 'border-gray-300'} dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500`} />
                {form.email && !emailValid && <div className="text-xs text-red-600 mt-1">{t('contactFormEmailInvalid')}</div>}
              </label>
            </div>

            <label className="block mt-4">
              <div className="text-sm mb-1 font-medium text-gray-700 dark:text-gray-300">{t('contactFormTypeLabel')}</div>
              <select id="type" name="type" value={form.type} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="inquiry">{t('contactFormTypeInquiry')}</option>
                <option value="complaint">{t('contactFormTypeComplaint')}</option>
                <option value="feedback">{t('contactFormTypeFeedback')}</option>
                <option value="suggestion">{t('contactFormTypeSuggestion')}</option>
                <option value="other">{t('contactFormTypeOther')}</option>
              </select>
            </label>

            <label className="block mt-4">
              <div className="text-sm mb-1 font-medium text-gray-700 dark:text-gray-300">{t('contactFormMessageLabel')}</div>
              <textarea id="message" name="message" required value={form.message} onChange={handleChange} rows={6} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </label>

            <div className="mt-6">
              <button
                type="submit"
                disabled={status === 'sending' || !formValid}
                aria-busy={status === 'sending'}
                className={`inline-flex items-center justify-center w-full md:w-auto px-6 py-2 rounded font-semibold transition ${status === 'sending' ? 'bg-blue-400 cursor-wait' : formValid ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 text-gray-600 cursor-not-allowed'} text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300`}
              >
                {status === 'sending' ? (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
                ) : null}
                {t('contactFormSubmit')}
              </button>
            </div>
          </form>

          <aside className="space-y-6">
            <div className="p-5 bg-gradient-to-br from-white to-indigo-50 dark:from-gray-900 dark:to-gray-800 rounded-xl shadow-md">
              <h3 className="font-semibold text-lg mb-2">{t('contactWaysTitle')}</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300">{t('contactWaysBody')}</p>
            </div>

            <div className="p-5 bg-white dark:bg-gray-900 rounded-xl shadow-sm">
              <h4 className="font-semibold">{t('contactResponseTitle')}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('contactResponseBody')}</p>
            </div>

            <div className="p-5 bg-white dark:bg-gray-900 rounded-xl shadow-sm">
              <h4 className="font-semibold">{t('contactHoursTitle')}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('contactHoursBody')}</p>
            </div>
          </aside>
        </div>

        <section className="mt-10">
          <h3 className="text-lg font-semibold mb-3">{t('contactFaqTitle')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <div className="font-medium mb-1">{t('contactFaqOneQ')}</div>
              <div className="text-sm text-gray-600">{t('contactFaqOneA')}</div>
            </div>
    
          </div>
        </section>
      </div>
    </main>
  )
}
