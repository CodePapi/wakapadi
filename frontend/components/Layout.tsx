// layout.tsx
import {
  AppBar,
  Toolbar,
  Container,
  Box,
  Button,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Menu,
  MenuItem,
  useMediaQuery,
  useTheme,
  Typography,
  Divider,
  ListItemIcon,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useRouter } from 'next/router';
import Head from 'next/head';
import NextLink from 'next/link';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import i18nextConfig from '../next-i18next.config';
import { useTranslation } from 'next-i18next';
import NotificationsDropdown from './NotificationsDropdown';
import styles from './Layout.module.css';
import ReactCountryFlag from 'react-country-flag';

const languages = [
  { code: 'en', name: 'English', flag: 'US' },
  { code: 'de', name: 'Deutsch', flag: 'DE' },
  { code: 'es', name: 'Español', flag: 'ES' },
  { code: 'fr', name: 'Français', flag: 'FR' },
];

export default function Layout({
  children,
  title = 'Wakapadi – Free Walking Tours',
  description = 'Explore, connect, and discover local free walking tours and assistants around the world.',
}: {
  children: React.ReactNode;
  title?: string;
  description?: string;
}) {
  const router = useRouter();
  const { t } = useTranslation('common');
  const currentLocale = router.locale || i18nextConfig.i18n.defaultLocale;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    setIsLoggedIn(!!localStorage.getItem('token'));
    if (userId) setCurrentUserId(userId);
  }, []);

  const handleLanguageMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleLanguageClose = () => {
    setAnchorEl(null);
  };

  const changeLanguage = (locale: string) => {
    handleLanguageClose();
    router.push(router.pathname, router.asPath, { locale });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    setIsLoggedIn(false);
    router.push('/');
  };

  const currentLanguage =
    languages.find((lang) => lang.code === currentLocale) || languages[0];

  return (
    <div className={styles.layoutContainer}>
      <Head>
        <title>{title}</title>
        <meta name='description' content={description} />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <meta property='og:title' content={title} />
        <meta property='og:description' content={description} />
        <link rel='preconnect' href='https://fonts.googleapis.com' />
        <link
          rel='preconnect'
          href='https://fonts.gstatic.com'
          crossOrigin='anonymous'
        />
        <link
          href='https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap'
          rel='stylesheet'
        />
        <link rel='icon' type='image/png' href='/favicon.png' />
      </Head>

      <AppBar
        position='sticky'
        className={styles.appBar}
        elevation={0}
        style={{ zIndex: '10' }}
      >
        <Container maxWidth='lg' disableGutters>
          <Toolbar className={styles.toolbar} disableGutters>
            <Box className={styles.logoContainer}>
              {isMobile && (
                <IconButton
                  edge='start'
                  color='inherit'
                  onClick={() => setDrawerOpen(true)}
                  className={styles.menuButton}
                  aria-label='menu'
                >
                  <MenuIcon />
                </IconButton>
              )}
              <NextLink href='/' className={styles.logoImageWrapper}>
                <img
                  src='/logo1.png'
                  alt='Wakapadi logo'
                  className={styles.logoImage}
                />
              </NextLink>
            </Box>

            {!isMobile && (
              <Box className={styles.desktopNav}>
                <Link href='/whois' className={styles.navLink}>
                  {t('whoisNearby')}
                </Link>
                <Link href='/contact-us' className={styles.navLink}>
                  {t('contactUs')}
                </Link>
                {isLoggedIn && (
                  <>
                    <Link href='/profile' className={styles.navLink}>
                      {t('profile')}
                    </Link>
                    <NotificationsDropdown currentUserId={currentUserId} />
                  </>
                )}
                <Box className={styles.authSection}>
                  {isLoggedIn ? (
                    <Button
                      onClick={handleLogout}
                      className={styles.logoutButton}
                      variant='text'
                    >
                      {t('logout')}
                    </Button>
                  ) : (
                    <>
                      <Button
                        href='/login'
                        className={styles.loginButton}
                        variant='outlined'
                      >
                        {t('login')}
                      </Button>
                      {/* <Button
                        href="/register"
                        className={styles.registerButton}
                        variant="contained"
                      >
                        {t('register')}
                      </Button> */}
                    </>
                  )}
                </Box>

                <Button
                  onClick={handleLanguageMenu}
                  className={styles.languageButton}
                  startIcon={
                    <ReactCountryFlag
                      countryCode={currentLanguage.flag}
                      svg
                      style={{
                        width: '1.5em',
                        height: '1.5em',
                        lineHeight: '1.5em',
                      }}
                    />
                  }
                >
                  {currentLanguage.code.toUpperCase()}
                </Button>

                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleLanguageClose}
                  className={styles.languageMenu}
                >
                  {languages.map((language) => (
                    <MenuItem
                      key={language.code}
                      onClick={() => changeLanguage(language.code)}
                      selected={language.code === currentLocale}
                      className={styles.languageMenuItem}
                    >
                      <ListItemIcon className={styles.languageListItemIcon}>
                        <ReactCountryFlag
                          countryCode={language.flag}
                          svg
                          style={{ width: '1.5em', height: '1.5em' }}
                        />
                      </ListItemIcon>
                      <ListItemText>{language.name}</ListItemText>
                    </MenuItem>
                  ))}
                </Menu>
              </Box>
            )}
          </Toolbar>
        </Container>
      </AppBar>

      <Drawer
        anchor='right'
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        classes={{ paper: styles.drawerPaper }}
      >
        <Box className={styles.drawerContainer}>
          <Box className={styles.drawerLogoWrapper}>
            <Link
              href='/'
              className={styles.logoImageWrapper}
              onClick={() => setDrawerOpen(false)}
            >
              <img
                src='/logo1.png'
                alt='Wakapadi logo'
                className={styles.logoImage1}
              />
            </Link>
          </Box>
          <Divider className={styles.drawerDivider} />
          <List className={styles.drawerList}>
            <ListItem
              component={NextLink}
              href='/whois'
              onClick={() => setDrawerOpen(false)}
              className={styles.drawerItem}
            >
              <ListItemText
                primary={t('whoisNearby')}
                className={styles.drawerItemText}
              />
            </ListItem>

            <ListItem
              component={NextLink}
              href='/contact-us'
              onClick={() => setDrawerOpen(false)}
              className={styles.drawerItem}
            >
              <ListItemText
                primary={t('contactUs')}
                className={styles.drawerItemText}
              />
            </ListItem>

            {isLoggedIn && (
              <ListItem
                component={NextLink}
                href='/profile'
                onClick={() => setDrawerOpen(false)}
                className={styles.drawerItem}
              >
                <ListItemText
                  primary={t('profile')}
                  className={styles.drawerItemText}
                />
              </ListItem>
            )}
          </List>

          <Box className={styles.drawerFooter}>
            <Divider className={styles.drawerDivider} />
            <List>
              {languages.map((language) => (
                <MenuItem
                  key={language.code}
                  onClick={() => {
                    changeLanguage(language.code);
                    setDrawerOpen(false);
                  }}
                  selected={language.code === currentLocale}
                  className={styles.drawerItem}
                >
                  <ListItemIcon className={styles.languageListItemIcon}>
                    <ReactCountryFlag
                      countryCode={language.flag}
                      svg
                      style={{ width: '1.5em', height: '1.5em' }}
                    />
                  </ListItemIcon>
                  <ListItemText primary={language.name} />
                </MenuItem>
              ))}
            </List>
            <Divider className={styles.drawerDivider} />
            {isLoggedIn ? (
              <ListItem
                onClick={() => {
                  handleLogout();
                  setDrawerOpen(false);
                }}
                className={`${styles.drawerItem} ${styles.logoutDrawerItem}`}
              >
                <ListItemText
                  primary={t('logout')}
                  className={styles.drawerItemText}
                />
              </ListItem>
            ) : (
              <>
                <ListItem
                  component={NextLink}
                  href='/login'
                  onClick={() => setDrawerOpen(false)}
                  className={`${styles.drawerItem} ${styles.loginDrawerItem}`}
                >
                  <ListItemText
                    primary={t('login')}
                    className={styles.drawerItemText}
                  />
                </ListItem>
                {/* <ListItem
                  component={NextLink}
                  href="/register"
                  onClick={() => setDrawerOpen(false)}
                  className={`${styles.drawerItem} ${styles.registerDrawerItem}`}
                >
                  <ListItemText
                    primary={t('register')}
                    className={styles.drawerItemText}
                  />
                </ListItem> */}
              </>
            )}
          </Box>
        </Box>
      </Drawer>

      <main className={styles.mainContent}>{children}</main>

      <Box component='footer' className={styles.footer}>
        <Container maxWidth='lg' className={styles.footerContent}>
          <Box className={styles.footerMain}>
            <Box className={styles.footerLogo}>
              <img
                src='/logo1.png'
                alt='Wakapadi logo'
                className={styles.footerLogoImage}
              />
              <Typography variant='body2' className={styles.footerTagline}>
                {t('footerTagline')}
              </Typography>
            </Box>

            <Box className={styles.footerLinks}>
              <Box className={styles.footerLinkGroup}>
                <Typography
                  variant='subtitle2'
                  className={styles.footerLinkTitle}
                >
                  {t('explore')}
                </Typography>
                <Link href='/whois' className={styles.footerLink}>
                  {t('whoisNearby')}
                </Link>
                <Link href='/tours' className={styles.footerLink}>
                  {t('availableTours')}
                </Link>
                <Link href='/featured' className={styles.footerLink}>
                  {t('featuredTours')}
                </Link>
              </Box>

              <Box className={styles.footerLinkGroup}>
                <Typography
                  variant='subtitle2'
                  className={styles.footerLinkTitle}
                >
                  {t('company')}
                </Typography>
                <Link href='/about' className={styles.footerLink}>
                  {t('aboutUs')}
                </Link>
                <Link href='/blog' className={styles.footerLink}>
                  {t('blog')}
                </Link>
                <Link href='/contact-us' className={styles.footerLink}>
                  {t('contactUs')}
                </Link>
              </Box>

              <Box className={styles.footerLinkGroup}>
                <Typography
                  variant='subtitle2'
                  className={styles.footerLinkTitle}
                >
                  {t('legal')}
                </Typography>
                <Link href='/privacy' className={styles.footerLink}>
                  {t('privacyPolicy')}
                </Link>
                <Link href='/terms' className={styles.footerLink}>
                  {t('termsOfUse')}
                </Link>
                <Link href='/cookies' className={styles.footerLink}>
                  {t('cookiePolicy')}
                </Link>
              </Box>
            </Box>
          </Box>

          <Divider className={styles.footerDivider} />

          <Box className={styles.footerBottom}>
            <Typography variant='body2' className={styles.copyright}>
              &copy; {new Date().getFullYear()} Wakapadi.{' '}
              {t('allRightsReserved')}.
            </Typography>

            <Box className={styles.socialLinks}>
              <Link href='#' className={styles.socialLink}>
                <img src='/icons/facebook.svg' alt='Facebook' />
              </Link>
              <Link href='#' className={styles.socialLink}>
                <img src='/icons/twitter.svg' alt='Twitter' />
              </Link>
              <Link href='#' className={styles.socialLink}>
                <img src='/icons/instagram.svg' alt='Instagram' />
              </Link>
            </Box>
          </Box>
        </Container>
      </Box>
    </div>
  );
}
