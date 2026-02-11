// pages/register.tsx
import { useEffect } from 'react';
import { Container, Paper, Typography } from '@mui/material';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';

export default function RegisterPage() {
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
      <Container maxWidth="sm" sx={{ mt: 6, mb: 8 }}>
        <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 3 }}>
          <Typography>{t('authDeprecatedBody')}</Typography>
        </Paper>
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
