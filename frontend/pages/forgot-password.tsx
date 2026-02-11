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
    // pages/forgot-password.tsx
    import { useEffect } from 'react';
    import { Container, Typography } from '@mui/material';
    import Layout from '../components/Layout';
    import PageHeader from '../components/PageHeader';
    import { useTranslation } from 'next-i18next';
    import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
    import { useRouter } from 'next/router';

    export default function ForgotPasswordPage() {
      const { t } = useTranslation('common');
      const router = useRouter();

      useEffect(() => {
        router.replace('/');
      }, [router]);

      return (
        <Layout title={t('authDeprecatedTitle')}>
          <PageHeader
            title={t('authDeprecatedTitle')}
            subtitle={t('authDeprecatedSubtitle')}
          />
          <Container maxWidth="sm" sx={{ mt: 6 }}>
            <Typography>{t('authDeprecatedBody')}</Typography>
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

