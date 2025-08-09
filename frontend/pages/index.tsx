/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  Autocomplete,
  TextField,
} from '@mui/material';
import Head from 'next/head';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import debounce from 'lodash.debounce';
import LanguageIcon from '@mui/icons-material/Language';
import GroupsIcon from '@mui/icons-material/Groups';
import NearMeIcon from '@mui/icons-material/NearMe';
import SearchIcon from '@mui/icons-material/Search';
import { api } from '../lib/api/index';
import styles from '../styles/HomePage.module.css';
import Layout from '../components/Layout';
import Tours from '../components/home/Tours';

export type Tour = {
  image: string;
  _id: string;
  location: string;
  altText: string;
  title: string;
  recurringSchedule: string;
  externalPageUrl: string;
  startDate: string;
  endDate: string;
};

export default function HomePage() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 599px)');

    const handleChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mediaQuery.addEventListener('change', handleChange);

    // Initial check
    setIsMobile(mediaQuery.matches);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const PER_PAGE = isMobile ? 6 : 12;
  const { t } = useTranslation('common');
  const [tours, setTours] = useState<Tour[]>([]);
  const [search, setSearch] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
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
    return filteredTours?.slice((page - 1) * PER_PAGE, page * PER_PAGE);
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
      header: t('whyCard1Title'),
      text: t('whyCard1Content'),
    },
    {
      icon: (
        <GroupsIcon
          sx={{ color: 'green', width: '2.5rem', height: '2.5rem' }}
        />
      ),
      header: t('whyCard2Title'),
      text: t('whyCard2Content'),
    },
    {
      icon: (
        // eslint-disable-next-line @next/next/no-img-element
        <img src='/sale_fill.svg' alt='tours' className={styles.toursSvg} />
      ),
      header: t('whyCard3Title'),
      text: t('whyCard3Content'),
    },
  ];

  const locations = useMemo(
    () =>
      Array.isArray(tours) ? [...new Set(tours?.map((t) => t?.location))] : [],
    [tours]
  );

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

  return (
    <>
      <Head>
        <meta name='description' content={t('homePageDescription')} />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <meta name='robots' content='index, follow' />
        <meta property='og:title' content={t('homePageTitle')} />
        <meta property='og:description' content={t('homePageDescription')} />
        <link rel='icon' type='image/png' href='/favicon.png' />
      </Head>

      <Layout homepage={true} title={t('homePageTitle')}>
        <div className={styles.hero}>
          <div className={styles.headerContent}>
            <div
            // className={styles.headerText}
            >
              <h1>
                <span>{t('homeTitleSub1')} </span>
                <span>{t('homeTitleSub2')}</span>
              </h1>
              <p>{t('homeSubtitle')}</p>
            </div>

            <div className={styles.inputGroup}>
              <div className={styles.input}>
                <Autocomplete
                  freeSolo
                  fullWidth
                  options={locations}
                  getOptionLabel={(option) => option}
                  inputValue={search}
                  onInputChange={(_, value) => handleSearchInput(value)}
                  disableClearable
                  renderInput={(params) => (
                    <>
                      <span className={styles.searchIcon}>
                        {!suggestion ? <SearchIcon /> : null}
                      </span>
                      <TextField
                        {...params}
                        placeholder={t('searchPlaceholder')}
                        variant='standard'
                        fullWidth
                        InputProps={{
                          ...params.InputProps,
                          disableUnderline: true,
                          className: styles.inputField,
                          'aria-label': 'Search tours',
                        }}
                      />
                    </>
                  )}
                  noOptionsText={t('noResults')}
                />
              </div>

              <Button>Search</Button>
            </div>

            <div className={styles.buttonGroup}>
              <Button onClick={() => router.push('/whois')}>
                <NearMeIcon />
                {t('whoisNearby')}
              </Button>
            </div>
          </div>
        </div>

        <Tours
          loading={loading}
          search={search}
          paginatedTours={paginatedTours}
          totalPages={totalPages}
          page={page}
          handlePageChange={handlePageChange}
        />

        <Box className={styles.why}>
          <Box className={styles['why-container']}>
            <h2>{t('whyTitle')}</h2>
            <p>{t('whysubTitle')}</p>

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
