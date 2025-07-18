import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  Pagination,
  Skeleton,
  Container,
  Card,
  CardActions,
  CardContent,
  CardMedia,
} from '@mui/material';
import Head from 'next/head';
import Layout from '../components/Layout';
import Header from '../components/Header';
import { api } from '../lib/api/index';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import HeroSection from '../components/home/HeroSection';
import TourCard from '../components/home/TourCard';
import { useRouter } from 'next/router';
import debounce from 'lodash.debounce';
import styles from '../styles/HomePage.module.css';
import Footer from '../components/Footer';
import LanguageIcon from '@mui/icons-material/Language';
import GroupsIcon from '@mui/icons-material/Groups';
import { type } from './tours/index';
import NearMeIcon from '@mui/icons-material/NearMe';
import SearchIcon from '@mui/icons-material/Search';

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

  const cards = [
    {
      icon: (
        <LanguageIcon
          sx={{ color: 'green', width: '2.5rem', height: '2.5rem' }}
        />
      ),
      header: 'Local Experts',
      text: 'Meet passionate locals who know their cities inside out and love sharing hidden gems and authentic stories.',
    },
    {
      icon: (
        <GroupsIcon
          sx={{ color: 'green', width: '2.5rem', height: '2.5rem' }}
        />
      ),
      header: 'Cultural Connection',
      text: 'Perfect for tourists, travelers, immigrants, and new settlers looking to connect with their new community.',
    },
    {
      icon: (
        <img src='/sale_fill.svg' alt='tours' className={styles.toursSvg} />
      ),
      header: 'Free Walking Tours',
      text: 'Discover amazing free walking tours and pay-what-you-feel experiences that fit any budget.',
    },
  ];

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

      <div className={styles.hero}>
        <main className={styles.main}>
          <Header />
        </main>
        <div className={styles.headerContent}>
          <div className={styles.headerText}>
            <h1>
              <span>Travel smarter, meet new </span>
              <span>people, and explore like a local.</span>
            </h1>
            <p>
              Connect with passionate guides and experience authentic cultural
              adventures in cities worldwide.
            </p>
          </div>

          <div className={styles.inputGroup}>
            <div className={styles.input}>
              <span className={styles.searchIcon}>
                <SearchIcon />
              </span>
              <input
                type='search'
                placeholder='Search by City'
                value={suggestion}
                onChange={(e) => handleSearchInput(e.target.value)}
                className={styles.searchInput}
              />
            </div>

            <Button>Search</Button>
          </div>

          <div className={styles.buttonGroup}>
            <Button>
              <NearMeIcon />
              #Whois Nearby
            </Button>
          </div>
        </div>
      </div>

      <Box className={styles.tours}>
        <h3>Available Tours</h3>

        <Box>
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
                    key={tour.id}
                    className={styles.gridItem}
                    role='listitem'
                  >
                    hi
                    {/* <TourCard
                      tour={tour}
                      highlight={search}
                      aria-label={`Tour to ${tour.location}`}
                    /> */}
                  </div>
                ))}
          </div>
        </Box>
      </Box>

      <Box className={styles.why}>
        <Box className={styles['why-container']}>
          <h3>Why Choose Wakapadi?</h3>
          <p>
            Connect with local guides and helpers for authentic cultural
            experiences that go beyond typical tourist attractions.
          </p>

          <Box className={styles['card-container']}>
            {cards?.map((card, index) => (
              <Card
                sx={{ maxWidth: 375, marginBottom: '2rem' }}
                className={styles.card}
                key={index}
              >
                <CardContent className={styles.cardContent}>
                  {card.icon}
                  <Typography gutterBottom variant='h5' component='div'>
                    {card.header}
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{
                      color: 'text.secondary',
                      fontSize: '1rem',
                      marginTop: '.6rem',
                    }}
                  >
                    {card.text}
                  </Typography>
                </CardContent>
              </Card>
            ))}
            <Box></Box>
            <Box></Box>
          </Box>
        </Box>
      </Box>

      <Box className={styles.explore}>
        <h3>Ready to Explore?</h3>
        <p>
          Join thousands of travelers who have discovered authentic local
          experiences through Wakapadi.
        </p>
        <Button>Start your adventure</Button>
      </Box>

      <Footer />
      {/* <Head>
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
                        key={tour.id}
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
      </Layout> */}
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
