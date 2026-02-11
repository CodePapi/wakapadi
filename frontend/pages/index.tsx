import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  Pagination,
  Skeleton,
  Container,
  Stack,
} from '@mui/material';
import Head from 'next/head';
import Layout from '../components/Layout';
import { api } from '../lib/api/index';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import HeroSection from '../components/home/HeroSection';
import TourCard from '../components/home/TourCard';
import { useRouter } from 'next/router';
import debounce from 'lodash.debounce';
import styles from '../styles/HomePage.module.css';
import { safeStorage } from '../lib/storage';
import { formatCityName, normalizeCityKey } from '../lib/cityFormat';

const PER_PAGE = 12;

export type Tour = {
  id: string;
  title: string;
  location: string;
  recurringSchedule?: string;
  sourceUrl?: string;
  externalPageUrl?: string;
  image?: string;
  altText?: string;
};

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
    const normalizedSearch = normalizeCityKey(search);
    return search
      ? tours.filter(
          (t) =>
            normalizeCityKey(t.location).includes(normalizedSearch) ||
            t.title.toLowerCase().includes(search.toLowerCase())
        )
      : tours;
  }, [tours, search]);

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

  const handleScrollToTop = useCallback(() => {
    if (typeof window === 'undefined') return;
    const target = document.getElementById('tours-section-title');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

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

  const highlights = [
    {
      title: t('homeHighlightToursTitle'),
      body: t('homeHighlightToursBody'),
    },
    {
      title: t('homeHighlightMeetTitle'),
      body: t('homeHighlightMeetBody'),
    },
    {
      title: t('homeHighlightBotTitle'),
      body: t('homeHighlightBotBody'),
    },
  ];

  const steps = [
    {
      title: t('homeStepSearchTitle'),
      body: t('homeStepSearchBody'),
    },
    {
      title: t('homeStepConnectTitle'),
      body: t('homeStepConnectBody'),
    },
    {
      title: t('homeStepMeetTitle'),
      body: t('homeStepMeetBody'),
    },
  ];

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
        <title>{t('homePageTitle')}</title>
        <meta name="description" content={t('homePageDescription')} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content={t('homePageTitle')} />
        <meta property="og:description" content={t('homePageDescription')} />
      </Head>
      <Layout title={t('homePageTitle')}>
        <div ref={topRef} className={styles.anchor} aria-hidden="true" />
        <HeroSection
          locations={locations}
          onSearch={handleSearchInput}
          initialValue={typeof q === 'string' ? q : ''}
          suggestion={suggestion}
        />

        <section className={styles.introSection}>
          <Container maxWidth="lg">
            <div className={styles.introGrid}>
              <div className={styles.introCopy}>
                <Typography variant="h2" className={styles.introTitle}>
                  {t('homeIntroTitle')}
                </Typography>
                <Typography className={styles.introText}>
                  {t('homeIntroBody')}
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Button
                    variant="contained"
                    color="primary"
                    className={styles.primaryAction}
                    onClick={() => router.push('/whois')}
                  >
                    {t('homeIntroPrimaryCta')}
                  </Button>
                  <Button
                    variant="outlined"
                    className={styles.secondaryAction}
                    onClick={() => router.push('/chatbot')}
                  >
                    {t('homeIntroSecondaryCta')}
                  </Button>
                </Stack>
              </div>
              <div className={styles.introCard}>
                <Typography variant="h3" className={styles.introCardTitle}>
                  {t('homeSafetyTitle')}
                </Typography>
                <Typography className={styles.introCardText}>
                  {t('homeSafetyBody')}
                </Typography>
              </div>
            </div>
          </Container>
        </section>

        <section className={styles.highlightsSection}>
          <Container maxWidth="lg">
            <Typography variant="h2" className={styles.sectionTitle}>
              {t('homeHighlightsTitle')}
            </Typography>
            <div className={styles.highlightGrid}>
              {highlights.map((item) => (
                <div key={item.title} className={styles.highlightCard}>
                  <Typography variant="h3" className={styles.highlightTitle}>
                    {item.title}
                  </Typography>
                  <Typography className={styles.highlightText}>
                    {item.body}
                  </Typography>
                </div>
              ))}
            </div>
          </Container>
        </section>

        <section className={styles.stepsSection}>
          <Container maxWidth="lg">
            <Typography variant="h2" className={styles.sectionTitle}>
              {t('homeStepsTitle')}
            </Typography>
            <div className={styles.stepsGrid}>
              {steps.map((step, index) => (
                <div key={step.title} className={styles.stepCard}>
                  <div className={styles.stepNumber}>{index + 1}</div>
                  <Typography variant="h3" className={styles.stepTitle}>
                    {step.title}
                  </Typography>
                  <Typography className={styles.stepText}>
                    {step.body}
                  </Typography>
                </div>
              ))}
            </div>
          </Container>
        </section>

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
                        key={tour.id}
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
                  onClick={() => setSearch('')}
                  className={styles.clearSearchButton}
                >
                  {t('clearSearch')}
                </Button>
              )}
            </Box>
          )}
        </Container>

        <section className={styles.ctaSection}>
          <Container maxWidth="lg" className={styles.ctaInner}>
            <div>
              <Typography variant="h2" className={styles.ctaTitle}>
                {t('homeCtaTitle')}
              </Typography>
              <Typography className={styles.ctaText}>
                {t('homeCtaBody')}
              </Typography>
            </div>
            <div className={styles.ctaActions}>
              <Button
                variant="contained"
                color="primary"
                className={styles.primaryAction}
                onClick={() => router.push('/whois')}
              >
                {t('homeCtaPrimary')}
              </Button>
              <Button
                variant="outlined"
                className={styles.secondaryAction}
                onClick={handleScrollToTop}
              >
                {t('homeCtaSecondary')}
              </Button>
            </div>
          </Container>
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
