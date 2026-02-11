// pages/contact-us.tsx
import { Container } from '@mui/material';
import ContactForm from '../components/ContactForm';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export default function ContactPage() {
  const { t } = useTranslation('common');
  return (
    <Layout title={t('contactPageTitle')}>
      <PageHeader
        title={t('contactTitle')}
        subtitle={t('contactSubtitle')}
      />
      <Container maxWidth="md" sx={{ mt: 6, mb: 8 }}>
        <ContactForm />
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
