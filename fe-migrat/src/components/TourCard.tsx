import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from '../lib/i18n'

type Tour = {
  title: string;
  image?: string | null;
  altText?: string | null;
  location: string;
  recurringSchedule?: string | null;
  sourceUrl?: string | null;
  externalPageUrl?: string | null;
};

const getSourceLabel = (sourceUrl?: string) => {
  if (!sourceUrl) return '';
  try { return new URL(sourceUrl).hostname.replace(/^www\./, ''); } catch { return ''; }
};

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export default function TourCard({ tour, highlight }: { tour: Tour; highlight?: string }) {
  const sourceLabel = getSourceLabel(tour.sourceUrl ?? undefined);
  const savedKey = 'saved_tours_v1'

  const getSavedInitial = () => {
    try {
      const raw = localStorage.getItem(savedKey)
      if (!raw) return false
      const arr = JSON.parse(raw) as string[]
      return arr.includes(tour.externalPageUrl || tour.sourceUrl || tour.title)
    } catch { return false }
  }

  const [isSaved, setIsSaved] = useState<boolean>(getSavedInitial)

  useEffect(() => {
    const onChange = () => setIsSaved(getSavedInitial())
    window.addEventListener('wakapadi:savedTours:changed', onChange as EventListener)
    return () => window.removeEventListener('wakapadi:savedTours:changed', onChange as EventListener)
  }, [])

  const toggleSave = () => {
    try {
      const raw = localStorage.getItem(savedKey)
      const arr = raw ? (JSON.parse(raw) as string[]) : []
      const key = tour.externalPageUrl || tour.sourceUrl || tour.title
      const next = arr.includes(key) ? arr.filter((s) => s !== key) : [key, ...arr]
      localStorage.setItem(savedKey, JSON.stringify(next))
      setIsSaved(next.includes(key))
      window.dispatchEvent(new CustomEvent('wakapadi:savedTours:changed'))
    } catch (e) { console.warn('save failed', e) }
  }

  const { t } = useTranslation()

  // Share feature temporarily disabled; removed from UI per request

  const renderTitle = () => {
    const safeTitle = tour.title || ''
    if (!highlight) return <span className="break-words">{safeTitle}</span>
    try {
      const esc = escapeRegExp(highlight)
      const re = new RegExp(esc, 'ig')
      const html = safeTitle.replace(re, (m) => `<mark class='bg-yellow-100 rounded px-0.5'>${m}</mark>`)
      return <span dangerouslySetInnerHTML={{ __html: html }} className="break-words" />
    } catch (e) {
      return <span className="break-words">{safeTitle}</span>
    }
  }

  const parseSchedule = (s?: string | null) => {
    if (!s) return [] as string[]
    // Normalize separators and remove noisy "+N More" tokens
    const cleaned = s.replace(/\s*\+\s*/g, ',')
    const parts = cleaned.split(/[;,]+|,/).map(p => p.trim()).filter(Boolean)
    const filtered = parts.filter(p => !/^\+?\d+\s*more$/i.test(p) && !/^more$/i.test(p))
    return filtered
  }

  const scheduleItems = useMemo(() => parseSchedule(tour.recurringSchedule), [tour.recurringSchedule])

  const capitalizeWords = (s: string) => s.split(/\s+/).map(w => w ? (w[0].toUpperCase() + w.slice(1)) : w).join(' ')
  const locationDisplay = tour.location ? capitalizeWords(String(tour.location).trim()) : ''

  return (
    <article className="h-full p-2" tabIndex={0} aria-label={`${tour.title} — ${tour.location}`}>
      <div className="flex flex-col h-full rounded-lg overflow-hidden bg-white border shadow-sm hover:shadow-md focus-within:ring-2 focus-within:ring-blue-300 transition-transform transform-gpu hover:-translate-y-0.5">
        <div className="w-full relative bg-gray-100" style={{minHeight: 160}}>
          {tour.image ? (
            <img loading="lazy" decoding="async" src={tour.image} alt={tour.altText || tour.title} className="object-cover w-full h-full object-center" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" className="text-gray-300" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          )}
          {sourceLabel && <div className="absolute left-2 bottom-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">{sourceLabel}</div>}
          {scheduleItems.length > 0 && (
            <div className="absolute right-2 bottom-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">{scheduleItems[0] || (t('tourRecurringLabel') || 'Recurring')}</div>
          )}
        </div>

        <div className="p-4 flex-1 flex flex-col">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 leading-tight overflow-hidden" style={{display: '-webkit-box', WebkitLineClamp: 2 as any, WebkitBoxOrient: 'vertical' as any}}>
            {renderTitle()}
          </h3>
          <div className="mt-2 text-sm text-gray-500 truncate">{locationDisplay}</div>
            <div className="mt-4 mt-auto flex items-center justify-end gap-2">
            <div className="flex gap-2 justify-end w-44 sm:w-52 md:w-56 mb-2">
              {tour.externalPageUrl && (
                <a href={tour.externalPageUrl} target="_blank" rel="noreferrer" className="flex-1 h-9 flex items-center justify-center text-sm leading-tight rounded-md bg-transparent text-gray-700 border border-gray-200 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-offset-1 dark:bg-transparent dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800" aria-label={t('tourOpenAria') || 'Open source page'}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-2 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  {t('tourOpen') || 'Open'}
                </a>
              )}
              <button onClick={toggleSave} className={`flex-1 h-9 flex items-center justify-center text-sm leading-tight rounded-md border focus:outline-none focus:ring-2 focus:ring-offset-1 ${isSaved ? 'bg-yellow-100 border-yellow-200' : 'bg-white hover:bg-gray-50'}`} aria-pressed={isSaved} aria-label={isSaved ? (t('tourUnsaveAria') || 'Unsave tour') : (t('tourSaveAria') || 'Save tour')}>
                <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 mr-2 flex-shrink-0 ${isSaved ? 'text-yellow-600' : 'text-gray-600'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                {isSaved ? (t('tourSaved') || 'Saved') : (t('tourSave') || 'Save')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
