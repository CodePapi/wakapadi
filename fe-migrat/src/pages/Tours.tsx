import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from '../lib/i18n'
import CitySearch from '../components/CitySearch'
import TourCard from '../components/TourCard'
import { api } from '../lib/api'
import { safeStorage } from '../lib/storage'

export default function Tours() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { t } = useTranslation()

  const [q, setQ] = useState(() => searchParams.get('q') || '')
  const PER_PAGE = 12
  const [page, setPage] = useState(() => {
    const p = Number(searchParams.get('page') || '1')
    return Number.isInteger(p) && p > 0 ? p : 1
  })
  const [pageAnnounce, setPageAnnounce] = useState('')
  const [tours, setTours] = useState<any[]>([])
  const [locationsList, setLocationsList] = useState<string[]>([])
  const [sourceList, setSourceList] = useState<string[]>([])
  const [sourceFilter, setSourceFilter] = useState<string>(() => searchParams.get('src') || '')
  const [recurringOnly, setRecurringOnly] = useState<boolean>(() => (searchParams.get('rec') === '1'))
  const [savedOnly, setSavedOnly] = useState<boolean>(() => (searchParams.get('saved') === '1'))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const topRef = useRef<HTMLDivElement | null>(null)

  const fetchTours = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res: any = await api.get('/tours', { cache: 'no-store' })
      const data = Array.isArray(res?.data) ? res.data : []
      setTours(data)
      // build a case-insensitive deduped list and title-case entries
      const titleCase = (s: string) => s.split(/\s+/).map(w => w ? (w[0].toUpperCase() + w.slice(1)) : w).join(' ')
      const map = new Map<string, string>()
      data.forEach((t: any) => {
        const raw = (t.location || '').trim()
        if (!raw) return
        const key = raw.toLowerCase()
        if (!map.has(key)) map.set(key, titleCase(raw))
      })
      setLocationsList(Array.from(map.values()).sort((a, b) => a.localeCompare(b)))
        // collect sources
        const sources = new Set<string>()
        data.forEach((t: any) => {
          const src = (t.sourceUrl || t.externalPageUrl || '')
          try { if (src) sources.add(new URL(src).hostname.replace(/^www\./, '')) } catch {}
        })
        setSourceList(Array.from(sources).sort())
    } catch (err: any) {
      console.error('fetchTours error', err)
      setError(err?.message || 'Failed to load tours')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(fetchTours, 200)
    return () => clearTimeout(t)
  }, [fetchTours])

  // Removed effect that forced selection from dropdown to allow free text search

  // keep filters/page in the URL so they're persistent/shareable
  useEffect(() => {
    const params: Record<string, string> = {}
    if (q) params.q = q
    if (sourceFilter) params.src = sourceFilter
    if (recurringOnly) params.rec = '1'
    if (savedOnly) params.saved = '1'
    if (page && page > 1) params.page = String(page)
    setSearchParams(params, { replace: true })
  }, [q, sourceFilter, recurringOnly, savedOnly, page, setSearchParams])
  

  // detect & scrape city via geolocation (non-blocking)
  useEffect(() => {
    const detectAndScrapeCity = async () => {
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej))
        const { latitude, longitude } = pos.coords
        const geo: any = await api.get(`/geolocation/reverse?lat=${latitude}&lon=${longitude}`)
        const city = (geo?.data?.address?.city || geo?.data?.address?.town || '').trim().toLowerCase()
        if (!city) return
        const last = safeStorage.getItem('lastScrapedCity') || ''
        if (last === city) return
        const scrape = await api.post('/scraper/new/city', { city })
        const added = Boolean(scrape?.data?.added)
        safeStorage.setItem('lastScrapedCity', city)
        if (added) await fetchTours()
      } catch (err) {
        // ignore geolocation errors
      }
    }
    detectAndScrapeCity()
  }, [fetchTours])

  const filtered = useMemo(() => {
    if (!q) return tours
    const s = q.toLowerCase()
    return tours.filter((t) => ((t.location || '').toLowerCase().includes(s) || (t.title || '').toLowerCase().includes(s)))
  }, [tours, q])

  // total count after applying source/recurring filters (used for announcements)
  const totalFiltered = useMemo(() => {
    let results = filtered.slice()
    if (sourceFilter) results = results.filter((r) => {
      const src = (r.sourceUrl || r.externalPageUrl || '').toString()
      try { return new URL(src).hostname.replace(/^www\./, '') === sourceFilter } catch { return false }
    })
    if (recurringOnly) results = results.filter((r) => Boolean(r.recurringSchedule))
    if (savedOnly) {
      try {
        const raw = safeStorage.getItem('saved_tours_v1')
        const arr = raw ? JSON.parse(raw) as string[] : []
        results = results.filter((r) => {
          const key = r.externalPageUrl || r.sourceUrl || r.title
          return arr.includes(key)
        })
      } catch { /* ignore */ }
    }
    return results.length
  }, [filtered, sourceFilter, recurringOnly, savedOnly])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalFiltered / PER_PAGE)), [totalFiltered])

  useEffect(() => {
    const total = totalFiltered
    const start = total === 0 ? 0 : (page - 1) * PER_PAGE + 1
    const end = Math.min(page * PER_PAGE, total)
    const msg = total === 0
      ? `No results for current filter.`
      : `Showing ${start} to ${end} of ${total} results. Page ${page} of ${totalPages}.`
    setPageAnnounce(msg)
    const id = setTimeout(() => setPageAnnounce(''), 1600)
    return () => clearTimeout(id)
  }, [page, totalFiltered, totalPages])

  

  // apply source & recurring filters to compute results and current window
  const results = useMemo(() => {
    let res = filtered.slice()
    if (sourceFilter) res = res.filter((r) => {
      const src = (r.sourceUrl || r.externalPageUrl || '').toString()
      try { return new URL(src).hostname.replace(/^www\./, '') === sourceFilter } catch { return false }
    })
    if (recurringOnly) res = res.filter((r) => Boolean(r.recurringSchedule))
    if (savedOnly) {
      try {
        const raw = safeStorage.getItem('saved_tours_v1')
        const arr = raw ? JSON.parse(raw) as string[] : []
        res = res.filter((r) => {
          const key = r.externalPageUrl || r.sourceUrl || r.title
          return arr.includes(key)
        })
      } catch { /* ignore */ }
    }
    return res
  }, [filtered, sourceFilter, recurringOnly, savedOnly])

  const windowed = useMemo(() => {
    const start = (page - 1) * PER_PAGE
    return results.slice(start, start + PER_PAGE)
  }, [results, page])

  return (
    <section aria-labelledby="tours-heading" className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div ref={topRef} />
      <h2 id="tours-heading" className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{t('toursTitle') || 'Tours'}</h2>
      <p className="mt-3 text-gray-600 dark:text-gray-300">{t('toursSubtitle') || 'Discover curated local experiences.'}</p>

        <div className="mt-4">
        <CitySearch value={q} onChange={(v) => { setQ(v); setPage(1) }} options={locationsList} placeholder={t('searchPlaceholder') || 'Search by city or title'} ariaLabel={t('searchTours') || 'Search tours'} />
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <label className="text-sm text-gray-600">{t('filtersLabel') || 'Filter:'}</label>
          <select value={sourceFilter} onChange={(e) => { setSourceFilter(e.target.value); setPage(1) }} className="px-3 py-1 border rounded">
            <option value="">{t('allSources') || 'All Sources'}</option>
            {sourceList.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={recurringOnly} onChange={(e) => { setRecurringOnly(e.target.checked); setPage(1) }} /> {t('recurringOnly') || 'Recurring only'}
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={savedOnly} onChange={(e) => { setSavedOnly(e.target.checked); setPage(1) }} /> Saved only
          </label>
          <button onClick={() => { setSourceFilter(''); setRecurringOnly(false); setQ(''); setPage(1); }} className="text-sm text-gray-600 underline">{t('clearFilters') || 'Clear filters'}</button>
        </div>
      </div>

      <div className="mt-6">
        {error && (
          <div role="alert" className="text-red-700 mb-4">{error}</div>
        )}

            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: Math.min(PER_PAGE, 12) }).map((_, i) => (
                  <div key={i} className="p-2">
                    <div className="h-full rounded-lg overflow-hidden bg-white border shadow-sm animate-pulse">
                      <div className="w-full bg-gray-100 h-44" />
                      <div className="p-4">
                        <div className="h-4 bg-gray-200 rounded mb-2 w-3/4" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
        ) : (
          results.length === 0 ? (
            <div className="p-6 text-center text-gray-600">
              <div className="text-lg font-medium">No tours match your filters</div>
              <div className="mt-2">Try clearing filters or searching a different city.</div>
              <div className="mt-4 flex justify-center gap-3">
                <button onClick={() => { setSourceFilter(''); setRecurringOnly(false) }} className="px-4 py-2 border rounded">Clear filters</button>
                <button onClick={fetchTours} className="px-4 py-2 bg-white border rounded">Refresh tours</button>
                <a href="/whois" className="px-4 py-2 bg-blue-600 text-white rounded">See who's nearby</a>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {windowed.map((t, i) => (
                  <TourCard key={t._id || t.id || i} tour={t} highlight={q} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-6" role="navigation" aria-label="Pagination">
                  <div className="overflow-auto px-2">
                    <div className="inline-flex items-center gap-2 whitespace-nowrap">
                      <button onClick={() => { setPage(1); window.scrollTo({ top: topRef.current?.offsetTop || 0, behavior: 'smooth' }) }} disabled={page === 1} aria-label="First">«</button>
                      <button onClick={() => { setPage(Math.max(1, page - 1)); window.scrollTo({ top: topRef.current?.offsetTop || 0, behavior: 'smooth' }) }} disabled={page === 1} aria-label="Previous">Prev</button>
                      {(() => {
                        const size = 5
                        const half = Math.floor(size / 2)
                        let start = Math.max(1, page - half)
                        let end = Math.min(totalPages, start + size - 1)
                        if (end - start + 1 < size) start = Math.max(1, end - size + 1)
                        const pages: number[] = []
                        for (let i = start; i <= end; i++) pages.push(i)
                        return (
                          <>
                            {start > 1 && (
                              <>
                                <button onClick={() => { setPage(1); window.scrollTo({ top: topRef.current?.offsetTop || 0, behavior: 'smooth' }) }}>1</button>
                                {start > 2 && <span aria-hidden>…</span>}
                              </>
                            )}

                            {pages.map((p) => (
                              <button key={p} onClick={() => { setPage(p); window.scrollTo({ top: topRef.current?.offsetTop || 0, behavior: 'smooth' }) }} aria-current={page === p ? 'page' : undefined} className={page === p ? 'font-semibold underline' : ''}>{p}</button>
                            ))}

                            {end < totalPages && (
                              <>
                                {end < totalPages - 1 && <span aria-hidden>…</span>}
                                <button onClick={() => { setPage(totalPages); window.scrollTo({ top: topRef.current?.offsetTop || 0, behavior: 'smooth' }) }}>{totalPages}</button>
                              </>
                            )}
                          </>
                        )
                      })()}
                      <button onClick={() => { setPage(Math.min(totalPages, page + 1)); window.scrollTo({ top: topRef.current?.offsetTop || 0, behavior: 'smooth' }) }} disabled={page === totalPages} aria-label="Next">Next</button>
                      <button onClick={() => { setPage(totalPages); window.scrollTo({ top: topRef.current?.offsetTop || 0, behavior: 'smooth' }) }} disabled={page === totalPages} aria-label="Last">»</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )
        )}

          {/* aria-live announcement for screen readers */}
          <div className="sr-only" aria-live="polite">{pageAnnounce}</div>
      </div>
    </section>
  )
}
