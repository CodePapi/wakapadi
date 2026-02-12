// pages/tours/[city]/[slug].tsx
/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
import { useRouter } from 'next/router';
import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import Layout from '../../../components/Layout';
import PageHeader from '../../../components/PageHeader';
import styles from '../../../styles/SingleTour.module.css';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

import dynamic from 'next/dynamic';

import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Button,
  Rating,
  IconButton,
  Chip,
  Avatar,
  Skeleton,
} from '@mui/material';
import {
  Info as InfoIcon,
  LocationOn as LocationOnIcon,
  Map as MapIcon,
  Star as StarIcon,
  Warning as WarningIcon,
  Share as ShareIcon,
  CalendarToday as CalendarIcon,
  ArrowBack as ArrowBackIcon,
  AccessTime as DurationIcon,
  Language as LanguageIcon,
  Money as PriceIcon,
  Place as MeetingPointIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { api } from '../../../lib/api/index';
import Head from 'next/head';

const DynamicTourMap = dynamic(() => import('../../../components/TourMap'), {
  ssr: false,
  loading: () => (
    <Skeleton
      variant="rectangular"
      width="100%"
      height={400}
      sx={{ borderRadius: 2 }}
    />
  ),
});

interface TourData {
  title: string;
  tourRating: string | null;
  description: string;
  mainImage: (string | null)[];
  details: string[];
  provider: {
    name: string;
    url: string;
  };
  activities: string[];
  takeNote: string[];
  tourType: string | null;
  tourMap: string | null;
  address?: string;
  latitude?: number;
  longitude?: number;
  reviewCount?: number;
  tourUrl?: string;
}

export default function SingleTourPage() {
  const router = useRouter();
  const { t } = useTranslation('common');
  const { city, slug } = router.query;
  const [tour, setTour] = useState<TourData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (city && slug) {
      const fetchTour = async () => {
        setLoading(true);
        setError(null);
        try {
          const res = await api.post('/scraper/scrape-tour', { city, slug });
          if (res.data) {
            setTour(res.data);
          } else {
            setError(t('tourFetchError'));
          }
        } catch (err) {
          console.error('Failed to fetch tour:', err);
          setError(t('tourConnectError'));
        } finally {
          setLoading(false);
        }
      };

      fetchTour();
    }
  }, [city, slug, t]); // Added t to dependencies

  const handleShareTour = async () => {
    if (tour) {
      try {
        if (navigator.share) {
          await navigator.share({
            title: t('tourShareTitle', { title: tour.title }),
            text: tour.description ? tour.description.substring(0, 100) + '...' : '',
            url: window.location.href,
          });
        } else {
          await navigator.clipboard.writeText(window.location.href);
          alert(t('tourLinkCopied'));
        }
      } catch (error) {
        console.error('Error sharing tour:', error);
      }
    }
  };

  const getDetailIcon = (detail: string) => {
    const lowerDetail = detail.toLowerCase();
    if (lowerDetail.includes('h') && lowerDetail.includes('min')) return <DurationIcon />;
    if (lowerDetail.includes('english') || lowerDetail.includes('language')) return <LanguageIcon />;
    if (lowerDetail.includes('tip') || lowerDetail.includes('price')) return <PriceIcon />;
    if (lowerDetail.includes('meet') || lowerDetail.includes('meeting point')) return <MeetingPointIcon />;
    if (lowerDetail.includes('calendar') || lowerDetail.includes('date')) return <CalendarIcon />;
    return <InfoIcon />;
  };

  const filteredImages = useMemo(() => 
    (tour?.mainImage.filter((img): img is string => img !== null) || []), 
  [tour]);

  // SEO logic
  const seoData = useMemo(() => ({
    title: tour?.title ? t('tourSeoTitle', { title: tour.title }) : t('tourSeoTitleFallback'),
    description: tour?.description ? t('tourSeoDescription', { description: tour.description.substring(0, 160) }) : t('tourSeoDescriptionFallback'),
  }), [tour, t]);

  const headerTitle = tour?.title || t('tourDetailsHeaderTitle');
  const headerSubtitle = city ? t('tourDetailsHeaderSubtitleCity', { city }) : t('tourDetailsHeaderSubtitle');

  return (
    <Layout title={seoData.title} description={seoData.description}>
      <Head>
        <meta property="og:title" content={seoData.title} />
        <meta property="og:description" content={seoData.description} />
        {filteredImages.length > 0 && <meta property="og:image" content={filteredImages[0]} />}
      </Head>

      <PageHeader title={headerTitle} subtitle={headerSubtitle} />

      <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, py: 4, maxWidth: '1200px', margin: '0 auto' }}>
        <Box sx={{ mb: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.back()}
            sx={{ color: 'text.secondary' }}
          >
            {t('tourBackToResults')}
          </Button>
        </Box>

        {loading ? (
          <TourSkeleton />
        ) : error ? (
          <ErrorState message={error} t={t} onRetry={() => window.location.reload()} />
        ) : tour ? (
          <>
            <Box sx={{ mb: 4 }}>
              <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700, color: 'primary.main' }}>
                {tour.title}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                {tour.tourRating && (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Rating value={parseFloat(tour.tourRating) / 2} precision={0.5} readOnly />
                    <Typography variant="subtitle1" sx={{ ml: 1 }}>{tour.tourRating}/10</Typography>
                  </Box>
                )}
                <IconButton onClick={handleShareTour} color="primary"><ShareIcon /></IconButton>
              </Box>
            </Box>

            {filteredImages.length > 0 && (
              <Box sx={{ mb: 4, borderRadius: 2, overflow: 'hidden', position: 'relative', height: '400px' }}>
                <Image
                  src={filteredImages[0]}
                  alt={tour.title}
                  fill
                  style={{ objectFit: 'cover' }}
                  priority
                />
              </Box>
            )}

            <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-line', lineHeight: 1.8 }}>
              {tour.description}
            </Typography>

            <Divider sx={{ my: 4 }} />

            <Box sx={{ display: 'grid', gridTemplateColumns: { md: '1fr 1fr' }, gap: 4 }}>
              <Box>
                <Typography variant="h5" gutterBottom><InfoIcon sx={{ mr: 1, verticalAlign: 'middle' }} /> {t('tourDetailsSectionTitle')}</Typography>
                <List>
                  {tour.details?.map((item, idx) => (
                    <ListItem key={idx} disableGutters>
                      <ListItemIcon sx={{ minWidth: 32 }}>{getDetailIcon(item)}</ListItemIcon>
                      <ListItemText primary={item} />
                    </ListItem>
                  ))}
                </List>
              </Box>
              <Box>
                <Typography variant="h5" gutterBottom><LocationOnIcon sx={{ mr: 1, verticalAlign: 'middle' }} /> {t('tourHighlightsTitle')}</Typography>
                <List>
                  {tour.activities?.map((item, idx) => (
                    <ListItem key={idx} disableGutters>
                      <ListItemIcon sx={{ minWidth: 32 }}><StarIcon color="secondary" /></ListItemIcon>
                      <ListItemText primary={item} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            </Box>

            {tour.latitude && tour.longitude && (
              <Box sx={{ mt: 4, height: '400px', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
                <DynamicTourMap latitude={tour.latitude} longitude={tour.longitude} title={tour.title} />
                <Box sx={{ position: 'absolute', bottom: 16, right: 16, zIndex: 10 }}>
                  <Button
                    variant="contained"
                    startIcon={<MapIcon />}
                    href={`https://www.google.com/maps/search/?api=1&query=${tour.latitude},${tour.longitude}`}
                    target="_blank"
                  >
                    {t('tourOpenMaps')}
                  </Button>
                </Box>
              </Box>
            )}

            <Box sx={{ bgcolor: 'primary.light', p: 4, borderRadius: 2, textAlign: 'center', mt: 4 }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>{t('tourCtaTitle')}</Typography>
              <Button
              
                variant="contained"
                size="large"
                href={tour.tourUrl?.startsWith('http') ? tour.tourUrl : `https://${tour.tourUrl}`}
                target="_blank"
                sx={{ px: 6 }}
              >
                {t('tourBookNow')}
              </Button>
            </Box>
          </>
        ) : null}
      </Box>
    </Layout>
  );
}

function TourSkeleton() {
  return (
    <Box>
      <Skeleton variant="text" width="60%" height={60} />
      <Skeleton variant="rectangular" width="100%" height={400} sx={{ my: 4, borderRadius: 2 }} />
      <Skeleton variant="text" height={100} />
    </Box>
  );
}

function ErrorState({ message, t, onRetry }: { message: string, t: any, onRetry: () => void }) {
  return (
    <Box sx={{ textAlign: 'center', py: 8 }}>
      <WarningIcon color="error" sx={{ fontSize: 60 }} />
      <Typography variant="h5" color="error" gutterBottom>{t('tourLoadFailedTitle')}</Typography>
      <Typography sx={{ mb: 3 }}>{message}</Typography>
      <Button variant="contained" onClick={onRetry}>{t('tourTryAgain')}</Button>
    </Box>
  );
}

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}

export async function getStaticPaths() {
  return { paths: [], fallback: 'blocking' };
}