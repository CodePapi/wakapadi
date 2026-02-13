import { useEffect, useState, useMemo, useCallback } from 'react';
import Head from 'next/head';
import Layout from '../components/Layout';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import HeroSection from '../components/home/HeroSection';
import { useRouter } from 'next/router';
import debounce from 'lodash.debounce';
import styles from '../styles/HomePage.module.css';
import { api } from '../lib/api';

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

  // On first visit, attempt to detect user's city and request backend to add+scrape if new
  useEffect(() => {
    const reportedKey = 'wakapadi_reported_city';

    const alreadyReported = typeof window !== 'undefined' && window.localStorage.getItem(reportedKey);
    if (alreadyReported) return;

    if (!('geolocation' in navigator)) return;

    const onSuccess = async (pos: GeolocationPosition) => {
      try {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        // Reverse geocode via backend
        const geoRes = await api.get(`/geolocation/reverse?lat=${lat}&lon=${lon}`);
        const data = geoRes.data || {};
        const address = data.address || {};

        const city = address.city || address.town || address.village || address.county || address.state;
        if (!city) return;

        // Ask backend to scrape new city once (backend will no-op if city exists)
        await api.post('/scraper/new/city', { city });

        // mark as reported to avoid repeated calls
        window.localStorage.setItem(reportedKey, city);
      } catch (err) {
        // silent fail — don't block UI
        console.error('City detection/scrape failed', err);
      }
    };

    const onError = (err: GeolocationPositionError) => {
      // ignore permission denied or other errors
      console.warn('Geolocation error', err);

      // Fallback: attempt IP-based lookup to get a city (uses public ipapi.co)
      const tryIpLookup = async () => {
        try {
          const res = await fetch('https://ipapi.co/json/');
          if (!res.ok) return;
          const info = await res.json();

          const cityFromIp = info.city || info.region || info.region_code || info.country_name;
          if (cityFromIp) {
            await api.post('/scraper/new/city', { city: cityFromIp });
            if (typeof window !== 'undefined') {
              window.localStorage.setItem(reportedKey, cityFromIp);
            }
            return;
          }

          // If ip service returns lat/lon, reverse-geocode via backend
          const lat = info.latitude || info.lat;
          const lon = info.longitude || info.lon || info.long;
          if (lat && lon) {
            try {
              const geoRes = await api.get(`/geolocation/reverse?lat=${lat}&lon=${lon}`);
              const address = geoRes.data?.address || {};
              const city = address.city || address.town || address.village || address.county || address.state;
              if (city) {
                await api.post('/scraper/new/city', { city });
                if (typeof window !== 'undefined') {
                  window.localStorage.setItem(reportedKey, city);
                }
              }
            } catch (e) {
              console.warn('Reverse geocode from IP coordinates failed', e);
            }
          }
        } catch (e) {
          console.warn('IP lookup failed', e);
        }
      };

      tryIpLookup();
    };

    navigator.geolocation.getCurrentPosition(onSuccess, onError, { maximumAge: 1000 * 60 * 60 * 24 });
  }, []);

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
          <div className="mx-auto max-w-6xl px-4">
            <div className={styles.introGrid}>
              <div className={styles.introCopy}>
                <h2 className={styles.introTitle}>{t('homeIntroTitle')}</h2>
                <p className={styles.introText}>{t('homeIntroBody')}</p>
                <div className="flex flex-col sm:flex-row gap-3 mt-4">
                  <button
                    className={`${styles.primaryAction} px-5 py-3 rounded-md bg-primary text-white`}
                    onClick={() => router.push('/whois')}
                  >
                    {t('homeIntroPrimaryCta')}
                  </button>
                </div>
              </div>
              <div className={styles.introCard}>
                <h3 className={styles.introCardTitle}>{t('homeSafetyTitle')}</h3>
                <p className={styles.introCardText}>{t('homeSafetyBody')}</p>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.highlightsSection}>
          <div className="mx-auto max-w-6xl px-4">
            <h2 className={styles.sectionTitle}>{t('homeHighlightsTitle')}</h2>
            <div className={styles.highlightGrid}>
              {highlights.map((item) => (
                <div key={item.title} className={styles.highlightCard}>
                  <h3 className={styles.highlightTitle}>{item.title}</h3>
                  <p className={styles.highlightText}>{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.stepsSection}>
          <div className="mx-auto max-w-6xl px-4">
            <h2 className={styles.sectionTitle}>{t('homeStepsTitle')}</h2>
            <div className={styles.stepsGrid}>
              {steps.map((step, index) => (
                <div key={step.title} className={styles.stepCard}>
                  <div className={styles.stepNumber}>{index + 1}</div>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <p className={styles.stepText}>{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={`${styles.ctaSection}`}>
          <div className={`mx-auto max-w-6xl px-4 ${styles.ctaInner}`}>
            <div>
              <h2 className={styles.ctaTitle}>{t('homeCtaTitle')}</h2>
              <p className={styles.ctaText}>{t('homeCtaBody')}</p>
            </div>
            <div className={styles.ctaActions}>
              <button
                className={`${styles.primaryAction} px-5 py-3 rounded-md bg-primary text-white`}
                onClick={() => router.push('/whois')}
              >
                {t('homeCtaPrimary')}
              </button>
              <button
                className={`${styles.secondaryAction} px-5 py-3 rounded-md border border-white/30 text-white`}
                onClick={() => router.push('/tours')}
              >
                {t('homeCtaSecondary')}
              </button>
            </div>
          </div>
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
