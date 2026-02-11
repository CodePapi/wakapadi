// pages/tours/[city]/[slug].tsx
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
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
  // Bookmark as BookmarkIcon,
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
  // const [isSaved, setIsSaved] = useState(false);

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
            console.error('error', res);
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
  }, [city, slug]);

  // const handleSaveTour = () => {
  //   setIsSaved(!isSaved);
  //   // TODO: Implement actual save functionality (e.g., API call to save tour for user)
  // };

  const handleShareTour = async () => {
    if (tour) {
      try {
        if (navigator.share) {
          await navigator.share({
            title: t('tourShareTitle', { title: tour.title }),
            text: tour.description
              ? tour.description.substring(0, 100) + '...'
              : '',
            url: window.location.href,
          });
        } else {
          await navigator.clipboard.writeText(window.location.href);
          alert(t('tourLinkCopied'));
        }
      } catch (error) {
        console.error('Error sharing tour:', error);
        alert(t('tourShareError'));
      }
    }
  };

  const getDetailIcon = (detail: string) => {
    const lowerDetail = detail.toLowerCase();
    if (lowerDetail.includes('h') && lowerDetail.includes('min'))
      return <DurationIcon />;
    if (
      lowerDetail.includes('english') ||
      lowerDetail.includes('german') ||
      lowerDetail.includes('language')
    )
      return <LanguageIcon />;
    if (lowerDetail.includes('tip') || lowerDetail.includes('price'))
      return <PriceIcon />;
    if (
      lowerDetail.includes('town hall') ||
      lowerDetail.includes('meet') ||
      lowerDetail.includes('meeting point')
    )
      return <MeetingPointIcon />;
    if (
      lowerDetail.includes('calendar') ||
      lowerDetail.includes('date') ||
      lowerDetail.includes('time')
    )
      return <CalendarIcon />;
    return <InfoIcon />;
  };

  const filteredImages =
    (tour?.mainImage.filter((img) => img !== null) as string[]) || [];

  // Default map position if coordinates are not available
  const defaultMapCenter: [number, number] = [52.52, 13.405]; // Berlin coordinates
  const tourLat = tour?.latitude || defaultMapCenter[0];
  const tourLon = tour?.longitude || defaultMapCenter[1];
  // const mapKey = tourLat && tourLon ? `${tourLat}-${tourLon}` : 'default-map'; // Key for map re-render - no longer needed with dynamic import

  // SEO optimization
  const seoTitle = tour?.title
    ? t('tourSeoTitle', { title: tour.title })
    : t('tourSeoTitleFallback');
  const seoDescription = tour?.description
    ? t('tourSeoDescription', {
        description: tour.description.substring(0, 160),
      })
    : t('tourSeoDescriptionFallback');

  const headerTitle = tour?.title || t('tourDetailsHeaderTitle');
  const headerSubtitle = city
    ? t('tourDetailsHeaderSubtitleCity', { city })
    : t('tourDetailsHeaderSubtitle');

  return (
    <Layout title={seoTitle} description={seoDescription}>
      <Head>
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta
          property="og:url"
          content={typeof window !== 'undefined' ? window.location.href : ''}
        />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        {filteredImages.length > 0 && (
          <meta property="og:image" content={filteredImages[0]} />
        )}

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta
          property="twitter:url"
          content={typeof window !== 'undefined' ? window.location.href : ''}
        />
        <meta property="twitter:title" content={seoTitle} />
        <meta property="twitter:description" content={seoDescription} />
        {filteredImages.length > 0 && (
          <meta property="twitter:image" content={filteredImages[0]} />
        )}
      </Head>

      <PageHeader title={headerTitle} subtitle={headerSubtitle} />

      <Box
        sx={{
          px: { xs: 2, sm: 3, md: 4 },
          py: 4,
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        <Box sx={{ mb: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.back()}
            sx={{ color: 'text.secondary' }}
            aria-label={t('tourBackToResultsAria')}
            href={`/tours?q=${city}`}
          >
            {t('tourBackToResults')}
          </Button>
        </Box>

        {loading ? (
          <Box>
            <Skeleton
              variant="text"
              sx={{ fontSize: '3rem', mb: 2 }}
              width="80%"
            />
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
              <Skeleton variant="rectangular" width={150} height={20} />
              <Skeleton variant="rectangular" width={80} height={20} />
              <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
                <Skeleton variant="circular" width={40} height={40} />
                <Skeleton variant="circular" width={40} height={40} />
              </Box>
            </Box>
            <Skeleton
              variant="rectangular"
              width="100%"
              height={400}
              sx={{ borderRadius: 2, mb: 4 }}
            />
            <Skeleton variant="text" sx={{ fontSize: '1.5rem' }} height={100} />
            <Divider sx={{ my: 4 }} />
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { md: '1fr 1fr' },
                gap: 4,
                mb: 4,
              }}
            >
              <Box>
                <Skeleton
                  variant="text"
                  sx={{ fontSize: '2rem', mb: 2 }}
                  width="60%"
                />
                <List disablePadding>
                  {[1, 2, 3, 4].map((i) => (
                    <ListItem key={i} disableGutters sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <Skeleton variant="circular" width={24} height={24} />
                      </ListItemIcon>
                      <ListItemText primary={<Skeleton variant="text" />} />
                    </ListItem>
                  ))}
                </List>
              </Box>
              <Box>
                <Skeleton
                  variant="text"
                  sx={{ fontSize: '2rem', mb: 2 }}
                  width="60%"
                />
                <List disablePadding>
                  {[1, 2, 3].map((i) => (
                    <ListItem key={i} disableGutters sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <Skeleton variant="circular" width={24} height={24} />
                      </ListItemIcon>
                      <ListItemText primary={<Skeleton variant="text" />} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            </Box>
            <Divider sx={{ my: 4 }} />
            {/* Skeleton for the map */}
            <Skeleton
              variant="rectangular"
              width="100%"
              height={400}
              sx={{ borderRadius: 2, mb: 4 }}
            />
            <Divider sx={{ my: 4 }} />
            <Skeleton
              variant="text"
              sx={{ fontSize: '2rem', mb: 2 }}
              width="40%"
            />
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                p: 3,
                borderRadius: 2,
                boxShadow: 1,
              }}
            >
              <Skeleton variant="circular" width={80} height={80} />
              <Box>
                <Skeleton
                  variant="text"
                  sx={{ fontSize: '1.5rem' }}
                  width={150}
                />
                <Skeleton variant="text" width={200} />
                <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                  <Skeleton variant="rectangular" width={100} height={36} />
                  <Skeleton variant="rectangular" width={120} height={36} />
                </Box>
              </Box>
            </Box>
            <Box sx={{ p: 4, borderRadius: 2, textAlign: 'center', mt: 4 }}>
              <Skeleton
                variant="text"
                sx={{ fontSize: '2rem', mb: 2 }}
                width="70%"
              />
              <Skeleton variant="text" sx={{ mb: 3 }} width="50%" />
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                <Skeleton variant="rectangular" width={150} height={48} />
                <Skeleton variant="rectangular" width={180} height={48} />
              </Box>
            </Box>
          </Box>
        ) : error ? (
          <Box
            sx={{
              textAlign: 'center',
              p: 4,
              border: '1px solid',
              borderColor: 'error.main',
              borderRadius: 2,
              maxWidth: '600px',
              mx: 'auto',
              my: 4,
            }}
            role="alert"
          >
            <WarningIcon
              color="error"
              sx={{ fontSize: 40, mb: 2 }}
              aria-hidden="true"
            />
            <Typography variant="h5" color="error" gutterBottom>
              {t('tourLoadFailedTitle')}
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {error}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => window.location.reload()}
              sx={{ mr: 2 }}
              aria-label={t('tourTryAgainAria')}
            >
              {t('tourTryAgain')}
            </Button>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => router.push('/')}
              aria-label={t('tourBackHomeAria')}
            >
              {t('tourBackHome')}
            </Button>
          </Box>
        ) : tour ? (
          <>
            <Box sx={{ mb: 4 }}>
              <Typography
                variant="h3"
                component="h1" // Semantic HTML for main heading
                gutterBottom
                sx={{
                  fontWeight: 700,
                  color: 'primary.main',
                  fontSize: { xs: '2rem', md: '2.5rem' },
                }}
              >
                {tour.title}
              </Typography>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  mb: 3,
                  flexWrap: 'wrap',
                  gap: 2,
                }}
              >
                {tour.tourRating && (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Rating
                      value={parseFloat(tour.tourRating)}
                      precision={0.1}
                      readOnly
                      icon={<StarIcon fontSize="inherit" />}
                      emptyIcon={<StarIcon fontSize="inherit" />}
                      sx={{ color: 'secondary.main', mr: 1 }}
                      aria-label={t('tourRatingAria', { rating: tour.tourRating })}
                    />
                    <Typography variant="subtitle1" color="text.secondary">
                      {tour.tourRating}/10
                    </Typography>
                  </Box>
                )}

                {tour.tourType && (
                  <Chip
                    label={tour.tourType}
                    variant="outlined"
                    color="secondary"
                    size="small"
                    aria-label={t('tourTypeAria', { type: tour.tourType })}
                  />
                )}

                <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
                  <IconButton
                    onClick={handleShareTour}
                    color="primary"
                    aria-label={t('tourShareAria')}
                  >
                    <ShareIcon />
                  </IconButton>
                  {/* <IconButton
                    onClick={handleSaveTour}
                    color={isSaved ? 'secondary' : 'default'}
                    aria-label={isSaved ? 'Unsave tour' : 'Save tour'}
                  >
                    <BookmarkIcon />
                  </IconButton> */}
                </Box>
              </Box>
            </Box>

            {filteredImages.length > 0 && (
              <Box
                sx={{
                  mb: 4,
                  borderRadius: 2,
                  overflow: 'hidden',
                  boxShadow: 3,
                  position: 'relative',
                  '&:hover .image-overlay': {
                    opacity: 1,
                  },
                }}
              >
                <img
                  src={filteredImages[0]}
                  alt={tour.title}
                  style={{
                    width: '100%',
                    height: '400px',
                    objectFit: 'cover',
                  }}
                />
                {filteredImages.length > 1 && (
                  <Box
                    className="image-overlay"
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background:
                        'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)',
                      p: 3,
                      opacity: 0,
                      transition: 'opacity 0.3s ease',
                    }}
                  >
                    <Typography variant="body2" color="white" sx={{ mb: 1 }}>
                      {t('tourMorePhotos', { count: filteredImages.length - 1 })}
                    </Typography>
                    {/* <Button
                      variant="contained"
                      color="secondary"
                      onClick={() => {}}
                      aria-label="View all photos of this tour"
                    >
                      View All Photos
                    </Button> */}
                  </Box>
                )}
              </Box>
            )}

            <Typography
              variant="body1"
              paragraph
              sx={{
                whiteSpace: 'pre-line',
                lineHeight: 1.8,
                fontSize: '1.1rem',
                color: 'text.secondary',
                mb: 4,
              }}
            >
              {tour.description}
            </Typography>

            <Divider sx={{ my: 4 }} />

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { md: '1fr 1fr' },
                gap: 4,
                mb: 4,
              }}
            >
              <Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    mb: 2,
                    '& svg': {
                      color: 'primary.main',
                      mr: 1,
                    },
                  }}
                >
                  <InfoIcon aria-hidden="true" />
                  <Typography variant="h5" component="h2">
                    {t('tourDetailsSectionTitle')}
                  </Typography>
                </Box>

                <List disablePadding>
                  {tour.details?.map((item: string, idx: number) => (
                    <ListItem key={idx} disableGutters sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        {getDetailIcon(item)}
                      </ListItemIcon>
                      <ListItemText
                        primary={item}
                        primaryTypographyProps={{ variant: 'body1' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>

              <Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    mb: 2,
                    '& svg': {
                      color: 'primary.main',
                      mr: 1,
                    },
                  }}
                >
                  <LocationOnIcon aria-hidden="true" />
                  <Typography variant="h5" component="h2">
                    {t('tourHighlightsTitle')}
                  </Typography>
                </Box>

                <List disablePadding>
                  {tour.activities?.map((item: string, idx: number) => (
                    <ListItem key={idx} disableGutters sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <LocationOnIcon
                          color="secondary"
                          fontSize="small"
                          aria-hidden="true"
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={item}
                        primaryTypographyProps={{ variant: 'body1' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            </Box>

            {tour.takeNote?.length > 0 && (
              <>
                <Divider sx={{ my: 4 }} />
                <Box
                  sx={{
                    mb: 4,
                    bgcolor: 'warning.light',
                    p: 3,
                    borderRadius: 2,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      mb: 2,
                      '& svg': {
                        color: 'warning.main',
                        mr: 1,
                      },
                    }}
                  >
                    <WarningIcon aria-hidden="true" />
                    <Typography variant="h5" component="h2">
                      {t('tourImportantNotesTitle')}
                    </Typography>
                  </Box>

                  <List disablePadding>
                    {tour.takeNote.map((note: string, idx: number) => (
                      <ListItem key={idx} disableGutters sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <WarningIcon
                            color="warning"
                            fontSize="small"
                            aria-hidden="true"
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={note}
                          primaryTypographyProps={{
                            variant: 'body1',
                            color: 'warning.dark',
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </>
            )}

            {tour.latitude && tour.longitude ? (
              <>
                <Divider sx={{ my: 4 }} />
                <Box
                  sx={{
                    mb: 4,
                    borderRadius: 2,
                    overflow: 'hidden',
                    boxShadow: 3,
                    height: '400px',
                    position: 'relative',
                  }}
                >
                  <DynamicTourMap
                    latitude={tourLat}
                    longitude={tourLon}
                    title={tour.title}
                    address={tour.address}
                    className={styles.mapContainer}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 16,
                      right: 16,
                      bgcolor: 'background.paper',
                      p: 1,
                      borderRadius: 1,
                      boxShadow: 1,
                      zIndex: 1,
                    }}
                  >
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<MapIcon />}
                      // Use a proper Google Maps URL with coordinates
                      href={`https://www.google.com/maps/search/?api=1&query=${tourLat},${tourLon}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t('tourOpenMapsAria')}
                    >
                      {t('tourOpenMaps')}
                    </Button>
                  </Box>
                </Box>
              </>
            ) : (
              tour.address && (
                <>
                  <Divider sx={{ my: 4 }} />
                  <Box
                    sx={{
                      mb: 4,
                      bgcolor: 'info.light',
                      p: 3,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 2,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                      <LocationOnIcon
                        color="info"
                        sx={{ mr: 1 }}
                        aria-hidden="true"
                      />
                      <Typography variant="body1" color="info.dark">
                        {t('tourAddressLabel', { address: tour.address })}
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<MapIcon />}
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        tour.address
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t('tourViewOnMapAria', { address: tour.address })}
                    >
                      {t('tourViewOnMap')}
                    </Button>
                  </Box>
                </>
              )
            )}

            <Divider sx={{ my: 4 }} />

            <Box sx={{ mb: 4 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  mb: 2,
                  '& svg': {
                    color: 'primary.main',
                    mr: 1,
                  },
                }}
              >
                <InfoIcon aria-hidden="true" />
                <Typography variant="h5" component="h2">
                  {t('tourProviderTitle')}
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  p: 3,
                  bgcolor: 'background.paper',
                  borderRadius: 2,
                  boxShadow: 1,
                }}
              >
                <Avatar
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                    tour.provider.name
                  )}&background=random&color=fff`}
                  sx={{
                    width: 80,
                    height: 80,
                    fontSize: '2rem',
                  }}
                  alt={`Avatar for ${tour.provider.name}`}
                />
                <Box>
                  <Typography variant="h6" gutterBottom component="h3">
                    {tour.provider.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    {t('tourProviderVerified')}
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    href={tour.provider.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ mr: 2 }}
                    endIcon={<OpenInNewIcon fontSize="small" />}
                    aria-label={t('tourProviderVisitAria', { provider: tour.provider.name })}
                  >
                    {t('tourProviderVisit')}
                  </Button>
                  {/* <Button
                    variant="outlined"
                    size="small"
                    startIcon={<InfoIcon />}
                    onClick={() => {  }}
                    aria-label={`See more tours from ${tour.provider.name}`}
                  >
                    More Tours
                  </Button> */}
                </Box>
              </Box>
            </Box>

            <Box
              sx={{
                bgcolor: 'primary.light',
                p: 4,
                borderRadius: 2,
                textAlign: 'center',
                mb: 4,
              }}
            >
              <Typography
                variant="h5"
                gutterBottom
                sx={{ fontWeight: 600 }}
                component="h2"
              >
                {t('tourCtaTitle')}
              </Typography>
              <Typography variant="body1" sx={{ mb: 3 }}>
                {t('tourCtaSubtitle')}
              </Typography>
              <Button
                component="a"
                variant="contained"
                size="large"
                href={tour.tourUrl}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                }}
                aria-label={t('tourBookNowAria')}
              >
                {t('tourBookNow')}
              </Button>
              {/* <Button
                variant="outlined"
                size="large"
                startIcon={<CalendarIcon />}
                onClick={() => {  }}
                sx={{
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  ml: { xs: 0, sm: 2 },
                  mt: { xs: 2, sm: 0 } 
                }}
                aria-label="Check availability for this tour"
              >
                Check Availability
              </Button> */}
            </Box>
          </>
        ) : null}
      </Box>
    </Layout>
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
  return {
    paths: [],
    fallback: 'blocking',
  };
}
