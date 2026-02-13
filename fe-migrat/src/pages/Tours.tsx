import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import CitySearch from '../components/CitySearch'
import TourCard from '../components/TourCard'
import { api } from '../lib/api'
import { safeStorage } from '../lib/storage'

export default function Tours() {
  const [q, setQ] = useState('')
  const [tours, setTours] = useState<any[]>([])
  const [locationsList, setLocationsList] = useState<string[]>([])
  const [sourceList, setSourceList] = useState<string[]>([])
  const [sourceFilter, setSourceFilter] = useState<string>('')
  const [recurringOnly, setRecurringOnly] = useState(false)
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
      const map = new Map<string, string>()
      data.forEach((t: any) => {
        const loc = (t.location || '').trim()
        if (!loc) return
        if (!map.has(loc)) map.set(loc, loc)
      })
      setLocationsList(Array.from(map.values()).sort())
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

  return (
    <section aria-labelledby="tours-heading" className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div ref={topRef} />
      <h2 id="tours-heading" className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Tours</h2>
      <p className="mt-3 text-gray-600 dark:text-gray-300">Discover curated local experiences.</p>

      <div className="mt-4">
        <CitySearch value={q} onChange={setQ} options={locationsList} placeholder="Search by city or title" ariaLabel="Search tours" />
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <label className="text-sm text-gray-600">Filter:</label>
          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="px-3 py-1 border rounded">
            <option value="">All Sources</option>
            {sourceList.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={recurringOnly} onChange={(e) => setRecurringOnly(e.target.checked)} /> Recurring only
          </label>
        </div>
      </div>

      <div className="mt-6">
        {error && (
          <div role="alert" className="text-red-700 mb-4">{error}</div>
        )}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-4 border rounded-md animate-pulse bg-gray-100 h-48" />
            ))}
          </div>
        ) : (
          (() => {
            let results = filtered.slice()
            if (sourceFilter) results = results.filter((r) => {
              const src = (r.sourceUrl || r.externalPageUrl || '').toString()
              try { return new URL(src).hostname.replace(/^www\./, '') === sourceFilter } catch { return false }
            })
            if (recurringOnly) results = results.filter((r) => Boolean(r.recurringSchedule))

            if (results.length === 0) {
              return (
                <div className="p-6 text-center text-gray-600">
                  <div className="text-lg font-medium">No tours match your filters</div>
                  <div className="mt-2">Try clearing filters or searching a different city.</div>
                  <div className="mt-4 flex justify-center gap-3">
                    <button onClick={() => { setSourceFilter(''); setRecurringOnly(false) }} className="px-4 py-2 border rounded">Clear filters</button>
                    <button onClick={fetchTours} className="px-4 py-2 bg-white border rounded">Refresh tours</button>
                    <a href="/whois" className="px-4 py-2 bg-blue-600 text-white rounded">See who's nearby</a>
                  </div>
                </div>
              )
            }

            return (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((t, i) => (
                  <TourCard key={t._id || t.id || i} tour={t} highlight={q} />
                ))}
              </div>
            )
          })()
        )}
      </div>
    </section>
  )
}
