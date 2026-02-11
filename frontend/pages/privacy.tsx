import { Typography, Container, List, ListItem, Box } from '@mui/material';
import Head from 'next/head';
import Layout from '../components/Layout';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import styles from '../styles/StaticPage.module.css';

export default function PrivacyPolicy() {
  const { t } = useTranslation('common');

  return (
    <Layout title={t('privacyPolicy') + ' | Wakapadi'}>
      <Head>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <section className={styles.hero}>
        <Container maxWidth="lg" className={styles.heroInner}>
          <Box className={styles.heroCopy}>
            <Typography variant="h1" className={styles.heroTitle}>
              {t('privacyPolicy')}
            </Typography>
            <Typography className={styles.heroSubtitle}>
              {t('privacySubtitle')}
            </Typography>
          </Box>
        </Container>
      </section>

      <Container className={styles.container}>
        <div className={styles.contentCard}>
          <Typography variant="h3" className={styles.pageTitle}>
            {t('privacyPolicy')}
          </Typography>

          <Typography className={styles.bodyText}>
            {t('privacyIntro')}
          </Typography>

          <div className={styles.summaryCard}>
            <Typography variant="h4" className={styles.summaryTitle}>
              {t('privacySummaryTitle')}
            </Typography>
            <Typography className={styles.summaryText}>
              {t('privacySummaryBody')}
            </Typography>
          </div>

          <Typography variant="h5" className={styles.sectionTitle}>
            {t('privacyGdprTitle')}
          </Typography>
          <Typography className={styles.bodyText}>
            {t('privacyGdprBody')}{' '}
            <span className={styles.contactEmail}>privacy@wakapadi.com</span>.
          </Typography>

          <Typography variant="h5" className={styles.sectionTitle}>
            {t('privacyRightsTitle')}
          </Typography>
          <List className={styles.list}>
            <ListItem className={styles.listItem}>
              {t('privacyRightAccess')}
            </ListItem>
            <ListItem className={styles.listItem}>
              {t('privacyRightCorrection')}
            </ListItem>
            <ListItem className={styles.listItem}>
              {t('privacyRightDeletion')}
            </ListItem>
            <ListItem className={styles.listItem}>
              {t('privacyRightWithdraw')}
            </ListItem>
          </List>

          <Typography variant="h5" className={styles.sectionTitle}>
            {t('privacyDataTitle')}
          </Typography>
          <Typography className={styles.bodyText}>
            {t('privacyDataBody')}
          </Typography>

          <Typography variant="h5" className={styles.sectionTitle}>
            {t('privacyUseTitle')}
          </Typography>
          <Typography className={styles.bodyText}>
            {t('privacyUseBody')}
          </Typography>

          <Typography variant="h5" className={styles.sectionTitle}>
            {t('privacySharingTitle')}
          </Typography>
          <Typography className={styles.bodyText}>
            {t('privacySharingBody')}
          </Typography>

          <Typography variant="h5" className={styles.sectionTitle}>
            {t('privacyRetentionTitle')}
          </Typography>
          <Typography className={styles.bodyText}>
            {t('privacyRetentionBody')}
          </Typography>

          <Typography variant="h5" className={styles.sectionTitle}>
            {t('privacySecurityTitle')}
          </Typography>
          <Typography className={styles.bodyText}>
            {t('privacySecurityBody')}
          </Typography>

          <div className={styles.callout}>
            <Typography variant="h4" className={styles.calloutTitle}>
              {t('privacyContactTitle')}
            </Typography>
            <Typography className={styles.bodyText}>
              {t('privacyContactBody')}{' '}
              <span className={styles.contactEmail}>privacy@wakapadi.com</span>.
            </Typography>
            <div className={styles.metaRow}>
              <span>{t('privacyEffectiveDate')}</span>
            </div>
          </div>
        </div>
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
