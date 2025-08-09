import { Box, Container, Typography } from '@mui/material';
import Explore from './Explore';
import Head from 'next/head';
import Header from './Header';
import Footer from './../Footer';
import { LayoutProps } from './../../types/components/layout';
import styles from '../../styles/components/layout.module.css';
import OverlayNav from './OverlayNav';
import { useReducer } from 'react';

export default function Layout({
  children,
  title,
  description,
  homepage = false,
}: LayoutProps) {
  const handleMobileNavState = (state: boolean, action: string) => {
    switch (action) {
      case 'OPEN':
        return true;
      case 'CLOSE':
        return false;
      default:
        return state;
    }
  };

  const [ismobileMenuOpen, dispatch] = useReducer(handleMobileNavState, false);

  const overlayNavProps = {
    homepage,
    ismobileMenuOpen,
    dispatch,
  };

  const HeaderProps = {
    homepage,
    dispatch,
    ismobileMenuOpen,
  };
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name='description' content={description} />
        <meta property='og:title' content={title} />
        <meta property='og:description' content={description} />
      </Head>

      <main className={styles.main}>
        <OverlayNav {...overlayNavProps} />
        <Container
          className={`${styles.container} ${homepage ? styles.homepage : ''}`}
        >
          <Header {...HeaderProps} />
        </Container>

        {/* header */}
        {!homepage ? (
          <Typography variant='h1' className={styles.header}>
            {title}
          </Typography>
        ) : null}

        {/* content */}
        <Box
          component='section'
          sx={{ p: homepage ? 0 : 2 }}
          className={styles.main}
        >
          {homepage ? (
            children
          ) : (
            <Container className={styles.container}>{children}</Container>
          )}
        </Box>

        <Explore />

        <Footer />
      </main>
    </>
  );
}
