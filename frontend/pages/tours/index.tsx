import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import Head from 'next/head';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import { api } from '../../lib/api/index';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import TourCard from '../../components/home/TourCard';
import { useRouter } from 'next/router';
import debounce from 'lodash.debounce';
import styles from '../../styles/HomePage.module.css';
import CitySearch from '../../components/search/CitySearch';
import { safeStorage } from '../../lib/storage';
import { formatCityName, normalizeCityKey } from '../../lib/cityFormat';

const PER_PAGE = 12;

export type Tour = {
  id?: string;
  _id?: string;
  title: string;
  location: string;
  recurringSchedule?: string;
  sourceUrl?: string;
  externalPageUrl?: string;
  image?: string;
  altText?: string;
};

export default function ToursPage() {
  const { t } = useTranslation('common');
  const [pageAnnounce, setPageAnnounce] = useState('');
  const [tours, setTours] = useState<Tour[]>([]);
  const [locationsList, setLocationsList] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const topRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { q } = router.query;

  const filteredTours = useMemo(() => {
    if (!tours.length) return [];
    const normalizedSearch = normalizeCityKey(search);
    return search
      ? tours.filter(
          (t) =>
            normalizeCityKey(t.location).includes(normalizedSearch) ||
            t.title.toLowerCase().includes(search.toLowerCase())
        )
      : tours;
  }, [tours, search]);

  // Derived state instead of useEffect state to fix the dependency warning
  const totalPages = useMemo(() => {
    return Math.ceil(filteredTours.length / PER_PAGE) || 1;
  }, [filteredTours.length]);

  const fetchTours = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/tours');
      const mapped = res.data.map((tour: Tour) => ({
        ...tour,
        location: formatCityName(tour.location),
      }));
      setTours(mapped);
      // derive unique sorted locations for the search dropdown
      const map = new Map<string, string>();
      mapped.forEach((tour: Tour) => {
        const key = normalizeCityKey(tour.location);
        if (!key) return;
        if (!map.has(key)) map.set(key, formatCityName(tour.location));
      });
      setLocationsList(Array.from(map.values()).sort());
    } catch (err) {
      console.error('Error fetching tours:', err);
      setError(t('fetchError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const timer = setTimeout(fetchTours, 300);
    return () => clearTimeout(timer);
  }, [fetchTours]);

  useEffect(() => {
    if (typeof q === 'string') {
      setSearch(q);
      setSuggestion(q);
      setPage(1);
    }
  }, [q]);

  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        setSearch(value);
        setPage(1);
      }, 400),
    []
  );

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const handleSearchInput = useCallback(
    (value: string) => {
      setSuggestion(value);
      debouncedSearch(value);
    },
    [debouncedSearch]
  );

  // Adjust page number if filter makes current page invalid
  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    const total = filteredTours.length;
    const start = Math.min(total === 0 ? 0 : (page - 1) * PER_PAGE + 1, total || 0);
    const end = Math.min(page * PER_PAGE, total);
    const msg = total === 0
      ? `No results for current filter.`
      : `Showing ${start} to ${end} of ${total} results. Page ${page} of ${totalPages}.`;
    setPageAnnounce(msg);
    const id = setTimeout(() => setPageAnnounce(''), 1600);
    return () => clearTimeout(id);
  }, [page, filteredTours.length, totalPages]);

  const paginatedTours = useMemo(() => {
    return filteredTours.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  }, [filteredTours, page]);

  

  const handlePageClick = useCallback((value: number) => {
    setPage(value);
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 600;
    window.scrollTo({ top: topRef.current?.offsetTop || 0, behavior: isMobile ? 'auto' : 'smooth' });
  }, []);

  const getPageWindow = useCallback((current: number, total: number, size = 5) => {
    const half = Math.floor(size / 2);
    let start = Math.max(1, current - half);
    const end = Math.min(total, start + size - 1);
    if (end - start + 1 < size) {
      start = Math.max(1, end - size + 1);
    }
    const pages: number[] = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return { pages, start, end };
  }, []);

  

  

  useEffect(() => {
    const detectAndScrapeCity = async () => {
      try {
        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          }
        );
        const { latitude, longitude } = position.coords;
        const res = await api.get(
          `/geolocation/reverse?lat=${latitude}&lon=${longitude}`
        );

        const geocode = res.data;
        const city = (geocode.address.city || geocode.address.town || '')
          .trim()
          .toLowerCase();

        if (!city) return;

        const lastScraped = safeStorage.getItem('lastScrapedCity') || '';
        if (lastScraped === city) return;

        const scrapeRes = await api.post('/scraper/new/city', { city });
        const added = Boolean(scrapeRes.data?.added);

        safeStorage.setItem('lastScrapedCity', city);

        if (added) {
          await fetchTours();
        }
      } catch (err) {
        console.warn('Skipping geolocation-based scraping', err);
      }
    };

    detectAndScrapeCity();
  }, [fetchTours]);

  return (
    <>
      <Head>
        <title>{t('toursBrowseTitle')}</title>
        <meta name="description" content={t('toursBrowseSubtitle')} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content={t('toursBrowseTitle')} />
        <meta property="og:description" content={t('toursBrowseSubtitle')} />
      </Head>
      <Layout title={t('toursBrowseTitle')}>
        <div ref={topRef} className={styles.anchor} aria-hidden="true" />
        <PageHeader
          title={t('toursBrowseTitle')}
          subtitle={t('toursBrowseSubtitle')}
        />

        <div className={styles.searchRow}>
          <CitySearch
            value={suggestion}
            onChange={(v) => handleSearchInput(v)}
            options={locationsList}
            ariaLabel={t('searchTours')}
            placeholder={t('searchPlaceholder') || 'Search by city or title'}
          />
        </div>

        <section
          className={styles.tourContainer}
          aria-labelledby="tours-section-title"
        >
          <div className={styles.srOnly} aria-live="polite">{pageAnnounce}</div>
          <h2 className={styles.sectionTitle} id="tours-section-title">
            {t('availableTours')}
          </h2>

          {error ? (
            <div className={styles.errorContainer} role="alert">
              <p style={{ color: 'var(--error-color, #b91c1c)' }}>{error}</p>
              <button
                onClick={() => window.location.reload()}
                className={styles.retryButton}
              >
                {t('retry')}
              </button>
            </div>
          ) : (
            <>
              <div className={styles.tourGrid} role="list">
                {loading
                  ? Array.from({ length: PER_PAGE }).map((_, i) => (
                      <div key={`skeleton-${i}`} className={styles.gridItem} role="listitem">
                        <div className={styles.skeletonCard} style={{ height: 380 }} />
                      </div>
                    ))
                  : paginatedTours.map((tour) => (
                      <div key={tour.id || tour._id} className={styles.gridItem} role="listitem">
                        <TourCard tour={tour} highlight={search} aria-label={t('tourCardAria', { location: tour.location })} />
                      </div>
                    ))}
              </div>

              {!loading && totalPages > 1 && (
                <div className={styles.paginationContainer}>
                  <div className={styles.paginationRoot}>
                    <div className={styles.paginationList} role="navigation" aria-label={t('paginationNavigation')}>
                        <button onClick={() => handlePageClick(1)} disabled={page === 1} aria-label={t('firstPage')}>«</button>
                        <button onClick={() => handlePageClick(Math.max(1, page - 1))} disabled={page === 1} aria-label={t('previousPage')}>{t('prev')}</button>
                        {
                          (() => {
                            const { pages, start, end } = getPageWindow(page, totalPages, 5);
                            return (
                              <>
                                {start > 1 && (
                                  <>
                                    <button onClick={() => handlePageClick(1)}>1</button>
                                    {start > 2 && <span aria-hidden="true">…</span>}
                                  </>
                                )}

                                {pages.map((p) => (
                                  <button key={p} onClick={() => handlePageClick(p)} className={page === p ? 'selected' : ''} aria-current={page === p ? 'page' : undefined}>
                                    {p}
                                  </button>
                                ))}

                                {end < totalPages && (
                                  <>
                                    {end < totalPages - 1 && <span aria-hidden="true">…</span>}
                                    <button onClick={() => handlePageClick(totalPages)}>{totalPages}</button>
                                  </>
                                )}
                              </>
                            );
                          })()
                        }
                        <button onClick={() => handlePageClick(Math.min(totalPages, page + 1))} disabled={page === totalPages} aria-label={t('nextPage')}>{t('next')}</button>
                        <button onClick={() => handlePageClick(totalPages)} disabled={page === totalPages} aria-label={t('lastPage')}>»</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {!loading && !error && filteredTours.length === 0 && (
            <div className={styles.noResults} role="alert">
              <h3 className={styles.noResultsText}>{t('noToursFound')}</h3>
              {search && (
                <button
                  onClick={() => {
                    setSearch('');
                    setSuggestion('');
                  }}
                  className={styles.clearSearchButton}
                >
                  {t('clearSearch')}
                </button>
              )}
            </div>
          )}
        </section>
      </Layout>
    </>
  );
}

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}