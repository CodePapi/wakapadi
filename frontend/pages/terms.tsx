import { Typography, Container, List, ListItem, Box } from '@mui/material';
import Head from 'next/head';
import Layout from '../components/Layout';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import styles from '../styles/StaticPage.module.css';

export default function TermsOfUse() {
  const { t } = useTranslation('common');

  return (
    <Layout title={t('termsOfUse') + ' | Wakapadi'}>
      <Head>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <section className={styles.hero}>
        <Container maxWidth="lg" className={styles.heroInner}>
          <Box className={styles.heroCopy}>
            <Typography variant="h1" className={styles.heroTitle}>
              {t('termsOfUse')}
            </Typography>
            <Typography className={styles.heroSubtitle}>
              {t('termsSubtitle')}
            </Typography>
          </Box>
        </Container>
      </section>

      <Container className={styles.container}>
        <div className={styles.contentCard}>
          <Typography variant="h3" className={styles.pageTitle}>
            {t('termsOfUse')}
          </Typography>

          <Typography className={styles.bodyText}>
            {t('termsIntroOne')}
          </Typography>
          <Typography className={styles.bodyText}>
            {t('termsIntroTwo')}
          </Typography>

          <div className={styles.summaryCard}>
            <Typography variant="h4" className={styles.summaryTitle}>
              {t('termsSummaryTitle')}
            </Typography>
            <Typography className={styles.summaryText}>
              {t('termsSummaryBody')}
            </Typography>
          </div>

          <Typography variant="h5" className={styles.sectionTitle}>
            {t('termsAcceptableTitle')}
          </Typography>
          <Typography className={styles.bodyText}>
            {t('termsAcceptableBody')}
          </Typography>
          <List className={styles.list}>
            <ListItem className={styles.listItem}>
              {t('termsAcceptableListOne')}
            </ListItem>
            <ListItem className={styles.listItem}>
              {t('termsAcceptableListTwo')}
            </ListItem>
            <ListItem className={styles.listItem}>
              {t('termsAcceptableListThree')}
            </ListItem>
            <ListItem className={styles.listItem}>
              {t('termsAcceptableListFour')}
            </ListItem>
          </List>
          <Typography className={styles.bodyText}>
            {t('termsAcceptableFooter')}
          </Typography>

          <Typography variant="h5" className={styles.sectionTitle}>
            {t('termsUpdatesTitle')}
          </Typography>
          <Typography className={styles.bodyText}>
            {t('termsUpdatesBody')}
          </Typography>

          <Typography variant="h5" className={styles.sectionTitle}>
            {t('termsEligibilityTitle')}
          </Typography>
          <Typography className={styles.bodyText}>
            {t('termsEligibilityBody')}
          </Typography>

          <Typography variant="h5" className={styles.sectionTitle}>
            {t('termsSafetyTitle')}
          </Typography>
          <Typography className={styles.bodyText}>
            {t('termsSafetyBody')}
          </Typography>

          <Typography variant="h5" className={styles.sectionTitle}>
            {t('termsContentTitle')}
          </Typography>
          <Typography className={styles.bodyText}>
            {t('termsContentBody')}
          </Typography>

          <Typography variant="h5" className={styles.sectionTitle}>
            {t('termsLiabilityTitle')}
          </Typography>
          <Typography className={styles.bodyText}>
            {t('termsLiabilityBody')}
          </Typography>

          <Typography variant="h5" className={styles.sectionTitle}>
            {t('termsTerminationTitle')}
          </Typography>
          <Typography className={styles.bodyText}>
            {t('termsTerminationBody')}
          </Typography>

          <div className={styles.callout}>
            <Typography variant="h4" className={styles.calloutTitle}>
              {t('termsContactTitle')}
            </Typography>
            <Typography className={styles.bodyText}>
              {t('termsContactBody')}{' '}
              <span className={styles.contactEmail}>hello@wakapadi.com</span>.
            </Typography>
            <div className={styles.metaRow}>
              <span>{t('termsEffectiveDate')}</span>
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
