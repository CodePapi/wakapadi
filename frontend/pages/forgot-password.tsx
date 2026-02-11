// pages/forgot-password.tsx
import { SetStateAction, useState } from 'react';
import { Container, TextField, Typography, Button, Alert } from '@mui/material';
import { api } from '../lib/api/index';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { t } = useTranslation('common');

  const handleSubmit = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email) {
      setError(t('forgotEmailRequired'));
      return;
    }

    try {
      const res = await api.post('/auth/forgot-password', { email });
      setMessage(
        res.data.message ||
          t('forgotEmailSent')
      );
      setEmail('');
    } catch (err) {
      console.error(err);
      setError(t('forgotEmailError'));
    }
  };

  return (
    <Layout title={t('forgotPageTitle')}>
      <PageHeader
        title={t('forgotTitle')}
        subtitle={t('forgotSubtitle')}
      />
      <Container
        maxWidth="sm"
        sx={{ mt: 6, p: 4, boxShadow: 3, borderRadius: 3, bgcolor: 'background.paper' }}
      >
        <Typography variant="h5" gutterBottom>
          {t('forgotTitle')}
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          {t('forgotBody')}
        </Typography>

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label={t('forgotEmailLabel')}
            type="email"
            value={email}
            onChange={(e: { target: { value: SetStateAction<string>; }; }) => setEmail(e.target.value)}
            margin="normal"
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
            {t('forgotSubmit')}
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
