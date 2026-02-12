import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  Pagination,
  Skeleton,
  Container,
} from '@mui/material';
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
import HeroSection from '../../components/home/HeroSection';
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
  const [tours, setTours] = useState<Tour[]>([]);
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
      setTours(
        res.data.map((tour: Tour) => ({
          ...tour,
          location: formatCityName(tour.location),
        }))
      );
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

  const paginatedTours = useMemo(() => {
    return filteredTours.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  }, [filteredTours, page]);

  const handlePageChange = useCallback(
    (_: React.ChangeEvent<unknown>, value: number) => {
      setPage(value);
      window.scrollTo({
        top: topRef.current?.offsetTop || 0,
        behavior: 'smooth',
      });
    },
    []
  );

  const locations = useMemo(() => {
    const map = new Map<string, string>();
    tours.forEach((tour) => {
      const key = normalizeCityKey(tour.location);
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, formatCityName(tour.location));
      }
    });
    return Array.from(map.values());
  }, [tours]);

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
        <HeroSection
          locations={locations}
          onSearch={handleSearchInput}
          initialValue={typeof q === 'string' ? q : ''}
          suggestion={suggestion}
        />

        <Container
          maxWidth="lg"
          className={styles.tourContainer}
          component="section"
          aria-labelledby="tours-section-title"
        >
          <Typography
            variant="h2"
            className={styles.sectionTitle}
            component="h2"
            id="tours-section-title"
          >
            {t('availableTours')}
          </Typography>

          {error ? (
            <Box className={styles.errorContainer} role="alert">
              <Typography color="error">{error}</Typography>
              <Button
                variant="outlined"
                onClick={() => window.location.reload()}
                className={styles.retryButton}
              >
                {t('retry')}
              </Button>
            </Box>
          ) : (
            <>
              <div className={styles.tourGrid} role="list">
                {loading
                  ? Array.from({ length: PER_PAGE }).map((_, i) => (
                      <div
                        key={`skeleton-${i}`}
                        className={styles.gridItem}
                        role="listitem"
                      >
                        <Skeleton
                          variant="rectangular"
                          className={styles.skeletonCard}
                          height={380}
                        />
                      </div>
                    ))
                  : paginatedTours.map((tour) => (
                      <div
                        key={tour.id || tour._id}
                        className={styles.gridItem}
                        role="listitem"
                      >
                        <TourCard
                          tour={tour}
                          highlight={search}
                          aria-label={t('tourCardAria', { location: tour.location })}
                        />
                      </div>
                    ))}
              </div>

              {!loading && totalPages > 1 && (
                <Box className={styles.paginationContainer}>
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={handlePageChange}
                    color="primary"
                    shape="rounded"
                    siblingCount={1}
                    boundaryCount={1}
                    showFirstButton
                    showLastButton
                    aria-label={t('paginationNavigation')}
                    classes={{
                      root: styles.paginationRoot,
                      ul: styles.paginationList,
                    }}
                  />
                </Box>
              )}
            </>
          )}

          {!loading && !error && filteredTours.length === 0 && (
            <Box className={styles.noResults} role="alert">
              <Typography variant="h5" className={styles.noResultsText}>
                {t('noToursFound')}
              </Typography>
              {search && (
                <Button
                  variant="text"
                  onClick={() => {
                    setSearch('');
                    setSuggestion('');
                  }}
                  className={styles.clearSearchButton}
                >
                  {t('clearSearch')}
                </Button>
              )}
            </Box>
          )}
        </Container>
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