import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Button,
  Typography,
  Container,
  Stack,
} from '@mui/material';
import Head from 'next/head';
import Layout from '../components/Layout';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import HeroSection from '../components/home/HeroSection';
import { useRouter } from 'next/router';
import debounce from 'lodash.debounce';
import styles from '../styles/HomePage.module.css';

export default function HomePage() {
  const { t } = useTranslation('common');
  const [suggestion, setSuggestion] = useState('');
  const router = useRouter();
  const debouncedNavigate = useMemo(
    () =>
      debounce((value: string) => {
        const trimmed = value.trim();
        if (!trimmed) return;
        router.push(`/tours?q=${encodeURIComponent(trimmed)}`);
      }, 500),
    [router]
  );

  useEffect(() => () => debouncedNavigate.cancel(), [debouncedNavigate]);

  const handleSearchInput = useCallback(
    (value: string) => {
      setSuggestion(value);
      debouncedNavigate(value);
    },
    [debouncedNavigate]
  );

  const highlights = [
    {
      title: t('homeHighlightToursTitle'),
      body: t('homeHighlightToursBody'),
    },
    {
      title: t('homeHighlightMeetTitle'),
      body: t('homeHighlightMeetBody'),
    },
    {
      title: t('homeHighlightBotTitle'),
      body: t('homeHighlightBotBody'),
    },
  ];

  const steps = [
    {
      title: t('homeStepSearchTitle'),
      body: t('homeStepSearchBody'),
    },
    {
      title: t('homeStepConnectTitle'),
      body: t('homeStepConnectBody'),
    },
    {
      title: t('homeStepMeetTitle'),
      body: t('homeStepMeetBody'),
    },
  ];

  return (
    <>
      <Head>
        <title>{t('homePageTitle')}</title>
        <meta name="description" content={t('homePageDescription')} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content={t('homePageTitle')} />
        <meta property="og:description" content={t('homePageDescription')} />
      </Head>
      <Layout title={t('homePageTitle')}>
        <HeroSection
          locations={[]}
          onSearch={handleSearchInput}
          initialValue=""
          suggestion={suggestion}
        />

        <section className={styles.introSection}>
          <Container maxWidth="lg">
            <div className={styles.introGrid}>
              <div className={styles.introCopy}>
                <Typography variant="h2" className={styles.introTitle}>
                  {t('homeIntroTitle')}
                </Typography>
                <Typography className={styles.introText}>
                  {t('homeIntroBody')}
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Button
                    variant="contained"
                    color="primary"
                    className={styles.primaryAction}
                    onClick={() => router.push('/whois')}
                  >
                    {t('homeIntroPrimaryCta')}
                  </Button>
                  <Button
                    variant="outlined"
                    className={styles.secondaryAction}
                    onClick={() => router.push('/contact-us')}
                  >
                    {t('homeIntroSecondaryCta')}
                  </Button>
                </Stack>
              </div>
              <div className={styles.introCard}>
                <Typography variant="h3" className={styles.introCardTitle}>
                  {t('homeSafetyTitle')}
                </Typography>
                <Typography className={styles.introCardText}>
                  {t('homeSafetyBody')}
                </Typography>
              </div>
            </div>
          </Container>
        </section>

        <section className={styles.highlightsSection}>
          <Container maxWidth="lg">
            <Typography variant="h2" className={styles.sectionTitle}>
              {t('homeHighlightsTitle')}
            </Typography>
            <div className={styles.highlightGrid}>
              {highlights.map((item) => (
                <div key={item.title} className={styles.highlightCard}>
                  <Typography variant="h3" className={styles.highlightTitle}>
                    {item.title}
                  </Typography>
                  <Typography className={styles.highlightText}>
                    {item.body}
                  </Typography>
                </div>
              ))}
            </div>
          </Container>
        </section>

        <section className={styles.stepsSection}>
          <Container maxWidth="lg">
            <Typography variant="h2" className={styles.sectionTitle}>
              {t('homeStepsTitle')}
            </Typography>
            <div className={styles.stepsGrid}>
              {steps.map((step, index) => (
                <div key={step.title} className={styles.stepCard}>
                  <div className={styles.stepNumber}>{index + 1}</div>
                  <Typography variant="h3" className={styles.stepTitle}>
                    {step.title}
                  </Typography>
                  <Typography className={styles.stepText}>
                    {step.body}
                  </Typography>
                </div>
              ))}
            </div>
          </Container>
        </section>

        <section className={styles.ctaSection}>
          <Container maxWidth="lg" className={styles.ctaInner}>
            <div>
              <Typography variant="h2" className={styles.ctaTitle}>
                {t('homeCtaTitle')}
              </Typography>
              <Typography className={styles.ctaText}>
                {t('homeCtaBody')}
              </Typography>
            </div>
            <div className={styles.ctaActions}>
              <Button
                variant="contained"
                color="primary"
                className={styles.primaryAction}
                onClick={() => router.push('/whois')}
              >
                {t('homeCtaPrimary')}
              </Button>
              <Button
                variant="outlined"
                className={styles.secondaryAction}
                onClick={() => router.push('/tours')}
              >
                {t('homeCtaSecondary')}
              </Button>
            </div>
          </Container>
        </section>
      </Layout>
    </>
  );
}

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}
