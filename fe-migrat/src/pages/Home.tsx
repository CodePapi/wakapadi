import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState, useCallback } from 'react'
import VisibilityToggle from '../components/VisibilityToggle'
import NearbyUserCard from '../components/NearbyUserCard'
import { useTranslation } from '../lib/i18n'
import { api } from '../lib/api'

export default function Home() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const debounceRef = useRef<number | null>(null)
  const [nearby, setNearby] = useState<any[]>([])
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [nearbyError, setNearbyError] = useState<string | null>(null)

  // Debounced search -> navigate to /tours?q=...
  const handleSearchChange = useCallback((value: string) => {
    setQuery(value)
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    debounceRef.current = window.setTimeout(() => {
      const trimmed = value.trim()
      if (!trimmed) return
      navigate(`/tours?q=${encodeURIComponent(trimmed)}`)
    }, 500)
  }, [navigate])

  // On first visit try to detect city and ask backend to scrape if new
  useEffect(() => {
    const reportedKey = 'wakapadi_reported_city'
    try {
      const already = window.localStorage.getItem(reportedKey)
      if (already) return
    } catch (e) {
      // ignore storage errors
    }

    if (!('geolocation' in navigator)) return

    const onSuccess = async (pos: GeolocationPosition) => {
      try {
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        const geoRes = await api.get(`/geolocation/reverse?lat=${lat}&lon=${lon}`)
        const data = geoRes.data || {}
        const address = data.address || {}
        const city = address.city || address.town || address.village || address.county || address.state
        if (!city) return
        await api.post('/scraper/new/city', { city })
        try { window.localStorage.setItem(reportedKey, city) } catch (e) {}
      } catch (err) {
        // silent
        // console.warn('City detection/report failed', err)
      }
    }

    const onError = () => {
      // fallback: IP-based lookup
      const tryIp = async () => {
        try {
          const res = await fetch('https://ipapi.co/json/')
          if (!res.ok) return
          const info = await res.json()
          const cityFromIp = info.city || info.region || info.region_code || info.country_name
          if (cityFromIp) {
            await api.post('/scraper/new/city', { city: cityFromIp })
            try { window.localStorage.setItem(reportedKey, cityFromIp) } catch (e) {}
            return
          }

          const lat = info.latitude || info.lat
          const lon = info.longitude || info.lon || info.long
          if (lat && lon) {
            try {
              const geoRes = await api.get(`/geolocation/reverse?lat=${lat}&lon=${lon}`)
              const address = geoRes.data?.address || {}
              const city = address.city || address.town || address.village || address.county || address.state
              if (city) {
                await api.post('/scraper/new/city', { city })
                try { window.localStorage.setItem(reportedKey, city) } catch (e) {}
              }
            } catch (e) {
              // ignore
            }
          }
        } catch (e) {
          // ignore
        }
      }

      tryIp()
    }

    navigator.geolocation.getCurrentPosition(onSuccess, onError, { maximumAge: 1000 * 60 * 60 * 24 })
  }, [])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setNearbyLoading(true)
      setNearbyError(null)
      try {
          const res: any = await api.get('/whois/nearby?limit=3', { cache: 'no-store' })
          const list = Array.isArray(res?.data) ? res.data : []
          if (mounted) setNearby(list)
        } catch (e) {
          console.error('Failed to load nearby shortcuts', e)
          if (mounted) setNearbyError(t('fetchError', { data: t('whoisNearby') || 'nearby users' }))
        } finally {
          if (mounted) setNearbyLoading(false)
        }
    }
    load()
    return () => { mounted = false }
  }, [])

  const highlights = [
    { title: t('homeHighlightToursTitle'), body: t('homeHighlightToursBody') },
    { title: t('homeHighlightMeetTitle'), body: t('homeHighlightMeetBody') },
    { title: t('homeHighlightBotTitle'), body: t('homeHighlightBotBody') },
  ]

  const steps = [
    { title: t('homeStepSearchTitle'), body: t('homeStepSearchBody') },
    { title: t('homeStepConnectTitle'), body: t('homeStepConnectBody') },
    { title: t('homeStepMeetTitle'), body: t('homeStepMeetBody') },
  ]

  return (
    <main aria-labelledby="home-heading" className="container mx-auto px-4 sm:px-6 lg:px-8">
      <section className="text-center max-w-3xl mx-auto py-12">
        <h1 id="home-heading" className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-gray-100">{t('homePageTitle') || t('homeTitle')}</h1>
        <p className="mt-4 text-gray-600 dark:text-gray-300">{t('homePageDescription') || t('homeSubtitle')}</p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/whois" className="inline-flex items-center justify-center px-6 py-3 rounded-md bg-gradient-to-r from-green-600 to-blue-700 text-white hover:text-white font-semibold shadow-md hover:from-green-700 hover:to-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            {t('homeIntroPrimaryCta') || t('heroCtaMeet')}
          </Link>
          <Link to="/tours" className="inline-flex items-center justify-center px-6 py-3 rounded-md bg-white dark:bg-gray-800 border text-gray-800 dark:text-gray-100 dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            {t('homeIntroSecondaryCta') || t('heroCtaExplore')}
          </Link>
        </div>

        <div className="mt-6 max-w-xl mx-auto">
          <div className="relative">
            <input
              aria-label="Search tours or locations"
              value={query}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={t('homeSearchPlaceholder') || 'Search tours or places'}
              className="w-full px-4 py-3 rounded-md border focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 dark:border-gray-700"
            />
          </div>
        </div>
      </section>

      <section className="py-12 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
        <div className="mx-auto max-w-6xl px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-semibold">{t('homeCtaTitle')}</h2>
            <p className="text-sm text-gray-600 mt-2">{t('homeCtaBody')}</p>
          </div>
          <div className="flex gap-3">
            <Link to="/whois" className="inline-flex items-center px-5 py-3 rounded-md bg-gradient-to-r from-green-600 to-blue-700 text-white font-semibold shadow-md">{t('homeCtaPrimary')}</Link>
            <Link to="/tours" className="inline-flex items-center px-5 py-3 rounded-md border bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-700">{t('homeCtaSecondary')}</Link>
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-gray-900 py-8">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {highlights.map((h) => (
              <div key={h.title} className="p-6 rounded-lg shadow-sm bg-gray-50 dark:bg-gray-800">
                <h3 className="text-lg font-semibold mb-2">{h.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">{h.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl font-semibold mb-4">{t('homeStepsTitle')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {steps.map((s, i) => (
              <div key={s.title} className="p-4 border rounded-md">
                <div className="text-2xl font-bold text-blue-600">{i + 1}</div>
                <h3 className="mt-2 font-semibold">{s.title}</h3>
                <p className="text-sm mt-1 text-gray-600">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-8 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
        <div className="mx-auto max-w-6xl px-4 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div>
            <h2 className="text-xl font-semibold">{t('homeSafetyTitle')}</h2>
            <p className="text-sm mt-2 text-gray-600">{t('homeSafetyBody')}</p>
            <div className="mt-4 flex gap-3">
              <Link to="/whois" className="inline-flex items-center px-5 py-3 rounded-md bg-gradient-to-r from-green-600 to-blue-700 text-white hover:text-white font-semibold">{t('homeIntroPrimaryCta')}</Link>
              <Link to="/tours" className="inline-flex items-center px-5 py-3 rounded-md border bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-700">{t('homeIntroSecondaryCta')}</Link>
            </div>
          </div>
          <div className="mx-auto">
            <img src="/hero-travel.png" alt="Travel" className="rounded-lg shadow-md max-w-full h-auto" />
          </div>
        </div>
      </section>

      <section className="py-8">
        <div className="mx-auto max-w-3xl px-4">
          <div className="mb-4 text-sm text-gray-600">{t('homeShortcuts')}</div>
          <div className="grid gap-3">
            <VisibilityToggle />

            {nearbyLoading && <div className="text-sm text-gray-600">{t('loadingNearby') || 'Loading nearby travelers…'}</div>}

            {!nearbyLoading && nearby.length > 0 && nearby.map((u) => (
              <NearbyUserCard key={u._id || u.id} user={u} />
            ))}

            {!nearbyLoading && nearby.length === 0 && (
              <div className="text-sm text-gray-600">{t('homeNoTravelersMessage') || 'No travelers nearby right now — try exploring tours or come back later.'}</div>
            )}

            {nearbyError && <div className="text-sm text-red-600">{nearbyError}</div>}

            <div className="pt-2">
              <Link to="/whois" className="text-sm text-blue-600 hover:underline">{t('homeViewMoreNearby') || 'View more travelers nearby'}</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
