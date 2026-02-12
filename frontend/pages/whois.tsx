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
import { getSocket } from '../lib/socket';

// --- Utilities ---
const getRandomFunName = () => funNames[Math.floor(Math.random() * funNames.length)];

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
  status?: 'active' | 'idle' | 'offline';
}

const toRadians = (value: number) => (value * Math.PI) / 180;
const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

export default function WhoIsNearby() {
  const router = useRouter();
  const { t } = useTranslation('common');
  
  // --- State ---
  const [hasMounted, setHasMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [city, setCity] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoRequested, setGeoRequested] = useState(false);

  const [ref, inView] = useInView();
  const anonymousNameMap = useRef<Map<string, string>>(new Map());

  // --- Helpers ---
  const getUserStatus = (lastSeen?: string) => {
    if (!lastSeen) return 'offline';
    const minutesAgo = (new Date().getTime() - new Date(lastSeen).getTime()) / (1000 * 60);
    if (minutesAgo < 5) return 'active';
    if (minutesAgo < 30) return 'idle';
    return 'offline';
  };

  // --- Data Fetching ---
  const fetchNearby = useCallback(
    async (targetCity: string, pageNum = 1) => {
      try {
        if (pageNum > 1) setLoadingMore(true);
        setError(null);

        const res = await api.get('/whois/nearby', {
          params: { city: targetCity, userId: currentUserId, page: pageNum, limit: 15 },
          headers: { Authorization: `Bearer ${safeStorage.getItem('token') || ''}` },
        });

        const enriched = res.data.map((user: User) => {
          if (!currentCoords || !user.coordinates) return { ...user, distanceKm: null };
          const distanceKm = haversineKm(
            currentCoords.lat,
            currentCoords.lng,
            user.coordinates.lat,
            user.coordinates.lng
          );
          return { ...user, distanceKm };
        });

        setUsers((prev) => (pageNum === 1 ? enriched : [...prev, ...enriched]));
        setHasMore(res.data.length === 15);
      } catch (err) {
        console.error('Fetch nearby failed:', err);
        setError(t('fetchError'));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [currentUserId, t, currentCoords]
  );

  const pingPresence = async (targetCity: string) => {
    try {
      const res = await api.post('/whois/ping', { city: targetCity });
      if (res.status === 201) await fetchNearby(targetCity);
    } catch (err) {
      console.error('Ping presence failed:', err);
    }
  };

  // --- Event Handlers ---
  const handleFindNearby = async () => {
    setLoading(true);
    setError(null);
    setGeoRequested(true);

    if (!navigator.geolocation) {
      setError(t('whoisGeoError'));
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          setCurrentCoords({ lat: latitude, lng: longitude });

          const res = await api.get(`/geolocation/reverse?lat=${latitude}&lon=${longitude}`);
          const geocode = res.data;
          const detectedCity = (geocode?.address?.city || geocode?.address?.town || geocode?.address?.village || '').trim().toLowerCase();

          if (!detectedCity) {
            setError(t('whoisGeoError'));
            setLoading(false);
            return;
          }

          setCity(detectedCity);
          if (isLoggedIn) await pingPresence(detectedCity);
          await fetchNearby(detectedCity, 1);
        } catch (geoErr) {
          setError(t('whoisGeoError'));
          setLoading(false);
        }
      },
      () => {
        setError(t('whoisGeoDenied'));
        setLoading(false);
      },
      { timeout: 10000 }
    );
  };

  const handleStartChat = (targetUserId: string) => {
    router.push(`/chat/${targetUserId}`);
  };

  // --- Effects ---
  useEffect(() => {
    setHasMounted(true);
    (async () => {
      try {
        const session = await ensureAnonymousSession();
        setIsLoggedIn(!!session?.token);
        if (session?.userId) setCurrentUserId(session.userId);
      } catch (error) {
        console.warn('Session init failed', error);
      }
    })();
  }, []);

  useEffect(() => {
    const socket = getSocket();
    socket.on('userOnline', (uid: string) => {
      setUsers((prev) => prev.map((u) => (u.userId === uid ? { ...u, status: 'active' } : u)));
    });
    socket.on('userOffline', (uid: string) => {
      setUsers((prev) => prev.map((u) => (u.userId === uid ? { ...u, status: 'offline' } : u)));
    });
    socket.on('whoisUpdate', (updatedUsers: User[]) => setUsers(updatedUsers));

    return () => {
      socket.off('userOnline');
      socket.off('userOffline');
      socket.off('whoisUpdate');
    };
  }, []);

  useEffect(() => {
    if (inView && !loadingMore && hasMore && city) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchNearby(city, nextPage);
    }
  }, [inView, loadingMore, hasMore, city, page, fetchNearby]);

  if (!hasMounted) return null;

  // --- Components ---
  const UserSkeleton = () => (
    <Box sx={{ display: 'flex', alignItems: 'center', p: 2, gap: 2 }}>
      <Skeleton variant="circular" width={44} height={44} />
      <Box sx={{ flex: 1 }}>
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="text" width="40%" />
      </Box>
    </Box>
  );

  return (
    <Layout title={`#${t('whoisNearby')} – Wakapadi`}>
      <Head>
        <title>{`#${t('whoisNearby')} – Wakapadi`}</title>
      </Head>

      <section className={styles.hero}>
        <Container maxWidth="lg">
          <Typography variant="h3" fontWeight="bold">{t('whoisNearby')}</Typography>
          <Typography variant="h6" sx={{ opacity: 0.8, mb: 3 }}>{t('discoverTravelers')}</Typography>
          {!geoRequested && (
            <Button variant="contained" size="large" onClick={handleFindNearby}>
              {t('findNearbyBtn')}
            </Button>
          )}
          {city && (
            <Chip 
              icon={<PlaceIcon />} 
              label={`${t('near')} ${city.toUpperCase()}`} 
              color="primary" 
              sx={{ mt: 2 }}
            />
          )}
        </Container>
      </section>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Alert severity="info" sx={{ mb: 4 }}>{t('whoisSafetyWarning')}</Alert>

        {loading ? (
          <Box>{[...Array(3)].map((_, i) => <UserSkeleton key={i} />)}</Box>
        ) : users.length > 0 ? (
          <>
            <List>
              {users.map((user, index) => {
                const displayName = user.anonymous 
                  ? (anonymousNameMap.current.get(user._id) || (() => {
                      const name = getRandomFunName();
                      anonymousNameMap.current.set(user._id, name);
                      return name;
                    })())
                  : user.username;

                return (
                  <div key={`${user._id}-${index}`}>
                    <ListItem sx={{ py: 2, display: 'flex', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <Avatar>{displayName?.charAt(0)}</Avatar>
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {displayName}
                            <Box component="span" sx={{ 
                              display: 'inline-block', ml: 1, width: 8, height: 8, borderRadius: '50%',
                              bgcolor: statusColors[user.status || getUserStatus(user.lastSeen)] 
                            }} />
                          </Typography>
                          <Typography variant="caption" display="block">
                            {user.lastSeen ? formatDistanceToNow(new Date(user.lastSeen), { addSuffix: true }) : t('lastSeenUnknown')}
                          </Typography>
                          {user.distanceKm !== null && (
                            <Typography variant="body2" color="primary">
                              {user.distanceKm! < 1 ? '< 1 km away' : `${user.distanceKm!.toFixed(1)} km away`}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      {user.userId && (
                        <Button variant="outlined" onClick={() => handleStartChat(user.userId!)}>
                          {t('chat')}
                        </Button>
                      )}
                    </ListItem>
                    <Divider />
                  </div>
                );
              })}
            </List>
            <div ref={ref} style={{ textAlign: 'center', padding: '20px' }}>
              {loadingMore && <CircularProgress size={24} />}
            </div>
          </>
        ) : (
          geoRequested && !loading && <Typography align="center">{t('noUsersFound')}</Typography>
        )}
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