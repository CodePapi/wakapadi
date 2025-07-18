import { useEffect, useState, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import {
  Box,
  Container,
  Typography,
  Button,
  CircularProgress,
  // Switch,
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
import { motion } from 'framer-motion';
import PlaceIcon from '@mui/icons-material/Place';
import styles from '../styles/whois.module.css';
import funNames from '../lib/data/funNames.json';

const getRandomFunName = () =>
  funNames[Math.floor(Math.random() * funNames.length)];
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 1) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1],
    },
  }),
};

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
}

export default function WhoisPage() {
  const [hasMounted, setHasMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  // const [visible, setVisible] = useState(true);
  const [city, setCity] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [ref, inView] = useInView();
  const router = useRouter();
  const { t } = useTranslation('common');

  const chatbotUser: User = {
    _id: 'chatbot-id',
    userId: 'chatbot',
    username: 'Lola the Bot 🤖',
    anonymous: false,
    lastSeen: new Date().toISOString(),
  };
  useEffect(() => {
    setHasMounted(true);
    const token = localStorage.getItem('token');
    const storedUserId = localStorage.getItem('userId');
    setIsLoggedIn(!!token);
    if (storedUserId) setUserId(storedUserId);
  }, []);

  const fetchNearby = useCallback(
    async (targetCity: string, pageNum = 1) => {
      try {
        // (() => {
        //   pageNum === 1 ? setLoading(true) : setLoadingMore(true);
        // })();
        setError(null);

        const res = await api.get('/whois/nearby', {
          params: {
            city: targetCity,
            userId,
            page: pageNum,
            limit: 15,
          },
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (pageNum === 1) {
          console.log({ ...res.data });
          setUsers([chatbotUser, ...res.data]);
        } else {
          setUsers((prev) => [chatbotUser, ...prev, ...res.data]);
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
    [userId, t]
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

  // const togglePresence = async () => {
  //   try {
  //     await api.patch('/whois', { visible: !visible });
  //     setVisible(!visible);
  //   } catch (err) {
  //     console.error('Toggle visibility failed:', err);
  //   }
  // };

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
        // setError('Location detection timed out. Please ensure location services are enabled.');
      }, 10000);
      // const timeout = setTimeout(() => {
      //   console.warn('⚠️ Geolocation timed out after 10s');
      //   setLoading(false);
      // }, 10000);

      try {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            clearTimeout(timeout);

            try {
              const res = await api.get(
                `/geolocation/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`
              );

              const geocode = res.data;
              const detectedCity = (
                geocode.address.city ||
                geocode.address.town ||
                ''
              )
                .trim()
                .toLowerCase();
              setCity(detectedCity);
              if (isLoggedIn) await pingPresence(detectedCity);
              await fetchNearby(detectedCity);
            } catch (geoErr) {
              console.error('Geocoding failed:', geoErr);
              setError(
                'Could not determine your location. Please try again or enter your city manually.'
              );
            } finally {
              setLoading(false);
            }
          },
          (geoErr) => {
            clearTimeout(timeout);
            console.error('Geolocation error:', geoErr);
            setError(
              'Location access denied. Please enable location services to see nearby users.'
            );
            setLoading(false);
          }
        );
      } catch (err) {
        clearTimeout(timeout);
        console.error('Unexpected error in geolocation flow:', err);
        setError('An unexpected error occurred. Please try again.');
        setLoading(false);
      }
    };

    detectCityAndLoad();
  }, [hasMounted, isLoggedIn]);

  // Load more when scroll reaches bottom
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
      <Skeleton variant='circular' width={44} height={44} />
      <Box sx={{ flex: 1 }}>
        <Skeleton variant='text' width='60%' height={24} />
        <Skeleton variant='text' width='40%' height={20} />
      </Box>
      {isLoggedIn && <Skeleton variant='rectangular' width={80} height={36} />}
    </Box>
  );

  if (!hasMounted) return null;

  return (
    <Layout title={`#${t('whoisNearby')} – Wakapadi`}>
      <Head>
        <title>{`#${t('whoisNearby')} – Wakapadi`}</title>
        <meta name='description' content={t('whoisDescription')} />
        {/* ... other meta tags ... */}
      </Head>

      <Container maxWidth='md' className={styles.container}>
        {/* <motion.div initial="hidden" animate="visible" variants={fadeInUp}>  */}
        <motion.div initial='hidden' variants={fadeInUp}>
          <div className={styles.content}>
            <header className={styles.header}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
              >
                {/* <Typography variant="h1" className={styles.headerTitle}>
                  #{t('whoisNearby')}
                </Typography> */}
                <Typography
                  variant='subtitle1'
                  className={styles.headerSubtitle}
                >
                  {t('discoverTravelers')}
                </Typography>
              </motion.div>

              {city && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  <Chip
                    label={`📍 ${t('near')} ${
                      city.charAt(0).toUpperCase() + city.slice(1)
                    }`}
                    className={styles.locationChip}
                    icon={<PlaceIcon fontSize='small' />}
                  />
                </motion.div>
              )}
            </header>

            {error && (
              <Alert severity='error' className={styles.errorAlert}>
                {error}
                <Button
                  variant='text'
                  color='inherit'
                  onClick={() => window.location.reload()}
                  sx={{ ml: 1 }}
                >
                  {t('retry')}
                </Button>
              </Alert>
            )}

            {isLoggedIn ? (
              <>
                {/* <Box className={styles.visibilityToggle}> */}
                {/* <Box display="flex" alignItems="center" width="100%">
                  <Typography variant="body1" mr={2}>
                    {t('visibility')}:
                  </Typography>
                  <Switch
                    checked={visible}
                    onChange={togglePresence}
                    color="primary"
                    inputProps={{ 'aria-label': t('toggleVisibility') }}
                  />
                  <Typography
                    ml={1}
                    color={visible ? 'primary.main' : 'text.secondary'}
                  >
                    {visible ? t('visibleToOthers') : t('hidden')}
                  </Typography>
                </Box>
                <Typography variant="caption" mt={1} color="text.secondary">
                  {visible
                    ? t('visibilityDescription')
                    : t('hiddenDescription')}
                </Typography> */}
                {/* </Box> */}
              </>
            ) : (
              <Box mb={3} textAlign='center'>
                {/* <Typography variant="body1" className={styles.subtitle}>
                  {t('connectPrompt')}
                </Typography> */}
                <Button
                  variant='contained'
                  color='primary'
                  onClick={() => router.push('/login')}
                  size='large'
                  sx={{ mt: 1 }}
                  className={styles.ctaButton}
                >
                  {t('loginToConnect')}
                </Button>
              </Box>
            )}

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
                    <motion.div
                      key={`${user._id}-${index}`}
                      variants={fadeInUp}
                      custom={index + 1}
                    >
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
                                  ? getRandomFunName()
                                  : user.username}
                                <Box
                                  component='span'
                                  className={styles.statusIndicator}
                                  sx={{
                                    backgroundColor:
                                      statusColors[
                                        getUserStatus(user.lastSeen)
                                      ],
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
                            </Box>
                          </Box>

                          {isLoggedIn && !user.anonymous && user.userId && (
                            <Button
                              variant='outlined'
                              color='primary'
                              className={styles.chatButton}
                              onClick={() =>
                                router.push(
                                  user.userId === 'chatbot'
                                    ? 'chatbot'
                                    : `/chat/${user.userId}`
                                )
                              }
                              aria-label={t('chatWith', {
                                username: user.username,
                              })}
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
                    </motion.div>
                  ))}
                </List>

                <div ref={ref} className={styles.infiniteScrollLoader}>
                  {loadingMore && <CircularProgress size={24} />}
                  {!hasMore && users.length > 0 && (
                    <Typography variant='body2' color='textSecondary'>
                      {t('noMoreUsers')}
                    </Typography>
                  )}
                </div>
              </>
            ) : (
              <Box className={styles.emptyState}>
                <Typography variant='body1' mb={2}>
                  {isLoggedIn ? t('noUsersFound') : t('loginPrompt')}
                </Typography>
                {!isLoggedIn && (
                  <Button
                    variant='outlined'
                    color='primary'
                    onClick={() => router.push('/login')}
                    className={styles.secondaryButton}
                  >
                    {t('signIn')}
                  </Button>
                )}
              </Box>
            )}
          </div>
        </motion.div>
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
