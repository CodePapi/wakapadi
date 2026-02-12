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
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  useMediaQuery,
  useTheme,
  Typography,
  Divider,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import ExploreIcon from '@mui/icons-material/Explore';
import TourIcon from '@mui/icons-material/Tour';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LoginIcon from '@mui/icons-material/Login';
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { useRouter } from 'next/router';
import Head from 'next/head';
import NextLink from 'next/link';
import Image from 'next/image';
import React, { useEffect, useState, useMemo } from 'react';
import i18nextConfig from '../next-i18next.config';
import { useTranslation } from 'next-i18next';
import NotificationsDropdown from './NotificationsDropdown';
import styles from './Layout.module.css';
import ReactCountryFlag from 'react-country-flag';
import { safeStorage } from '../lib/storage';
import { clearDeviceId, ensureAnonymousSession } from '../lib/anonymousAuth';
import { api } from '../lib/api/index';
import logo from '../public/logo1.svg';

const languages = [
  { code: 'en', name: 'English', flag: 'US' },
  { code: 'de', name: 'Deutsch', flag: 'DE' },
  { code: 'es', name: 'Español', flag: 'ES' },
  { code: 'fr', name: 'Français', flag: 'FR' },
];

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export default function Layout({
  children,
  title = 'Wakapadi – Free Walking Tours',
  description = 'Explore, connect, and discover local free walking tours and assistants around the world.',
}: LayoutProps) {
  const router = useRouter();
  const { t } = useTranslation('common');
  const currentLocale = router.locale || i18nextConfig.i18n.defaultLocale;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    (async () => {
      try {
        const session = await ensureAnonymousSession();
        setIsLoggedIn(!!session?.token);
        if (session?.userId) setCurrentUserId(session.userId);
      } catch (error) {
        console.warn('Anonymous session failed', error);
      }
    })();
  }, []);

  const handleLanguageMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleLanguageClose = () => setAnchorEl(null);

  const changeLanguage = (locale: string) => {
    handleLanguageClose();
    router.push(router.pathname, router.asPath, { locale });
  };

  const confirmLogout = async () => {
    try {
      const userId = safeStorage.getItem('userId');
      const authProvider = safeStorage.getItem('authProvider');

      if (userId && authProvider !== 'anonymous') {
        await api.delete(`/users/${userId}`);
      } else {
        await api.delete('/auth/me');
      }
    } catch (error) {
      console.warn('Logout cleanup failed', error);
    } finally {
      safeStorage.removeItem('token');
      safeStorage.removeItem('userId');
      safeStorage.removeItem('authProvider');
      clearDeviceId();
      setIsLoggedIn(false);
      setLogoutDialogOpen(false);
      router.push('/');
    }
  };

  const currentLanguage = useMemo(() => 
    languages.find((lang) => lang.code === currentLocale) || languages[0],
  [currentLocale]);

  return (
    <div className={styles.layoutContainer}>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <link rel="icon" type="image/png" href="/favicon.png" />
      </Head>

      <AppBar position="sticky" className={styles.appBar} elevation={0} sx={{ zIndex: 1100, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Container maxWidth="lg">
          <Toolbar className={styles.toolbar} disableGutters>
            <Box className={styles.logoContainer} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {isMobile && (
                <IconButton edge="start" color="inherit" onClick={() => setDrawerOpen(true)} aria-label="open menu">
                  <MenuIcon />
                </IconButton>
              )}
              <NextLink href="/" className={styles.logoLink} style={{ display: 'flex', alignItems: 'center' }}>
                <Image 
                  src={logo} 
                  alt="Wakapadi logo" 
                  width={140} 
                  height={38} 
                  priority 
                  style={{ objectFit: 'contain' }}
                />
              </NextLink>
            </Box>

            {!isMobile && (
              <Box className={styles.desktopNav} sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: 'auto' }}>
                <NextLink href="/whois" className={styles.navLink}>{t('whoisNearby')}</NextLink>
                <NextLink href="/tours" className={styles.navLink}>{t('availableTours')}</NextLink>
                <NextLink href="/contact-us" className={styles.navLink}>{t('contactUs')}</NextLink>
                <NextLink href="/admin" className={styles.navLink} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AdminPanelSettingsIcon fontSize="small" /> Admin
                </NextLink>
                
                {isLoggedIn && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <NextLink href="/profile" className={styles.navLink}>{t('profile')}</NextLink>
                    <NotificationsDropdown currentUserId={currentUserId} />
                  </Box>
                )}

                <Box sx={{ ml: 2, display: 'flex', gap: 1 }}>
                  {isLoggedIn ? (
                    <Button onClick={() => setLogoutDialogOpen(true)} color="inherit" variant="text">
                      {t('logout')}
                    </Button>
                  ) : (
                    <>
                      <Button component={NextLink} href="/login" variant="outlined" size="small">
                        {t('login')}
                      </Button>
                      <Button component={NextLink} href="/register" variant="contained" size="small">
                        {t('register')}
                      </Button>
                    </>
                  )}
                </Box>

                {/* Fixed Language Menu Logic */}
                <Button
                  onClick={handleLanguageMenu}
                  startIcon={<ReactCountryFlag countryCode={currentLanguage.flag} svg />}
                  sx={{ ml: 1, color: 'text.primary' }}
                >
                  {currentLanguage.code.toUpperCase()}
                </Button>

                <Menu 
                  anchorEl={anchorEl} 
                  open={Boolean(anchorEl)} 
                  onClose={handleLanguageClose}
                  disableScrollLock // Recommended for Next.js to prevent body jumping
                >
                  {languages.map((language) => (
                    <MenuItem 
                      key={language.code} 
                      onClick={() => changeLanguage(language.code)}
                      selected={language.code === currentLocale}
                    >
                      <ListItemIcon>
                        <ReactCountryFlag countryCode={language.flag} svg style={{ width: '1.2em', height: '1.2em' }} />
                      </ListItemIcon>
                      <ListItemText primary={language.name} />
                    </MenuItem>
                  ))}
                </Menu>
              </Box>
            )}
          </Toolbar>
        </Container>
      </AppBar>

      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 280 }} role="presentation">
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Image src={logo} alt="Wakapadi logo" width={110} height={30} style={{ objectFit: 'contain' }} />
            <IconButton onClick={() => setDrawerOpen(false)}><CloseIcon /></IconButton>
          </Box>
          <Divider />
          <List>
            {[
              { href: '/whois', text: t('whoisNearby'), icon: <ExploreIcon /> },
              { href: '/tours', text: t('availableTours'), icon: <TourIcon /> },
              { href: '/contact-us', text: t('contactUs'), icon: <SupportAgentIcon /> },
              { href: '/admin', text: 'Admin', icon: <AdminPanelSettingsIcon /> },
            ].map((item) => (
              <ListItem key={item.href} component={NextLink} href={item.href} onClick={() => setDrawerOpen(false)}>
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
            
            {isLoggedIn && (
              <ListItem component={NextLink} href="/profile" onClick={() => setDrawerOpen(false)}>
                <ListItemIcon><AccountCircleIcon /></ListItemIcon>
                <ListItemText primary={t('profile')} />
              </ListItem>
            )}
          </List>
          <Divider />
          
          {/* Mobile Language Selection */}
          <Typography variant="overline" sx={{ px: 2, pt: 2, display: 'block', color: 'text.secondary' }}>
            {t('language', 'Language')}
          </Typography>
          <List>
            {languages.map((language) => (
              <ListItem key={language.code} disablePadding>
                <ListItemButton
                  onClick={() => changeLanguage(language.code)}
                  selected={language.code === currentLocale}
                  sx={{ cursor: 'pointer' }}
                >
                  <ListItemIcon>
                    <ReactCountryFlag countryCode={language.flag} svg />
                  </ListItemIcon>
                  <ListItemText primary={language.name} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>

          <Divider />
          <List>
            {isLoggedIn ? (
              <ListItem onClick={() => { setDrawerOpen(false); setLogoutDialogOpen(true); }} sx={{ cursor: 'pointer' }}>
                <ListItemIcon><LogoutIcon /></ListItemIcon>
                <ListItemText primary={t('logout')} />
              </ListItem>
            ) : (
              <>
                <ListItem component={NextLink} href="/login" onClick={() => setDrawerOpen(false)}>
                  <ListItemIcon><LoginIcon /></ListItemIcon>
                  <ListItemText primary={t('login')} />
                </ListItem>
                <ListItem component={NextLink} href="/register" onClick={() => setDrawerOpen(false)}>
                  <ListItemIcon><PersonAddAltIcon /></ListItemIcon>
                  <ListItemText primary={t('register')} />
                </ListItem>
              </>
            )}
          </List>
        </Box>
      </Drawer>

      <main className={styles.mainContent} style={{ minHeight: '80vh' }}>
        {children}
      </main>

      <Dialog open={logoutDialogOpen} onClose={() => setLogoutDialogOpen(false)}>
        <DialogTitle>{t('confirmLogoutTitle', 'Confirm Logout')}</DialogTitle>
        <DialogContent>
          <Typography>{t('confirmLogoutMessage', 'Are you sure you want to log out? This will clear your session.')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogoutDialogOpen(false)}>{t('cancel')}</Button>
          <Button onClick={confirmLogout} color="error" variant="contained">{t('logout')}</Button>
        </DialogActions>
      </Dialog>

      <Box component="footer" sx={{ py: 6, mt: 'auto', bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider' }}>
        <Container maxWidth="lg">
          <Typography variant="body2" color="text.secondary" align="center">
            &copy; {new Date().getFullYear()} Wakapadi. {t('allRightsReserved')}.
          </Typography>
        </Container>
      </Box>
    </div>
  );
}