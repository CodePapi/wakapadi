import { useEffect, useState, useCallback, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import {
  Box,
  Container,
  Typography,
  Button,
  CircularProgress,
  List,
  ListItem,
  Divider,
  Avatar,
  Chip,
  Alert,
  Skeleton,
} from '@mui/material';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { formatDistanceToNow } from 'date-fns';
import Layout from '../components/Layout';
import { api } from '../lib/api/index';
import PlaceIcon from '@mui/icons-material/Place';
import styles from '../styles/whois.module.css';
import funNames from '../lib/data/funNames.json';
import { safeStorage } from '../lib/storage';
import { ensureAnonymousSession } from '../lib/anonymousAuth';

const getRandomFunName = () =>
  funNames[Math.floor(Math.random() * funNames.length)];
const statusColors = {
  active: '#10b981',
  idle: '#f59e0b',
  offline: '#94a3b8',
};

interface User {
  _id: string;
  userId?: string;
  username?: string;
  anonymous: boolean;
  lastSeen?: string;
  coordinates?: { lat: number; lng: number };
  distanceKm?: number | null;
}

const toRadians = (value: number) => (value * Math.PI) / 180;
const haversineKm = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) => {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

export default function WhoisPage() {
  const [hasMounted, setHasMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [city, setCity] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [currentCoords, setCurrentCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [ref, inView] = useInView();
  const anonymousNameMap = useRef<Map<string, string>>(new Map());
  const router = useRouter();
  const { t } = useTranslation('common');

  useEffect(() => {
    setHasMounted(true);
    (async () => {
      try {
        const session = await ensureAnonymousSession();
        setIsLoggedIn(!!session?.token);
        if (session?.userId) setUserId(session.userId);
      } catch (error) {
        console.warn('Anonymous session failed', error);
      }
    })();
  }, []);

  const fetchNearby = useCallback(
    async (targetCity: string, pageNum = 1) => {
      try {
        setError(null);
        const res = await api
          .get('/whois/nearby', {
            params: {
              city: targetCity,
              userId,
              page: pageNum,
              limit: 15,
            },
            headers: {
              Authorization: `Bearer ${safeStorage.getItem('token') || ''}`,
            },
          })
          .catch((error) => {
            console.warn('Fetch nearby failed', error);
            setError(t('fetchError'));
            return null;
          });

        if (!res) {
          setLoading(false);
          setLoadingMore(false);
          return;
        }

        const enriched = res.data.map((user: User) => {
          if (!currentCoords || !user.coordinates) {
            return { ...user, distanceKm: null };
          }

          const distanceKm = haversineKm(
            currentCoords.lat,
            currentCoords.lng,
            user.coordinates.lat,
            user.coordinates.lng
          );
          return { ...user, distanceKm };
        });

        if (pageNum === 1) {
          setUsers(enriched);
        } else {
          setUsers((prev) => [...prev, ...enriched]);
        }

        setHasMore(res.data.length === 15);
      } catch (err) {
        console.error('Fetch nearby failed:', err);
        setError(t('fetchError'));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [userId, t, currentCoords]
  );

  const handleStartChat = useCallback(
    async (targetUserId: string) => {
      try {
        router.push(`/chat/${targetUserId}`);
      } catch (err) {
        console.error('Failed to start chat:', err);
        setError(t('whoisChatStartError'));
      }
    },
    [router, t]
  );

  const pingPresence = async (targetCity: string) => {
    try {
      const res = await api.post('/whois/ping', { city: targetCity });
      if (res.status === 201) {
        await fetchNearby(targetCity);
      }
    } catch (err) {
      console.error('Ping presence failed:', err);
    }
  };

  const getUserStatus = (lastSeen?: string) => {
    if (!lastSeen) return 'offline';
    const minutesAgo =
      (new Date().getTime() - new Date(lastSeen).getTime()) / (1000 * 60);
    if (minutesAgo < 5) return 'active';
    if (minutesAgo < 30) return 'idle';
    return 'offline';
  };

  useEffect(() => {
    if (!hasMounted) return;

    const detectCityAndLoad = async () => {
      const timeout = setTimeout(() => {
        console.warn('Geolocation timed out after 10s');
        setLoading(false);
      }, 10000);

      try {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            clearTimeout(timeout);

            try {
              const { latitude, longitude } = pos.coords;
              if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
                throw new Error('Invalid coordinates');
              }

              setCurrentCoords({ lat: latitude, lng: longitude });

              const res = await api
                .get(
                  `/geolocation/reverse?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`,
                  { validateStatus: () => true }
                )
                .catch((error) => {
                  console.warn('Reverse geocoding request failed', error);
                  setError(t('whoisGeoError'));
                  return null;
                });

              if (!res) {
                return;
              }

              if (res.status >= 400) {
                console.warn('Reverse geocoding failed:', res.status, res.data);
                setError(t('whoisGeoError'));
                return;
              }

              const geocode = res.data;
              const detectedCity = (
                geocode?.address?.city ||
                geocode?.address?.town ||
                geocode?.address?.village ||
                ''
              )
                .trim()
                .toLowerCase();

              if (!detectedCity) {
                setError(t('whoisGeoError'));
                return;
              }

              setCity(detectedCity);
              if (isLoggedIn) await pingPresence(detectedCity);
              await fetchNearby(detectedCity);
            } catch (geoErr) {
              console.error('Geocoding failed:', geoErr);
              setError(t('whoisGeoError'));
            } finally {
              setLoading(false);
            }
          },
          (geoErr) => {
            clearTimeout(timeout);
            console.error('Geolocation error:', geoErr);
            setError(t('whoisGeoDenied'));
            setLoading(false);
          }
        );
      } catch (err) {
        clearTimeout(timeout);
        console.error('Unexpected error in geolocation flow:', err);
        setError(t('whoisUnexpectedError'));
        setLoading(false);
      }
    };

    detectCityAndLoad();
  }, [hasMounted, isLoggedIn, fetchNearby, t]);

  useEffect(() => {
    if (inView && !loadingMore && hasMore && city) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchNearby(city, nextPage);
    }
  }, [inView, loadingMore, hasMore, city, page, fetchNearby]);

  if (!hasMounted) return null;

  const UserSkeleton = () => (
    <Box sx={{ display: 'flex', alignItems: 'center', p: 2, gap: 2 }}>
      <Skeleton variant="circular" width={44} height={44} />
      <Box sx={{ flex: 1 }}>
        <Skeleton variant="text" width="60%" height={24} />
        <Skeleton variant="text" width="40%" height={20} />
      </Box>
      {isLoggedIn && <Skeleton variant="rectangular" width={80} height={36} />}
    </Box>
  );

  return (
    <Layout title={`#${t('whoisNearby')} – Wakapadi`}>
      <Head>
        <title>{`#${t('whoisNearby')} – Wakapadi`}</title>
        <meta name="description" content={t('whoisDescription')} />
      </Head>

      <section className={styles.hero}>
        <Container maxWidth="lg" className={styles.heroInner}>
          <Box className={styles.heroCopy}>
            <Typography variant="h1" className={styles.heroTitle}>
              {t('whoisNearby')}
            </Typography>
            <Typography className={styles.heroSubtitle}>
              {t('discoverTravelers')}
            </Typography>
            {city && (
              <div className={styles.heroMeta}>
                <Chip
                  label={`📍 ${t('near')} ${
                    city.charAt(0).toUpperCase() + city.slice(1)
                  }`}
                  className={styles.locationChip}
                  icon={<PlaceIcon fontSize="small" />}
                />
              </div>
            )}
          </Box>
        </Container>
      </section>

      <Container maxWidth="lg" className={styles.container}>
        <div className={styles.content}>
          {error && (
            <Alert severity="error" className={styles.errorAlert}>
              {error}
              <Button
                variant="text"
                color="inherit"
                onClick={() => window.location.reload()}
                sx={{ ml: 1 }}
              >
                {t('retry')}
              </Button>
            </Alert>
          )}

          <Alert severity="warning" className={styles.errorAlert}>
            {t('whoisSafetyWarning')}
          </Alert>

          {loading ? (
            <Box className={styles.loadingContainer}>
              {[...Array(3)].map((_, i) => (
                <UserSkeleton key={`skeleton-${i}`} />
              ))}
            </Box>
          ) : users.length > 0 ? (
            <>
              <List className={styles.userList} disablePadding>
                {users.map((user, index) => (
                  <div key={`${user._id}-${index}`}>
                    <ListItem className={styles.userItem}>
                      <Box className={styles.userItemContainer}>
                        <Box className={styles.userContent}>
                          <Avatar className={styles.userAvatar}>
                            {user.anonymous
                              ? '👤'
                              : user.username?.charAt(0) || '👤'}
                          </Avatar>
                          <Box sx={{ overflow: 'hidden' }}>
                            <Typography className={styles.userName}>
                              {user.anonymous
                                ? anonymousNameMap.current.get(user._id) ||
                                  (() => {
                                    const name = getRandomFunName();
                                    anonymousNameMap.current.set(user._id, name);
                                    return name;
                                  })()
                                : user.username}
                              <Box
                                component="span"
                                className={styles.statusIndicator}
                                sx={{
                                  backgroundColor:
                                    statusColors[getUserStatus(user.lastSeen)],
                                  ...(user.anonymous && {
                                    backgroundColor: statusColors.offline,
                                  }),
                                }}
                              />
                            </Typography>
                            <Typography className={styles.lastSeen}>
                              {user.lastSeen
                                ? `${t('active')} ${formatDistanceToNow(
                                    new Date(user.lastSeen),
                                    { addSuffix: true }
                                  )}`
                                : t('lastSeenUnknown')}
                            </Typography>
                            {Number.isFinite(user.distanceKm) && (
                              <Typography className={styles.distance}>
                                {user.distanceKm! < 1
                                  ? 'Less than 1 km away'
                                  : `${user.distanceKm!.toFixed(1)} km away`}
                              </Typography>
                            )}
                          </Box>
                        </Box>

                        {user.userId && (
                          <Button
                            variant="outlined"
                            color="primary"
                            className={styles.chatButton}
                            onClick={() => handleStartChat(user.userId!)}
                            aria-label={
                              t('chatWith', {
                                username: user.username || t('traveler'),
                              })
                            }
                            startIcon={<span>💬</span>}
                          >
                            {t('chat')}
                          </Button>
                        )}
                      </Box>
                    </ListItem>
                    {index < users.length - 1 && (
                      <Divider className={styles.userDivider} />
                    )}
                  </div>
                ))}
              </List>

              <div ref={ref} className={styles.infiniteScrollLoader}>
                {loadingMore && <CircularProgress size={24} />}
                {!hasMore && users.length > 0 && (
                  <Typography variant="body2" color="textSecondary">
                    {t('noMoreUsers')}
                  </Typography>
                )}
              </div>
            </>
          ) : (
            <Box className={styles.emptyState}>
              <Typography variant="body1" mb={2}>
                {t('noUsersFound')}
              </Typography>
            </Box>
          )}
        </div>
      </Container>
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
