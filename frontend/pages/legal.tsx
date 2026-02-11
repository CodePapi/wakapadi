import { Typography, Container, Paper, Box } from '@mui/material';
import Head from 'next/head';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import styles from '../styles/FooterPages.module.css';

export default function LegalPage() {
  const { t } = useTranslation('common');

  return (
    <Layout title={t('legalPageTitle')}>
      <Head>
        <meta name="description" content={t('legalMetaDescription')} />
      </Head>

      <PageHeader title={t('legalTitle')} subtitle={t('legalSubtitle')} />

      <Container className={styles.container}>
        <Paper className={styles.contentPaper}>
          <Typography variant="h2" className={styles.pageTitle}>
            {t('legalTitle')}
          </Typography>

          <Typography className={styles.bodyText}>
            {t('legalIntro')}
          </Typography>

          <Box className={styles.summaryCard}>
            <Typography variant="h4" className={styles.summaryTitle}>
              {t('legalEntityTitle')}
            </Typography>
            <Typography className={styles.summaryText}>
              {t('legalEntityBody')}
            </Typography>
            <div className={styles.metaRow}>
              <span>{t('legalCompanyLine')}</span>
              <span>{t('legalAddressLine')}</span>
              <span>{t('legalRegistrationLine')}</span>
            </div>
          </Box>

          <Typography variant="h3" className={styles.sectionTitle}>
            {t('legalContactTitle')}
          </Typography>
          <Typography className={styles.bodyText}>
            {t('legalContactBody')}{' '}
            <span className={styles.contactEmail}>legal@wakapadi.com</span>.
          </Typography>

          <Typography variant="h3" className={styles.sectionTitle}>
            {t('legalDisclaimerTitle')}
          </Typography>
          <Typography className={styles.bodyText}>
            {t('legalDisclaimerBody')}
          </Typography>

          <Typography variant="h3" className={styles.sectionTitle}>
            {t('legalJurisdictionTitle')}
          </Typography>
          <Typography className={styles.bodyText}>
            {t('legalJurisdictionBody')}
          </Typography>

          <div className={styles.metaRow}>
            <span>{t('legalEffectiveDate')}</span>
          </div>
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
