// pages/reset-password.tsx
import { SetStateAction, useState } from 'react';
import { Container, TextField, Typography, Button, Alert } from '@mui/material';
import { useRouter } from 'next/router';
import { api } from '../lib/api/index';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { safeStorage } from '../lib/storage';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { token } = router.query;
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const { t } = useTranslation('common');

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!token) {
      setError(t('resetInvalidToken'));
      return;
    }

    if (!password || password.length < 6) {
      setError(t('resetPasswordTooShort'));
      return;
    }

    if (password !== confirm) {
      setError(t('resetPasswordMismatch'));
      return;
    }

    try {
      const res = await api.post('/auth/reset-password', {
        token,
        newPassword: password,
      });
      setMessage(
        res.data.message || t('resetSuccess')
      );
      setPassword('');
      setConfirm('');
          safeStorage.setItem('token', res.data.token);
          safeStorage.setItem('userId', res.data.userId);
      router.push('/');
    } catch (err) {
      console.error(err);
      setError(t('resetError'));
    }
  };

  return (
    <Layout title={t('resetPageTitle')}>
      <PageHeader
        title={t('resetTitle')}
        subtitle={t('resetSubtitle')}
      />
      <Container
        maxWidth="sm"
        sx={{ mt: 6, p: 4, boxShadow: 3, borderRadius: 3, bgcolor: 'background.paper' }}
      >
        <Typography variant="h5" gutterBottom>
          {t('resetTitle')}
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          {t('resetBody')}
        </Typography>

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label={t('resetNewPasswordLabel')}
            type="password"
            margin="normal"
            value={password}
            onChange={(e: { target: { value: SetStateAction<string> } }) =>
              setPassword(e.target.value)
            }
            required
          />
          <TextField
            fullWidth
            label={t('resetConfirmPasswordLabel')}
            type="password"
            margin="normal"
            value={confirm}
            onChange={(e: { target: { value: SetStateAction<string> } }) =>
              setConfirm(e.target.value)
            }
            required
          />

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          {message && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {message}
            </Alert>
          )}

          <Button type="submit" variant="contained" fullWidth sx={{ mt: 3 }}>
            {t('resetSubmit')}
          </Button>
        </form>
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
