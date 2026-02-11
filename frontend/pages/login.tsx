// pages/login.tsx
import { Container } from '@mui/material';
import AuthForm from '../components/AuthForm';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export default function LoginPage() {
  const { t } = useTranslation('common');
  return (
    <Layout title={t('loginPageTitle')}>
      <PageHeader
        title={t('loginTitle')}
        subtitle={t('loginSubtitle')}
      />
      <Container sx={{ mt: 6 }}>
        <AuthForm />
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
