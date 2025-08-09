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
import { api } from '../../lib/api/index';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import TourCard from '../../components/home/TourCard';
import { useRouter } from 'next/router';
import debounce from 'lodash.debounce';
import styles from '../../styles/HomePage.module.css';
import HeroSection from '../../components/home/HeroSection';
import { Tour } from '..';

const PER_PAGE = 12;

export default function HomePage() {
  const { t } = useTranslation('common');
  const [tours, setTours] = useState<Tour[]>([]);
  const [search, setSearch] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const topRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { q } = router.query;

  const filteredTours = useMemo(() => {
    if (!tours.length) return [];
    return search
      ? tours.filter(
          (t) =>
            t.location.toLowerCase().includes(search.toLowerCase()) ||
            t.title.toLowerCase().includes(search.toLowerCase())
        )
      : tours;
  }, [tours, search]);

  const fetchTours = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/tours');
      setTours(res.data);
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

  const handleSearchInput = useCallback(
    (value: string) => {
      setSuggestion(value);
      debouncedSearch(value);
    },
    [debouncedSearch]
  );

  useEffect(() => {
    setTotalPages(Math.ceil(filteredTours.length / PER_PAGE) || 1);
    if (page > totalPages && totalPages > 0) {
      setPage(totalPages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredTours, page]);

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

  const locations = useMemo(
    () => [...new Set(tours.map((t) => t.location))],
    [tours]
  );

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
        await api.post('/scraper/new/city', { city });
        const result = await res.data;
        if (result) await fetchTours();
      } catch (err) {
        console.warn('Skipping geolocation-based scraping', err);
      }
    };

    detectAndScrapeCity();
  }, [fetchTours]);

  return (
    <>
      <Head>
        <title>{t('homePageTitle')}</title>
        <meta name='description' content={t('homePageDescription')} />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <meta name='robots' content='index, follow' />
        <meta property='og:title' content={t('homePageTitle')} />
        <meta property='og:description' content={t('homePageDescription')} />
      </Head>
      <Layout title={t('homePageTitle')}>
        <div ref={topRef} className={styles.anchor} aria-hidden='true' />
        <HeroSection
          locations={locations}
          onSearch={handleSearchInput}
          initialValue={typeof q === 'string' ? q : ''}
          suggestion={suggestion}
        />

        <Container
          maxWidth='lg'
          className={styles.tourContainer}
          component='section'
          aria-labelledby='tours-section-title'
        >
          <Typography
            variant='h2'
            className={styles.sectionTitle}
            component='h2'
            id='tours-section-title'
          >
            {t('availableTours')}
          </Typography>

          {error ? (
            <Box className={styles.errorContainer} role='alert'>
              <Typography color='error'>{error}</Typography>
              <Button
                variant='outlined'
                onClick={() => window.location.reload()}
                className={styles.retryButton}
              >
                {t('retry')}
              </Button>
            </Box>
          ) : (
            <>
              <div className={styles.tourGrid} role='list'>
                {loading
                  ? Array.from({ length: PER_PAGE }).map((_, i) => (
                      <div
                        key={`skeleton-${i}`}
                        className={styles.gridItem}
                        role='listitem'
                      >
                        <Skeleton
                          variant='rectangular'
                          className={styles.skeletonCard}
                          height={380}
                        />
                      </div>
                    ))
                  : paginatedTours.map((tour) => (
                      <div
                        key={tour._id}
                        className={styles.gridItem}
                        role='listitem'
                      >
                        <TourCard
                          tour={tour}
                          highlight={search}
                          aria-label={`Tour to ${tour.location}`}
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
                    color='primary'
                    shape='rounded'
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
            <Box className={styles.noResults} role='alert'>
              <Typography variant='h5' className={styles.noResultsText}>
                {t('noToursFound')}
              </Typography>
              {search && (
                <Button
                  variant='text'
                  onClick={() => setSearch('')}
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
