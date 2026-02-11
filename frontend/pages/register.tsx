// pages/register.tsx
import { useEffect } from 'react';
import { Container, Typography } from '@mui/material';
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
      <Container sx={{ mt: 6 }}>
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
