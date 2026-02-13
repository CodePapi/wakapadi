import { motion } from 'framer-motion';
import Image from 'next/image';
import styles from './HeroSection.module.css';
// Use plain inputs/buttons with Tailwind for the homepage to avoid heavy MUI bundle
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import debounce from 'lodash.debounce';

interface HeroSectionProps {
  locations?: string[];
  onSearch?: (term: string) => void;
  initialValue?: string;
  suggestion?: string; // ✅ Added
}

export default function HeroSection({ 
  locations = [], 
  onSearch, 
  initialValue = '', 
  suggestion // ✅ Accept the prop
}: HeroSectionProps) {
  const { t } = useTranslation('common');
  const [input, setInput] = useState(initialValue);
  const router = useRouter();
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const handleScrollToTours = () => {
    router.push('/tours');
  };

  // ✅ Update input when suggestion changes
  useEffect(() => {
    if (typeof suggestion === 'string') {
      setInput(suggestion);
    }
  }, [suggestion]);

  // Detect prefers-reduced-motion
  useEffect(() => {
    if (typeof window !== 'undefined' && 'matchMedia' in window) {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mq.matches);
      const handle = (ev: MediaQueryListEvent) => setPrefersReducedMotion(ev.matches);
      mq.addEventListener?.('change', handle);
      return () => mq.removeEventListener?.('change', handle);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const debounced = debounce((value: string) => {
      onSearch?.(value);
    }, 400);
    
    debounced(input);
    return () => debounced.cancel();
  }, [input, onSearch]);

  return (
    <>
      <div className={`relative min-h-[56vh] overflow-x-hidden ${styles.heroContainer}`}>
        {/* Hero Banner with Background Image */}
        <div className={`${styles.heroBanner} bg-cover bg-center`}>
          <div className="max-w-6xl mx-auto grid gap-12 items-center grid-cols-1 md:grid-cols-2 px-6 py-20 justify-items-center">
            <motion.div
              className="text-center md:justify-self-center md:max-w-2xl"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className={`${styles.heroTitle}`}>{t('homeTitle')}</h1>
              {/* <p className={`${styles.heroSubtitle} mt-4`}>{t('homeSubtitle')}</p> */}

              <div className={styles.heroActions}>
                <button
                  className={styles.primaryCta}
                  onClick={handleScrollToTours}
                  aria-label={t('heroCtaExplore')}
                >
                  {t('heroCtaExplore')}
                </button>
                <button
                  className={styles.secondaryCta}
                  onClick={() => router.push('/whois')}
                  aria-label={t('heroCtaMeet')}
                >
                  {t('heroCtaMeet')}
                </button>
              </div>

              <div className={styles.heroHighlights}>
                <span className={styles.heroChip}>{t('heroChipFree')}</span>
                <span className={styles.heroChip}>{t('heroChipFriendly')}</span>
                <span className={styles.heroChip}>{t('heroChipSafeChat')}</span>
              </div>
            </motion.div>

            <motion.div
              className="flex items-center justify-center"
              initial={prefersReducedMotion ? {} : { opacity: 0, x: 20 }}
              animate={prefersReducedMotion ? {} : { opacity: 1, x: 0 }}
              transition={prefersReducedMotion ? {} : { duration: 0.6, delay: 0.12 }}
            >
              <div
                ref={cardRef}
                className={`${styles.heroCard} ${styles.heroInteractive}`}
                role="button"
                tabIndex={0}
                onClick={() => router.push('/tours')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    router.push('/tours');
                  }
                }}
                aria-label={t('heroCardAria') || t('heroCtaExplore')}
              >
                <div className={styles.heroCardInner}>
                  <Image src="/hero-travel.png" alt="Traveler illustration" width={460} height={380} priority sizes="(max-width:480px) 360px, (max-width:768px) 420px, 480px" />
                </div>
                <div className={styles.heroBadge}>
                  <strong>100k+</strong>
                  <span>{t('homeBadgeTours')}</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Search Container (moved into hero for better UX) */}
      <div className={styles.searchStickyWrap} aria-live="polite">
        <div className={styles.searchContainer}>
          <div className={styles.searchInner}>
            <div className={styles.searchInput}>
              <svg xmlns="http://www.w3.org/2000/svg" className={styles.searchSvgIcon} viewBox="0 0 24 24" aria-hidden>
                <path d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1116.65 16.65z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>

              <input
                list="wakapadi-locs"
                value={input}
                onChange={(e) => {
                  const v = e.target.value;
                  setInput(v);
                  onSearch?.(v);
                }}
                placeholder={t('searchPlaceholder')}
                aria-label={t('searchToursAria')}
                className={styles.searchInputField}
              />

              <datalist id="wakapadi-locs">
                {locations.map((loc) => (
                  <option key={loc} value={loc} />
                ))}
              </datalist>

              <button
                onClick={() => router.push('/whois')}
                className={styles.searchButtonSecondary}
                aria-label={t('whoisNearby')}
              >
                {t('whoisNearby')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
