import { Typography, Container, Paper, Box } from '@mui/material';
import Head from 'next/head';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import styles from '../styles/FooterPages.module.css';

export default function AboutPage() {
  const { t } = useTranslation('common');

  return (
    <Layout title={t('aboutPageTitle')}>
      <Head>
        <meta
          name="description"
          content={t('aboutMetaDescription')}
        />
      </Head>

      <PageHeader
        title={t('aboutTitle')}
        subtitle={t('aboutSubtitle')}
      />

      <Container className={styles.container}>
        <Paper className={styles.contentPaper}>
          <Typography variant="h2" className={styles.pageTitle}>
            {t('ourStory')}
          </Typography>

          <Typography className={styles.bodyText}>
            {t('aboutBodyIntro')}
          </Typography>

          <Typography variant="h3" className={styles.sectionTitle}>
            {t('aboutVisionTitle')}
          </Typography>

          <Typography className={styles.bodyText}>
            {t('aboutVisionBody')}
          </Typography>

          <Box component="ul" className={styles.list}>
            <Typography component="li" className={styles.listItem}>
              {t('aboutVisionListOne')}
            </Typography>
            <Typography component="li" className={styles.listItem}>
              {t('aboutVisionListTwo')}
            </Typography>
            <Typography component="li" className={styles.listItem}>
              {t('aboutVisionListThree')}
            </Typography>
          </Box>

          <Typography variant="h3" className={styles.sectionTitle}>
            {t('aboutJoinTitle')}
          </Typography>

          <Typography className={styles.bodyText}>
            {t('aboutJoinBody')}{' '}
            <span className={styles.contactEmail}>hello@wakapadi.com</span>.
          </Typography>
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
