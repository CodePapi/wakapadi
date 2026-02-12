import React from 'react';
import { Box, Link, List, ListItemText, ListItem, Button } from '@mui/material';
import Logo from '../public/logo.svg';
import styles from '../styles/components/Footer.module.css';
import Image from 'next/image';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import InstagramIcon from '@mui/icons-material/Instagram';

const footerLinks = [
  {
    title: 'Explore',
    navigations: [
      {
        title: '#Whois Nearby',
        href: '/whois',
      },
      {
        title: 'Available Tours',
        href: '/available-tours',
      },
      {
        title: 'Featured Tours',
        href: '/featured-tour',
      },
    ],
  },
  {
    title: 'Company',
    navigations: [
      {
        title: 'About Us',
        href: '/about',
      },
      {
        title: 'Blog',
        href: '/blog',
      },
      {
        title: 'Contact Us',
        href: '/contact',
      },
    ],
  },
  {
    title: 'Legal',
    navigations: [
      {
        title: 'Privacy Policy',
        href: '/privacy',
      },
      {
        title: 'Terms of Use',
        href: '/terms',
      },
      {
        title: 'Cookie Policy',
        href: '/cookie',
      },
    ],
  },
];

function Footer() {
  return (
    <footer className={styles.footer}>
      <Box className={styles['footer-container']}>
        <Box className={styles['footer-main-container']}>
          <Box>
            <Image src={Logo} alt='Wakapadi Logo' />
            <p>Explore, connect, and discover local free walking tours</p>
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
          <p>© 2025 Wakapadi. All rights reserved.</p>

          <Box className={styles['footer-main-buttons']}>
            <Button>
              <FacebookIcon />
            </Button>
            <Button>
              <TwitterIcon />
            </Button>
            <Button>
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
