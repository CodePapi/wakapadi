import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Container,
  Typography,
  CircularProgress,
  ListItemAvatar,
  Avatar,
  Box,
  List,
  ListItem,
  ListItemText,
  Chip,
  Button,
  MenuItem,
  Select,
  OutlinedInput,
  Snackbar,
  Alert,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import io, { Socket } from 'socket.io-client';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import moment from 'moment';
import { api } from '../lib/api/index';
import styles from '../styles/Profile.module.css';
import { safeStorage } from '../lib/storage';
import { clearDeviceId, ensureAnonymousSession } from '../lib/anonymousAuth';

interface User {
  _id: string;
  username: string;
  avatarUrl?: string;
  travelPrefs?: string[];
  languages?: string[];
  bio?: string;
  profileVisible?: boolean;
  gender?: string;
  socials?: {
    instagram?: string;
    twitter?: string;
  };
}

interface Conversation {
  _id: string;
  otherUser: {
    _id: string;
    username: string;
    avatarUrl?: string;
  };
  message: {
    _id: string;
    message: string;
    createdAt: string;
  };
}

const travelOptions = [
  { value: 'Adventure', labelKey: 'travelOptionAdventure' },
  { value: 'Culture', labelKey: 'travelOptionCulture' },
  { value: 'Food', labelKey: 'travelOptionFood' },
  { value: 'Photography', labelKey: 'travelOptionPhotography' },
  { value: 'Nature', labelKey: 'travelOptionNature' },
  { value: 'Relaxation', labelKey: 'travelOptionRelaxation' },
  { value: 'City', labelKey: 'travelOptionCity' },
];
const languageOptions = [
  { value: 'English', labelKey: 'languageEnglish' },
  { value: 'French', labelKey: 'languageFrench' },
  { value: 'Spanish', labelKey: 'languageSpanish' },
  { value: 'German', labelKey: 'languageGerman' },
  { value: 'Italian', labelKey: 'languageItalian' },
  { value: 'Portuguese', labelKey: 'languagePortuguese' },
  { value: 'Japanese', labelKey: 'languageJapanese' },
  { value: 'Chinese', labelKey: 'languageChinese' },
];

