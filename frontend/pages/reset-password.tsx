// pages/reset-password.tsx
// pages/reset-password.tsx
import { useEffect } from 'react';
import { Container, Typography } from '@mui/material';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { t } = useTranslation('common');

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
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}
