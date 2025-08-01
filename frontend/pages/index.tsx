/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState, useMemo, useCallback } from 'react';
import Head from 'next/head';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import debounce from 'lodash.debounce';
import { Box, Button, Typography, Card, CardContent } from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import GroupsIcon from '@mui/icons-material/Groups';
import NearMeIcon from '@mui/icons-material/NearMe';
import SearchIcon from '@mui/icons-material/Search';
import { api } from '../lib/api/index';
import styles from '../styles/HomePage.module.css';
import Layout from '../components/Layout';
import Tours from '../components/home/Tours';

const PER_PAGE = 12;

export type Tour = {
  image: string;
  id: number;
  location: string;
  altText: string;
  title: string;
  recurringSchedule: string;
  externalPageUrl: string;
  startDate: string;
  endDate: string;
};

export default function HomePage() {
  const { t } = useTranslation('common');
  const [tours, setTours] = useState<Tour[]>([]);
  const [search, setSearch] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hideIcon, setHideIcon] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
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
      // setError(null);
      const res = await api.get('/tours');
      setTours(res.data);
    } catch {
      // setError(t('fetchError'));
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
        // eslint-disable-next-line @next/next/no-img-element
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
        <link rel='icon' type='image/png' href='/favicon.png' />
      </Head>

      <Layout homepage={true}>
        <div className={styles.hero}>
          <div className={styles.headerContent}>
            <div
            // className={styles.headerText}
            >
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
                  {!hideIcon && !suggestion ? <SearchIcon /> : null}
                </span>
                <input
                  type='search'
                  placeholder='Search by City'
                  value={suggestion}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  onFocus={() => setHideIcon(true)}
                  onBlur={() => setHideIcon(false)}
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

        <Tours
          loading={loading}
          search={search}
          paginatedTours={paginatedTours}
        />

        <Box className={styles.why}>
          <Box className={styles['why-container']}>
            <h2>Why Choose Wakapadi?</h2>
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
                    <Typography gutterBottom variant='h5' component='h5'>
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
            </Box>
          </Box>
        </Box>
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
