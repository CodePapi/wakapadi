// pages/contact-us.tsx
import { Container, Box, Typography } from '@mui/material';
import ContactForm from '../components/ContactForm';
import Layout from '../components/Layout';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import styles from '../styles/ContactPage.module.css';

export default function ContactPage() {
  const { t } = useTranslation('common');
  return (
    <Layout title={t('contactPageTitle')}>
      <section className={styles.hero}>
        <Container maxWidth="lg" className={styles.heroInner}>
          <Box className={styles.heroCopy}>
            <Typography variant="h1" className={styles.heroTitle}>
              {t('contactTitle')}
            </Typography>
            <Typography className={styles.heroSubtitle}>
              {t('contactHeroBody')}
            </Typography>
          </Box>
        </Container>
      </section>

      <Container maxWidth="lg" className={styles.pageBody}>
        <div className={styles.grid}>
          <section className={styles.formSection}>
            <ContactForm className={styles.formCard} />
            <Typography className={styles.formNote}>
              {t('contactFormNote')}
            </Typography>
          </section>

          <aside className={styles.sideColumn}>
            <div className={styles.infoCard}>
              <Typography className={styles.infoTitle}>
                {t('contactWaysTitle')}
              </Typography>
              <Typography className={styles.infoBody}>
                {t('contactWaysBody')}
              </Typography>
              <div className={styles.infoList}>
                <div>
                  <Typography className={styles.infoLabel}>
                    {t('contactSupportTitle')}
                  </Typography>
                  <Typography className={styles.infoValue}>
                    {t('contactSupportBody')}
                  </Typography>
                </div>
                <div>
                  <Typography className={styles.infoLabel}>
                    {t('contactBusinessTitle')}
                  </Typography>
                  <Typography className={styles.infoValue}>
                    {t('contactBusinessBody')}
                  </Typography>
                </div>
                <div>
                  <Typography className={styles.infoLabel}>
                    {t('contactPressTitle')}
                  </Typography>
                  <Typography className={styles.infoValue}>
                    {t('contactPressBody')}
                  </Typography>
                </div>
              </div>
            </div>

            <div className={styles.infoCard}>
              <Typography className={styles.infoTitle}>
                {t('contactResponseTitle')}
              </Typography>
              <Typography className={styles.infoBody}>
                {t('contactResponseBody')}
              </Typography>
            </div>

            <div className={styles.infoCard}>
              <Typography className={styles.infoTitle}>
                {t('contactHoursTitle')}
              </Typography>
              <Typography className={styles.infoBody}>
                {t('contactHoursBody')}
              </Typography>
            </div>
          </aside>
        </div>

        <section className={styles.faqSection}>
          <Typography className={styles.faqTitle}>
            {t('contactFaqTitle')}
          </Typography>
          <div className={styles.faqGrid}>
            <div className={styles.faqCard}>
              <Typography className={styles.faqQuestion}>
                {t('contactFaqOneQ')}
              </Typography>
              <Typography className={styles.faqAnswer}>
                {t('contactFaqOneA')}
              </Typography>
            </div>
            <div className={styles.faqCard}>
              <Typography className={styles.faqQuestion}>
                {t('contactFaqTwoQ')}
              </Typography>
              <Typography className={styles.faqAnswer}>
                {t('contactFaqTwoA')}
              </Typography>
            </div>
            <div className={styles.faqCard}>
              <Typography className={styles.faqQuestion}>
                {t('contactFaqThreeQ')}
              </Typography>
              <Typography className={styles.faqAnswer}>
                {t('contactFaqThreeA')}
              </Typography>
            </div>
          </div>
        </section>
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
