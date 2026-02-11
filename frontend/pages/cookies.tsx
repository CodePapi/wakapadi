import { Typography, Container, Paper, List, ListItem } from '@mui/material';
import Head from 'next/head';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { motion } from 'framer-motion';
import styles from '../styles/FooterPages.module.css';

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 1) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.5 },
  }),
};

export default function CookiePolicy() {
  const { t } = useTranslation('common');

  return (
    <Layout title={t('cookiePolicy') + ' | Wakapadi'}>
      <Head>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <PageHeader
        title={t('cookiePolicy')}
        subtitle={t('cookieSubtitle')}
      />

      <Container className={styles.container}>
        <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
          <Paper className={styles.contentPaper}>
            <motion.div variants={fadeInUp} custom={1}>
              <Typography variant="h3" className={styles.pageTitle}>
                {t('cookiePolicy')}
              </Typography>
            </motion.div>

            <motion.div variants={fadeInUp} custom={2}>
              <Typography className={styles.bodyText}>
                {t('cookieIntro')}
              </Typography>
            </motion.div>

            <motion.div variants={fadeInUp} custom={3}>
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
            </motion.div>
          </Paper>
        </motion.div>
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
