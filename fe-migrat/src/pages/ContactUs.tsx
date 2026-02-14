import { useState } from 'react'
import { api } from '../lib/api'
import { useTranslation } from '../lib/i18n'

export default function ContactUs() {
  const { t } = useTranslation()
  const [form, setForm] = useState({ name: '', email: '', type: 'inquiry', message: '' })
  const [status, setStatus] = useState<'idle'|'sending'|'success'|'error'>('idle')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    try {
      await api.post('/contact', { ...form })
      setStatus('success')
      setForm({ name: '', email: '', type: 'inquiry', message: '' })
    } catch (err) {
      console.error('contact submit failed', err)
      setStatus('error')
    }
  }

  return (
    <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-white">{t('contactTitle')}</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">{t('contactHeroBody')}</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <form onSubmit={handleSubmit} className="md:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm text-gray-900 dark:text-gray-100">
            <h2 className="text-lg font-medium mb-2">{t('contactFormTitle')}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{t('contactSubtitle')}</p>

            <label className="block mb-3">
              <div className="text-sm mb-1">{t('contactFormNameLabel')}</div>
              <input id="name" name="name" required value={form.name} onChange={handleChange} className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </label>

            <label className="block mb-3">
              <div className="text-sm mb-1">{t('contactFormEmailLabel')}</div>
              <input id="email" name="email" type="email" required value={form.email} onChange={handleChange} className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </label>

            <label className="block mb-3">
              <div className="text-sm mb-1">{t('contactFormTypeLabel')}</div>
              <select id="type" name="type" value={form.type} onChange={handleChange} className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="inquiry">{t('contactFormTypeInquiry')}</option>
                <option value="complaint">{t('contactFormTypeComplaint')}</option>
                <option value="feedback">{t('contactFormTypeFeedback')}</option>
                <option value="suggestion">{t('contactFormTypeSuggestion')}</option>
                <option value="other">{t('contactFormTypeOther')}</option>
              </select>
            </label>

            <label className="block mb-4">
              <div className="text-sm mb-1">{t('contactFormMessageLabel')}</div>
              <textarea id="message" name="message" required value={form.message} onChange={handleChange} rows={6} className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </label>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={status === 'sending'}
                aria-busy={status === 'sending'}
                className={`px-5 py-2 rounded-md font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 ${status === 'sending' ? 'bg-blue-400 text-white cursor-wait' : 'bg-blue-600 text-white'}`}>
                {t('contactFormSubmit')}
              </button>
              <div aria-live="polite" className="min-h-[1.25rem]">
                {status === 'sending' && <span className="text-sm text-gray-600 dark:text-gray-300">{t('contactFormStatusSending')}</span>}
                {status === 'success' && <span className="text-sm text-green-600">{t('contactFormStatusSuccess')}</span>}
                {status === 'error' && <span className="text-sm text-red-600">{t('contactFormStatusError')}</span>}
              </div>
            </div>
          </form>

          <aside className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded text-gray-900 dark:text-gray-100">
              <h3 className="font-semibold">{t('contactWaysTitle')}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">{t('contactWaysBody')}</p>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded text-gray-900 dark:text-gray-100">
              <h3 className="font-semibold">{t('contactResponseTitle')}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">{t('contactResponseBody')}</p>
            </div>
          </aside>
        </div>

        <section className="mt-8">
          <h3 className="text-lg font-semibold">{t('contactFaqTitle')}</h3>
          <div className="mt-3 space-y-3">
            <div>
              <div className="font-medium">{t('contactFaqOneQ')}</div>
              <div className="text-sm text-gray-600">{t('contactFaqOneA')}</div>
            </div>
            <div>
              <div className="font-medium">{t('contactFaqTwoQ')}</div>
              <div className="text-sm text-gray-600">{t('contactFaqTwoA')}</div>
            </div>
            <div>
              <div className="font-medium">{t('contactFaqThreeQ')}</div>
              <div className="text-sm text-gray-600">{t('contactFaqThreeA')}</div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