export default function ProfilePage() {
  const { t } = useTranslation('common');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const socketRef = useRef<Socket | null>(null);
  
  const [travelPrefs, setTravelPrefs] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [instagram, setInstagram] = useState('');
  const [twitter, setTwitter] = useState('');
  const [profileVisible, setProfileVisible] = useState(true);
  const [gender, setGender] = useState('');
  const [notifications, setNotifications] = useState({
    success: '',
    error: '',
  });

  const getTravelLabel = useCallback((value: string) => {
    const option = travelOptions.find((opt) => opt.value === value);
    return option ? t(option.labelKey) : value;
  }, [t]);

  const getLanguageLabel = useCallback((value: string) => {
    const option = languageOptions.find((opt) => opt.value === value);
    return option ? t(option.labelKey) : value;
  }, [t]);

  const getGenderLabel = (value?: string) => {
    if (!value) return t('profileGenderUndisclosed');
    const labels: Record<string, string> = {
      female: t('profileGenderFemale'),
      male: t('profileGenderMale'),
      nonbinary: t('profileGenderNonBinary'),
      other: t('profileGenderOther'),
    };
    return labels[value] || t('profileGenderOther');
  };

  const fetchInbox = useCallback(async () => {
    try {
      const res = await api.get('/whois/chat/inbox');
      setConversations(res.data);
    } catch (error) {
      console.error('Failed to fetch inbox', error);
    }
  }, []);

  const initData = useCallback(async () => {
    try {
      setLoading(true);
      const session = await ensureAnonymousSession();
      const userId = session.userId || '';

      const [userRes] = await Promise.all([
        api.get(`/users/preferences/${userId}`),
        fetchInbox(),
      ]);

      const userData = userRes.data;
      setUser(userData);
      setTravelPrefs(userData.travelPrefs || []);
      setLanguages(userData.languages || []);
      setInstagram(userData.socials?.instagram || '');
      setTwitter(userData.socials?.twitter || '');
      setProfileVisible(userData.profileVisible ?? true);
      setGender(userData.gender || '');

      // Initialize Socket
      if (!socketRef.current) {
        const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || '', {
          auth: { token: safeStorage.getItem('token') },
        });

        newSocket.on('newMessage', fetchInbox);
        socketRef.current = newSocket;
      }
    } catch (error) {
      console.error('Profile load error', error);
      setNotifications((prev) => ({
        ...prev,
        error: t('profileLoadError'),
      }));
    } finally {
      setLoading(false);
    }
  }, [fetchInbox, t]);

  useEffect(() => {
    initData();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [initData]);

  const handleSave = async () => {
    try {
      await api.patch('/users/preferences', {
        travelPrefs,
        languages,
        profileVisible,
        gender,
        socials: { instagram, twitter },
      });
      setNotifications({
        success: t('profileSaveSuccess'),
        error: '',
      });
    } catch (err) {
      console.error('Failed to save profile', err);
      setNotifications({
        success: '',
        error: t('profileSaveError'),
      });
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await api.delete('/auth/me');
      safeStorage.removeItem('token');
      safeStorage.removeItem('userId');
      safeStorage.removeItem('username');
      clearDeviceId();
      window.location.href = '/';
    } catch (err) {
      console.error('Failed to delete account', err);
      setNotifications({ success: '', error: t('profileDeleteError') });
    }
  };

  return (
    <Layout title={t('profilePageTitle')}>
      <PageHeader
        title={t('profileTitle')}
        subtitle={t('profileSubtitle')}
      />
      <Container maxWidth="lg" className={styles.container}>
        {loading ? (
          <Box display="flex" flexDirection="column" alignItems="center" mt={10}>
            <CircularProgress />
            <Typography mt={2}>{t('profileLoading')}</Typography>
          </Box>
        ) : user ? (
          <>
            <section className={styles.profileHero}>
              <div className={styles.profileIdentity}>
                <Avatar
                  src={user.avatarUrl || `/default-avatar.png`}
                  className={styles.avatar}
                />
                <div className={styles.profileIdentityText}>
                  <h2 className={styles.username}>{user.username}</h2>
                  <div className={styles.metaRow}>
                    <Chip label={getGenderLabel(gender)} size="small" />
                    <Chip 
                      label={profileVisible ? t('profileVisibilityOn') : t('profileVisibilityOff')} 
                      color={profileVisible ? "success" : "default"}
                      size="small"
                    />
                  </div>
                </div>
              </div>
              <Button variant="contained" onClick={handleSave}>
                {t('profileSaveButton')}
              </Button>
            </section>

            <main className={styles.profileGrid}>
              <div className={styles.mainColumn}>
                <section className={styles.section}>
                  <Typography variant="h6" gutterBottom>{t('profilePreferencesTitle')}</Typography>
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={profileVisible}
                        onChange={(e) => setProfileVisible(e.target.checked)}
                      />
                    }
                    label={t('profileVisibilityLabel')}
                  />

                  <Box mt={3}>
                    <Typography variant="subtitle2">{t('profileGenderLabel')}</Typography>
                    <Select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as string)}
                      fullWidth
                      displayEmpty
                    >
                      <MenuItem value="">{t('profileGenderUndisclosed')}</MenuItem>
                      <MenuItem value="female">{t('profileGenderFemale')}</MenuItem>
                      <MenuItem value="male">{t('profileGenderMale')}</MenuItem>
                      <MenuItem value="nonbinary">{t('profileGenderNonBinary')}</MenuItem>
                      <MenuItem value="other">{t('profileGenderOther')}</MenuItem>
                    </Select>
                  </Box>

                  <Box mt={3}>
                    <Typography variant="subtitle2">{t('profileTravelInterestsLabel')}</Typography>
                    <Select
                      multiple
                      value={travelPrefs}
                      onChange={(e) => setTravelPrefs(e.target.value as string[])}
                      input={<OutlinedInput />}
                      fullWidth
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => (
                            <Chip key={value} label={getTravelLabel(value)} size="small" />
                          ))}
                        </Box>
                      )}
                    >
                      {travelOptions.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>{t(opt.labelKey)}</MenuItem>
                      ))}
                    </Select>
                  </Box>

                  <Box mt={3}>
                    <Typography variant="subtitle2">{t('profileLanguagesLabel')}</Typography>
                    <Select
                      multiple
                      value={languages}
                      onChange={(e) => setLanguages(e.target.value as string[])}
                      input={<OutlinedInput />}
                      fullWidth
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => (
                            <Chip key={value} label={getLanguageLabel(value)} size="small" />
                          ))}
                        </Box>
                      )}
                    >
                      {languageOptions.map((lang) => (
                        <MenuItem key={lang.value} value={lang.value}>{t(lang.labelKey)}</MenuItem>
                      ))}
                    </Select>
                  </Box>
                </section>

                <section className={styles.section}>
                  <Typography variant="h6" gutterBottom>{t('profileRecentChats')}</Typography>
                  <List>
                    {conversations.length > 0 ? (
                      conversations.map((conv) => (
                        <ListItem
                          key={conv._id}
                          component={Link}
                          href={`/chat/${conv.otherUser._id}`}
                        >
                          <ListItemAvatar>
                            <Avatar src={conv.otherUser.avatarUrl} />
                          </ListItemAvatar>
                          <ListItemText
                            primary={conv.otherUser.username}
                            secondary={conv.message.message}
                          />
                          <Typography variant="caption">
                            {moment(conv.message.createdAt).fromNow()}
                          </Typography>
                        </ListItem>
                      ))
                    ) : (
                      <Typography color="textSecondary">{t('profileNoConversations')}</Typography>
                    )}
                  </List>
                </section>
              </div>

              <aside className={styles.sideColumn}>
                <Paper className={styles.dangerCard} sx={{ p: 2, bgcolor: '#fff5f5' }}>
                  <Typography variant="h6" color="error">{t('profileDeleteTitle')}</Typography>
                  <Typography variant="body2" mb={2}>{t('profileDeleteDescription')}</Typography>
                  <Button variant="outlined" color="error" fullWidth onClick={handleDeleteAccount}>
                    {t('profileDeleteAction')}
                  </Button>
                </Paper>
              </aside>
            </main>
          </>
        ) : (
          <Alert severity="error">{t('profileLoadErrorFallback')}</Alert>
        )}

        <Snackbar
          open={!!notifications.success}
          autoHideDuration={4000}
          onClose={() => setNotifications({ ...notifications, success: '' })}
        >
          <Alert severity="success" variant="filled">{notifications.success}</Alert>
        </Snackbar>
        <Snackbar
          open={!!notifications.error}
          autoHideDuration={4000}
          onClose={() => setNotifications({ ...notifications, error: '' })}
        >
          <Alert severity="error" variant="filled">{notifications.error}</Alert>
        </Snackbar>
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

// Helper for side columns in CSS modules (example)
import { Paper } from '@mui/material';