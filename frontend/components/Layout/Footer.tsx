import React from 'react';
import { Box, Link, List, ListItemText, ListItem, Button } from '@mui/material';
import Logo from '../public/logo.svg';
import styles from '../styles/components/Footer.module.css';
import Image from 'next/image';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import InstagramIcon from '@mui/icons-material/Instagram';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';

function Footer() {
  const router = useRouter();
  const { t } = useTranslation('common');

  const footerLinks = [
    {
      title: 'Explore',
      navigations: [
        {
          title: t('whoisNearby'),
          href: '/whois',
        },
        {
          title: t('availableTours'),
          href: '/tours',
        },
        {
          title: t('featuredTours'),
          href: '/tours',
        },
      ],
    },
    {
      title: 'Company',
      navigations: [
        {
          title: t('aboutUs'),
          href: '/about',
        },
        {
          title: t('blog'),
          href: '/404',
        },
        {
          title: t('contactUs'),
          href: '/contact-us',
        },
      ],
    },
    {
      title: 'Legal',
      navigations: [
        {
          title: t('privacyPolicy'),
          href: '/privacy',
        },
        {
          title: t('termsOfUse'),
          href: '/terms',
        },
        {
          title: t('cookiePolicy'),
          href: '/cookies',
        },
      ],
    },
  ];

  return (
    <footer className={styles.footer}>
      <Box className={styles['footer-container']}>
        <Box className={styles['footer-main-container']}>
          <Box>
            <Image src={Logo} alt='Wakapadi Logo' />
            <p>{t('footerTagline')}</p>
          </Box>
          <Box className={styles['footer-main-container-link']}>
            {footerLinks.map((footerLink, index) => {
              const sectionTitle = footerLink.title;
              return (
                <List
                  key={index}
                  sx={{
                    width: '100%',
                    maxWidth: 360,
                  }}
                  component='nav'
                  aria-labelledby='nested-list-subheader'
                >
                  <ListItemText
                    primary={sectionTitle}
                    className={styles['footer-main-container-link-title']}
                  />
                  {footerLink.navigations.map((link, linkIndex) => (
                    <ListItem key={linkIndex} disableGutters>
                      <Link href={link?.href} color='inherit'>
                        {link?.title}
                      </Link>
                    </ListItem>
                  ))}
                </List>
              );
            })}
          </Box>
        </Box>
        <Box className={styles['footer-main-copyright']}>
          <p>{t('allRightsReserved')}</p>

          <Box className={styles['footer-main-buttons']}>
            <Button onClick={() => router.push('/')}>
              <FacebookIcon />
            </Button>
            <Button onClick={() => router.push('/')}>
              <TwitterIcon />
            </Button>
            <Button onClick={() => router.push('/')}>
              <InstagramIcon />
            </Button>
          </Box>
        </Box>
      </Box>
    </footer>
  );
}

export default Footer;

{
  /* {footerLinks[0] !== footerLink ? (
                      footerLink.map((link, index) => {
                        return (
                          <li key={index}>
                            <Link href={link}></Link>
                          </li>
                        );
                      })
                    ) : (
                      <p>{footerLink}</p>
                    )} */
}
