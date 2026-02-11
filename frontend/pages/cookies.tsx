import { Typography, Container, List, ListItem, Box } from '@mui/material';
import Head from 'next/head';
import Layout from '../components/Layout';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import styles from '../styles/StaticPage.module.css';

export default function CookiePolicy() {
  const { t } = useTranslation('common');

  return (
    <Layout title={t('cookiePolicy') + ' | Wakapadi'}>
      <Head>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <section className={styles.hero}>
        <Container maxWidth="lg" className={styles.heroInner}>
          <Box className={styles.heroCopy}>
            <Typography variant="h1" className={styles.heroTitle}>
              {t('cookiePolicy')}
            </Typography>
            <Typography className={styles.heroSubtitle}>
              {t('cookieSubtitle')}
            </Typography>
          </Box>
        </Container>
      </section>

      <Container className={styles.container}>
        <div className={styles.contentCard}>
          <Typography variant="h3" className={styles.pageTitle}>
            {t('cookiePolicy')}
          </Typography>

          <Typography className={styles.bodyText}>
            {t('cookieIntro')}
          </Typography>

          <div className={styles.summaryCard}>
            <Typography variant="h4" className={styles.summaryTitle}>
              {t('cookieSummaryTitle')}
            </Typography>
            <Typography className={styles.summaryText}>
              {t('cookieSummaryBody')}
            </Typography>
          </div>

          <Typography variant="h5" className={styles.sectionTitle}>
            {t('cookieTypesTitle')}
          </Typography>
          <List className={styles.list}>
            <ListItem className={styles.listItem}>
              {t('cookieEssential')}
            </ListItem>
            <ListItem className={styles.listItem}>
              {t('cookieAnalytics')}
            </ListItem>
            <ListItem className={styles.listItem}>
              {t('cookieFunctional')}
            </ListItem>
          </List>

          <Typography variant="h5" className={styles.sectionTitle}>
            {t('cookieManageTitle')}
          </Typography>
          <Typography className={styles.bodyText}>
            {t('cookieManageBody')}
          </Typography>

          <Typography variant="h5" className={styles.sectionTitle}>
            {t('cookieRetentionTitle')}
          </Typography>
          <Typography className={styles.bodyText}>
            {t('cookieRetentionBody')}
          </Typography>
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
