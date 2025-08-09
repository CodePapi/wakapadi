import { Link, Button, Box, Container, Typography } from '@mui/material';
import Image from 'next/image';
import LanguageIcon from '@mui/icons-material/Language';
import MenuIcon from '@mui/icons-material/Menu';
import styles from '../../styles/components/Header.module.css';
import Logo from '../../public/logo1.svg';
import HeroPageLogo from '../../public/logo2.svg';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';

interface HeaderProps {
  homepage: boolean;
  dispatch: React.Dispatch<string>;
  ismobileMenuOpen: boolean;
}

const Header = (props: HeaderProps) => {
  const { t } = useTranslation('common');
  const [openLanguageDropdown, setOpenLanguageDropdown] =
    useState<boolean>(false);

  // useReducer to manage mobile menu state
  // 'OPEN' to open the menu, 'CLOSE' to close it

  const { homepage = false, dispatch, ismobileMenuOpen } = props;

  const router = useRouter();

  // Render the header with different styles based on homepage prop
  if (homepage) {
    return (
      <nav className={styles['header-nav-homepage']}>
        <Link href='/'>
          <Image src={Logo} alt='Wakapadi Logo' />
        </Link>
        <Box className={styles['header-link-container']}>
          <Link href='/whois'>{t('whoisnearbylink')}</Link>
          <Link href='/about'>{t('about')}</Link>
          <Link href='/contact-us'>{t('contact')}</Link>
        </Box>
        <Box className={styles['header-authentication-link-homepage']}>
          <Link href='/login'>{t('login')}</Link>
          <Button onClick={() => router.push('/register')}>
            {t('getStarted')}
          </Button>
          <LanguageIcon
            width='30px'
            height='30px'
            onClick={() => setOpenLanguageDropdown(!openLanguageDropdown)}
          />
          {openLanguageDropdown ? (
            <Container className={styles['header-language-dropdown']}>
              <Typography
                variant='body1'
                onClick={() => setOpenLanguageDropdown(false)}
              >
                English
              </Typography>
              <Typography
                variant='body1'
                onClick={() => setOpenLanguageDropdown(false)}
              >
                French
              </Typography>
              <Typography
                variant='body1'
                onClick={() => setOpenLanguageDropdown(false)}
              >
                Spanish
              </Typography>
              <Typography
                variant='body1'
                onClick={() => setOpenLanguageDropdown(false)}
              >
                German
              </Typography>
            </Container>
          ) : null}
        </Box>
        <Box
          className={`${styles['mobile-header-authentication-link']} ${
            ismobileMenuOpen ? styles['active'] : ''
          }`}
        >
          <LanguageIcon width='30px' height='30px' />
          <MenuIcon
            width='30px'
            height='30px'
            onClick={() => dispatch('OPEN')}
          />
        </Box>
      </nav>
    );
  }

  return (
    <nav
      className={
        homepage ? styles['header-nav-homepage'] : styles['header-nav']
      }
    >
      <Link href='/'>
        <Image src={homepage ? HeroPageLogo : Logo} alt='Wakapadi Logo' />
      </Link>
      {/* 1st nav */}
      <Box className={styles['header-link-container']}>
        <Link href='/whois'>{t('whoisnearbylink')}</Link>
        <Link href='/about'>{t('about')}</Link>
        <Link href='/contact-us'>{t('contact')}</Link>
      </Box>
      {/* 2nd nav */}
      <Box
        className={
          homepage
            ? styles['header-authentication-link-homepage']
            : styles['header-authentication-link']
        }
      >
        <Link href='/login'>{t('login')}</Link>
        <Button onClick={() => router.push('/register')}>
          {t('getStarted')}
        </Button>
        <LanguageIcon width='30px' height='30px' />
      </Box>
      <Box
        className={`${styles['mobile-header-authentication-link']} ${
          homepage ? styles[''] : styles['not-homepage']
        }`}
      >
        <LanguageIcon width='30px' height='30px' />
        <MenuIcon width='30px' height='30px' onClick={() => dispatch('OPEN')} />
      </Box>
    </nav>
  );
};

export default Header;
