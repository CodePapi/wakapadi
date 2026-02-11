import { useEffect, useState } from 'react';
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
  TextField,
  MenuItem,
  Select,
  OutlinedInput,
  Snackbar,
  Alert,
  IconButton,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { Chat as ChatIcon } from '@mui/icons-material';
import Link from 'next/link';
import io, { Socket } from 'socket.io-client';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import moment from 'moment';
import { api } from '../lib/api/index';
import styles from '../styles/Profile.module.css';
import { StringNullableChain } from 'lodash';
import { safeStorage } from '../lib/storage';

interface User {
  _id: string;
  username: string;
  avatarUrl?: string;
  travelPrefs?: string[];
  languages?: string[];
  bio?:StringNullableChain;
  profileVisible?: boolean;
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
  const [socket, setSocket] = useState<Socket | null>(null);
  const [travelPrefs, setTravelPrefs] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [instagram, setInstagram] = useState('');
  const [twitter, setTwitter] = useState('');
  const [profileVisible, setProfileVisible] = useState(true);
  const [notifications, setNotifications] = useState({
    success: '',
    error: '',
  });

  const getTravelLabel = (value: string) =>
    travelOptions.find((option) => option.value === value)
      ? t(
          travelOptions.find((option) => option.value === value)!.labelKey
        )
      : value;

  const getLanguageLabel = (value: string) =>
    languageOptions.find((option) => option.value === value)
      ? t(
          languageOptions.find((option) => option.value === value)!.labelKey
        )
      : value;

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const userId = safeStorage.getItem('userId') || '';

        const [userRes, convRes] = await Promise.all([
          api.get(`/users/preferences/${userId}`), // Original endpoint
          api.get('/whois/chat/inbox'), // Original endpoint
        ]);

        setUser(userRes.data);
        setTravelPrefs(userRes.data.travelPrefs || []);
        setLanguages(userRes.data.languages || []);
        setInstagram(userRes.data.socials?.instagram || '');
        setTwitter(userRes.data.socials?.twitter || '');
        setProfileVisible(userRes.data.profileVisible ?? true);
        setConversations(convRes.data);

