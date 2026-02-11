// pages/register.tsx
import { Container } from '@mui/material';
import AuthForm from '../components/AuthForm';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export default function RegisterPage() {
  const { t } = useTranslation('common');
  return (
    <Layout title={t('registerPageTitle')}>
      <PageHeader
        title={t('registerTitle')}
        subtitle={t('registerSubtitle')}
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
