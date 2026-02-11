// src/pages/peer/[userId].tsx
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import {
  Container, Typography, Box, Chip, CircularProgress,
  Avatar, Divider, List, ListItem, ListItemText, ListItemAvatar, Snackbar, Alert, IconButton
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import BlockIcon from '@mui/icons-material/Block';
import ReportIcon from '@mui/icons-material/Report';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import { api } from '../../lib/api/index';
import moment from 'moment-timezone';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
interface Peer {
  _id: string;
  username: string;
  avatarUrl?: string;
  travelPrefs?: string[];
  languages?: string[];
  socials?: {
    instagram?: string;
    twitter?: string;
  };
}

interface Message {
  fromUserId: string;
  toUserId: string;
  message: string;
  timestamp?: string;
}

const PeerProfile = () => {
  const router = useRouter();
  const { userId } = router.query;
  const { t } = useTranslation('common');

  const [peer, setPeer] = useState<Peer|null>(null);
  const [loading, setLoading] = useState(true);
  const [lastSeen, setLastSeen] = useState<string>('');
  const [mutualMessages, setMutualMessages] = useState<Message[]>([]);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!userId) return;

    const fetchPeerData = async () => {
        try {
          const res = await api.get(`/users/preferences/${userId}`);
          console.log('Preferences:', res.data);
          setPeer(res.data);
      
          const activity = await api.get(`/presence/${userId}`);
          console.log('Presence:', activity.data);
          setLastSeen(activity.data.lastSeen || '');
      
          const history = await api.get(`/whois/chat/${userId}?limit=5`);
          console.log('History:', history.data);
          setMutualMessages(history.data.messages || []);
        } catch (err) {
          console.error('Failed to load peer profile:', err);
        } finally {
          setLoading(false);
        }
      };
      

    fetchPeerData();
  }, [userId]);

  const handleBlock = async () => {
    try {
      await api.post(`/users/block/${userId}`);
      setSuccessMessage(t('peerBlockSuccess'));
    } catch (err) {
      console.error('Block failed:', err);
    }
  };

  const handleReport = async () => {
    try {
      await api.post(`/users/report/${userId}`, { reason: 'Inappropriate behavior' });
      setSuccessMessage(t('peerReportSuccess'));
    } catch (err) {
      console.error('Report failed:', err);
    }
  };

  return (
    <Layout title={t('peerPageTitle')}>
      <PageHeader
        title={t('peerTitle')}
        subtitle={t('peerSubtitle')}
      />
      <Container sx={{ mt: 4 }}>
        {loading ? (
          <CircularProgress />
        ) : peer ? (
          <Box>
            <Box display="flex" alignItems="center" mb={3}>
              <Avatar
                src={peer.avatarUrl || `https://i.pravatar.cc/100?u=${peer._id}`}
                sx={{ width: 80, height: 80, mr: 2 }}
              />
              <Box>
                <Typography variant="h5">{peer.username}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('peerUserId', { id: peer._id })}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {lastSeen
                    ? t('peerLastSeen', { time: moment(lastSeen).fromNow() })
                    : t('peerFetchingStatus')}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" gutterBottom>{t('peerTravelPreferences')}</Typography>
            <Box mb={2}>
              {peer.travelPrefs?.length ? peer.travelPrefs.map((tag: string) => (
                <Chip key={tag} label={tag} sx={{ mr: 1, mb: 1 }} />
              )) : <Typography variant="body2" color="text.secondary">{t('peerNoPreferences')}</Typography>}
            </Box>

            <Typography variant="h6" gutterBottom>{t('peerLanguages')}</Typography>
            <Box mb={2}>
              {peer.languages?.length ? peer.languages.map((lang: string) => (
                <Chip key={lang} label={lang} sx={{ mr: 1, mb: 1 }} />
              )) : <Typography variant="body2" color="text.secondary">{t('peerNoLanguages')}</Typography>}
            </Box>

            <Typography variant="h6" gutterBottom>{t('peerSocialLinks')}</Typography>
            <List>
              {peer.socials?.instagram && (
                <ListItem>
                  <ListItemAvatar>
                    <Avatar src="/icons/instagram.svg" />
                  </ListItemAvatar>
                  <ListItemText primary={`@${peer.socials.instagram}`} secondary={t('peerInstagram')} />
                </ListItem>
              )}
              {peer.socials?.twitter && (
                <ListItem>
                  <ListItemAvatar>
                    <Avatar src="/icons/twitter.svg" />
                  </ListItemAvatar>
                  <ListItemText primary={`@${peer.socials.twitter}`} secondary={t('peerTwitter')} />
                </ListItem>
              )}
            </List>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              {t('peerRecentMessages', { username: peer.username })}
            </Typography>
            <Box>
              {mutualMessages.length ? mutualMessages.map((msg, idx) => (
                <Typography key={idx} variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {msg.fromUserId === peer._id
                    ? `${peer.username}: `
                    : `${t('peerYouPrefix')}: `}
                  {msg.message}
                </Typography>
              )) : (
                <Typography variant="body2" color="text.secondary">{t('peerNoMessages')}</Typography>
              )}
            </Box>

            <Box mt={4} display="flex" gap={2}>
              <IconButton color="primary" href={`/chat/${peer._id}`}><ChatIcon /></IconButton>
              <IconButton color="warning" onClick={handleBlock}><BlockIcon /></IconButton>
              <IconButton color="error" onClick={handleReport}><ReportIcon /></IconButton>
            </Box>

            <Snackbar
              open={!!successMessage}
              autoHideDuration={4000}
              onClose={() => setSuccessMessage('')}
            >
              <Alert severity="success" onClose={() => setSuccessMessage('')}>
                {successMessage}
              </Alert>
            </Snackbar>
          </Box>
        ) : (
          <Typography color="error">{t('peerNotFound')}</Typography>
        )}
      </Container>
    </Layout>
  );
};

export default PeerProfile;

export async function getServerSideProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}
