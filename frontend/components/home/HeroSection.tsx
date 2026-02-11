import {
  Autocomplete,
  TextField,
  Button,
  IconButton,
  useMediaQuery,
  Chip,
} from '@mui/material';
import {
  Search as SearchIcon,
  NearMe as NearMeIcon,
  Menu as MenuIcon
} from '@mui/icons-material';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import debounce from 'lodash.debounce';
import { motion } from 'framer-motion';
import styles from './HeroSection.module.css';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const isMobile = useMediaQuery('(max-width:768px)');

  const handleScrollToTours = () => {
    router.push('/tours');
  };

  // ✅ Update input when suggestion changes
  useEffect(() => {
    if (typeof suggestion === 'string') {
      setInput(suggestion);
    }
  }, [suggestion]);

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
      <div className={styles.heroContainer}>
        {/* Hero Banner with Background Image */}
        <div className={styles.heroBanner}>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className={styles.heroTitle}>{t('homeTitle')}</h1>
          </motion.div>
          <motion.p
            className={styles.heroSubtitle}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {t('homeSubtitle')}
          </motion.p>

          <div className={styles.heroActions}>
            <Button
              variant="contained"
              className={styles.primaryCta}
              onClick={handleScrollToTours}
            >
              {t('heroCtaExplore')}
            </Button>
            <Button
              variant="outlined"
              className={styles.secondaryCta}
              onClick={() => router.push('/whois')}
            >
              {t('heroCtaMeet')}
            </Button>
          </div>

          <div className={styles.heroHighlights}>
            <Chip label={t('heroChipFree')} className={styles.heroChip} />
            <Chip label={t('heroChipFriendly')} className={styles.heroChip} />
            <Chip label={t('heroChipSafeChat')} className={styles.heroChip} />
          </div>
        </div>
      </div>

      {/* Search Container */}
      <div className={styles.searchStickyWrap} aria-live="polite">
        <div className={styles.searchContainer}>
          <div className={styles.searchContent}>
            <div className={styles.searchInput}>
              <SearchIcon className={styles.searchIcon} />
              <Autocomplete
                freeSolo
                fullWidth
                options={locations}
                getOptionLabel={(option) => option}
                inputValue={input}
                onInputChange={(_, value) => setInput(value)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder={t('searchPlaceholder')}
                    variant="standard"
                    fullWidth
                    InputProps={{
                      ...params.InputProps,
                      disableUnderline: true,
                      className: styles.inputField,
                      'aria-label': t('searchToursAria')
                    }}
                  />
                )}
                noOptionsText={t('noResults')}
              />
              {isMobile && (
                <IconButton
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className={styles.mobileMenuButton}
                  aria-label={
                    mobileMenuOpen ? t('closeMenu') : t('openMenu')
                  }
                >
                  <MenuIcon />
                </IconButton>
              )}
            </div>

            <div className={`${styles.searchButtons} ${mobileMenuOpen || !isMobile ? styles.visible : ''}`}>
              <Button
                variant="outlined"
                startIcon={<NearMeIcon />}
                onClick={() => router.push('/whois')}
                className={styles.searchButton}
                fullWidth={isMobile}
              >
                {isMobile ? t('whoisNearby') : t('whoisNearby')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
