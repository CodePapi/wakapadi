import { Link, Button, Box } from '@mui/material';
import Image from 'next/image';
import LanguageIcon from '@mui/icons-material/Language';
import MenuIcon from '@mui/icons-material/Menu';
import Logo from '../public/logo1.svg';
import styles from '../styles/components/Header.module.css';

const Header = () => {
  return (
    <nav className={styles['header-nav']}>
      <Image src={Logo} alt='Wakapadi Logo' />
      {/* 1st nav */}
      <Box className={styles['header-link-container']}>
        <Link href='#'>Who is Nearby</Link>
        <Link href='#'>About</Link>
        <Link href='#'>Contact</Link>
      </Box>
      {/* authenticate nav */}
      <Box className={styles['header-authentication-link']}>
        <Link href='#'>Log in</Link>
        <Button>Get started</Button>
        <LanguageIcon width='30px' height='30px' />
      </Box>
      <Box className={styles['mobile-header-authentication-link']}>
        <LanguageIcon width='30px' height='30px' />
        <MenuIcon width='30px' height='30px' />
      </Box>
    </nav>
  );
};

export default Header;