        const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || '', {
          auth: { token: safeStorage.getItem('token') },
        });

        newSocket.on('newMessage', () => {
          api.get('/conversations').then((res) => setConversations(res.data));
        });

        setSocket(newSocket);
      } catch (error) {
        console.log('error', error);
        setNotifications((prev) => ({
          ...prev,
          error: t('profileLoadError'),
        }));
      } finally {
        setLoading(false);
      }
    })();

    // fetchData();

    return () => {
      socket?.disconnect();
    };
  }, []);

  const handleSave = async () => {
    try {
      await api.patch('/users/preferences', {
        travelPrefs,
        languages,
        profileVisible,
        socials: { instagram, twitter },
      });
      setNotifications({
        success: t('profileSaveSuccess'),
        error: '',
      });
    } catch (error) {
      console.error('error', error);
      setNotifications({
        success: '',
        error: t('profileSaveError'),
      });
    }
  };

  const closeNotification = () => {
    setNotifications({ success: '', error: '' });
  };

  return (
    <Layout title={t('profilePageTitle')}>
      <PageHeader
        title={t('profileTitle')}
        subtitle={t('profileSubtitle')}
      />
      <Container maxWidth="md" className={styles.container}>
        {/* Profile Header */}
        <header className={styles.header}>
          {user && (
            <div className={styles.userInfo}>
              <Avatar
                src={user.avatarUrl || `/default-avatar.png`}
                alt={`${user.username}'s avatar`}
                className={styles.avatar}
              />
              <h2 className={styles.username}>{user.username}</h2>
              {/* Add a short bio or tagline here if available from API */}
              {/* {user.bio && <div><p className={styles.userBio}>{user.bio}.</p></div>} */}
            </div>
          )}
        </header>

        {/* Main Content */}
        {loading ? (
          <div className={styles.loading} role="status" aria-live="polite">
            <CircularProgress aria-label={t('profileLoadingAria')} />
            <p>{t('profileLoading')}</p>
          </div>
        ) : user ? (
          <main>
            {/* Preferences Section */}
            <section
              className={styles.section}
              aria-labelledby="preferences-heading"
            >
              <h2 id="preferences-heading" className={styles.sectionTitle}>
                {t('profilePreferencesTitle')}
              </h2>

              <div className={styles.formGroup}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={profileVisible}
                      onChange={(e) => setProfileVisible(e.target.checked)}
                      color="primary"
                      inputProps={{
                        'aria-label': t('profileVisibilityAria'),
                      }}
                    />
                  }
                  label={
                    profileVisible
                      ? t('profileVisibilityOn')
                      : t('profileVisibilityOff')
                  }
                />
                <p className={styles.helperText}>
                  {t('profileVisibilityHelp')}
                </p>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="travel-interests" className={styles.formLabel}>
                  {t('profileTravelInterestsLabel')}
                </label>
                <Select
                  multiple
                  value={travelPrefs}
                  onChange={(e) => setTravelPrefs(e.target.value as string[])}
                  input={<OutlinedInput id="travel-interests" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip
                          key={value}
                          label={getTravelLabel(value)}
                          onDelete={() =>
                            setTravelPrefs((prev) =>
                              prev.filter((item) => item !== value)
                            )
                          }
                          aria-label={t('removeItem', { item: getTravelLabel(value) })}
                        />
                      ))}
                    </Box>
                  )}
                  fullWidth
                  aria-describedby="travel-interests-help"
                >
                  {travelOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </MenuItem>
                  ))}
                </Select>
                <p id="travel-interests-help" className={styles.helperText}>
                  {t('profileTravelInterestsHelp')}
                </p>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="languages" className={styles.formLabel}>
                  {t('profileLanguagesLabel')}
                </label>
                <Select
                  multiple
                  value={languages}
                  onChange={(e) => setLanguages(e.target.value as string[])}
                  input={<OutlinedInput id="languages" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip
                          key={value}
                          label={getLanguageLabel(value)}
                          onDelete={() =>
                            setLanguages((prev) =>
                              prev.filter((item) => item !== value)
                            )
                          }
                          aria-label={t('removeItem', { item: getLanguageLabel(value) })}
                        />
                      ))}
                    </Box>
                  )}
                  fullWidth
                  aria-describedby="languages-help"
                >
                  {languageOptions.map((lang) => (
                    <MenuItem key={lang.value} value={lang.value}>
                      {t(lang.labelKey)}
                    </MenuItem>
                  ))}
                </Select>
                <p id="languages-help" className={styles.helperText}>
                  {t('profileLanguagesHelp')}
                </p>
              </div>
            </section>

            {/* Social Media Section */}
            <section
              className={styles.section}
              aria-labelledby="social-media-heading"
            >
              <h2 id="social-media-heading" className={styles.sectionTitle}>
                {t('profileSocialTitle')}
              </h2>
              <TextField
                label={t('profileInstagramLabel')}
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                fullWidth
                margin="normal"
                InputProps={{
                  startAdornment: <Typography mr={1}>@</Typography>,
                }}
                aria-label={t('profileInstagramAria')}
                placeholder={t('profileInstagramPlaceholder')}
              />
              <TextField
                label={t('profileTwitterLabel')}
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                fullWidth
                margin="normal"
                InputProps={{
                  startAdornment: <Typography mr={1}>@</Typography>,
                }}
                aria-label={t('profileTwitterAria')}
                placeholder={t('profileTwitterPlaceholder')}
              />
            </section>

            {/* Save Button */}
            <Button
              variant="contained"
              color="primary"
              onClick={handleSave}
              className={styles.saveButton}
              aria-label={t('profileSaveAria')}
            >
              {t('profileSaveButton')}
            </Button>

            {/* Conversations Section */}
            <section
              className={styles.section}
              aria-labelledby="recent-chats-heading"
            >
              <h2 id="recent-chats-heading" className={styles.sectionTitle}>
                {t('profileRecentChats')}
              </h2>
              <List className={styles.conversationList}>
                {conversations.length > 0 ? (
                  conversations.map((conv) => (
                    <ListItem
                      key={conv._id}
                      className={styles.conversationItem}
                      component={Link}
                      href={`/chat/${conv.otherUser._id}`}
                      aria-label={t('chatWith', { username: conv.otherUser.username })}
                    >
                      <ListItemAvatar>
                        <Avatar
                          src={conv.otherUser.avatarUrl}
                          alt={`${conv.otherUser.username}'s avatar`}
                        />
                      </ListItemAvatar>
                      <ListItemText
                        primary={conv.otherUser.username}
                        secondary={
                          <>
                            <Typography
                              component="span"
                              variant="body2"
                              color="text.primary"
                            >
                              {conv.message.message}
                            </Typography>
                            <Typography
                              variant="caption"
                              display="block"
                              color="text.secondary"
                            >
                              {moment(conv.message.createdAt).fromNow()}
                            </Typography>
                          </>
                        }
                      />
                      <IconButton
                        edge="end"
                        aria-label={t('profileGoToChat', { username: conv.otherUser.username })}
                      >
                        <ChatIcon />
                      </IconButton>
                    </ListItem>
                  ))
                ) : (
                  <p className={styles.noConversations}>
                    {t('profileNoConversations')}
                  </p>
                )}
              </List>
            </section>
          </main>
        ) : (
          <div className={styles.errorMessage} role="alert">
            <Typography color="error">
              {t('profileLoadErrorFallback')}
            </Typography>
          </div>
        )}

        {/* Notifications */}
        <Snackbar
          open={!!notifications.success}
          autoHideDuration={6000}
          onClose={closeNotification}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={closeNotification}
            severity="success"
            sx={{ width: '100%' }}
            variant="filled"
          >
            {notifications.success}
          </Alert>
        </Snackbar>
        <Snackbar
          open={!!notifications.error}
          autoHideDuration={6000}
          onClose={closeNotification}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={closeNotification}
            severity="error"
            sx={{ width: '100%' }}
            variant="filled"
          >
            {notifications.error}
          </Alert>
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
