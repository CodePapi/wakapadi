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

export default function PrivacyPolicy() {
  const { t } = useTranslation('common');

  return (
    <Layout title={t('privacyPolicy') + ' | Wakapadi'}>
      <Head>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <PageHeader
        title={t('privacyPolicy')}
        subtitle={t('privacySubtitle')}
      />

      <Container className={styles.container}>
        <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
          <Paper className={styles.contentPaper}>
            <motion.div variants={fadeInUp} custom={1}>
              <Typography variant="h3" className={styles.pageTitle}>
                {t('privacyPolicy')}
              </Typography>
            </motion.div>

            <motion.div variants={fadeInUp} custom={2}>
              <Typography className={styles.bodyText}>
                {t('privacyIntro')}
              </Typography>
            </motion.div>

            <motion.div variants={fadeInUp} custom={2.5}>
              <div className={styles.summaryCard}>
                <Typography variant="h4" className={styles.summaryTitle}>
                  {t('privacySummaryTitle')}
                </Typography>
                <Typography className={styles.summaryText}>
                  {t('privacySummaryBody')}
                </Typography>
              </div>
            </motion.div>

            <motion.div variants={fadeInUp} custom={3}>
              <Typography variant="h5" className={styles.sectionTitle}>
                {t('privacyGdprTitle')}
              </Typography>
              <Typography className={styles.bodyText}>
                {t('privacyGdprBody')}{' '}
                <span className={styles.contactEmail}>
                  privacy@wakapadi.com
                </span>
                .
              </Typography>
            </motion.div>

            <motion.div variants={fadeInUp} custom={4}>
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
            </motion.div>

            <motion.div variants={fadeInUp} custom={5}>
              <Typography variant="h5" className={styles.sectionTitle}>
                {t('privacyDataTitle')}
              </Typography>
              <Typography className={styles.bodyText}>
                {t('privacyDataBody')}
              </Typography>
            </motion.div>

            <motion.div variants={fadeInUp} custom={6}>
              <Typography variant="h5" className={styles.sectionTitle}>
                {t('privacyUseTitle')}
              </Typography>
              <Typography className={styles.bodyText}>
                {t('privacyUseBody')}
              </Typography>
            </motion.div>

            <motion.div variants={fadeInUp} custom={7}>
              <Typography variant="h5" className={styles.sectionTitle}>
                {t('privacySharingTitle')}
              </Typography>
              <Typography className={styles.bodyText}>
                {t('privacySharingBody')}
              </Typography>
            </motion.div>

            <motion.div variants={fadeInUp} custom={8}>
              <Typography variant="h5" className={styles.sectionTitle}>
                {t('privacyRetentionTitle')}
              </Typography>
              <Typography className={styles.bodyText}>
                {t('privacyRetentionBody')}
              </Typography>
            </motion.div>

            <motion.div variants={fadeInUp} custom={9}>
              <Typography variant="h5" className={styles.sectionTitle}>
                {t('privacySecurityTitle')}
              </Typography>
              <Typography className={styles.bodyText}>
                {t('privacySecurityBody')}
              </Typography>
            </motion.div>

            <motion.div variants={fadeInUp} custom={10}>
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
