import { Link, Button, Box } from '@mui/material';
import Image from 'next/image';
import LanguageIcon from '@mui/icons-material/Language';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import Logo from '../public/logo1.svg';
import HeroPageLogo from '../public/logo2.svg';
import styles from '../styles/components/Header.module.css';
import { useReducer } from 'react';

interface HeaderProps {
  homepage?: boolean;
}

const Header = (props: HeaderProps) => {
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

  // useReducer to manage mobile menu state
  // 'OPEN' to open the menu, 'CLOSE' to close it
  const [ismobileMenuOpen, dispatch] = useReducer(handleMobileNavState, false);
  const { homepage } = props;

  // Render the header with different styles based on homepage prop
  if (homepage) {
    return (
      <nav className={styles['header-nav-homepage']}>
        <Image src={Logo} alt='Wakapadi Logo' />
        <Box className={styles['header-link-container']}>
          <Link href='#'>Who is Nearby</Link>
          <Link href='#'>About</Link>
          <Link href='#'>Contact</Link>
        </Box>
        <Box className={styles['header-authentication-link-homepage']}>
          <Link href='#'>Log in</Link>
          <Button>Get started</Button>
          <LanguageIcon width='30px' height='30px' />
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
    <nav className={styles['header-nav']}>
      <Image src={Logo} alt='Wakapadi Logo' />
      {/* 1st nav */}
      <Box className={styles['header-link-container']}>
        <Link href='#'>Who is Nearby</Link>
        <Link href='#'>About</Link>
        <Link href='#'>Contact</Link>
      </Box>
      {/* 2nd nav */}
      <Box className={styles['header-authentication-link']}>
        <Link href='#'>Log in</Link>
        <Button>Get started</Button>
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

      <Box
        className={`${styles['mobile-header-link-container']} ${
          ismobileMenuOpen ? styles['active'] : ''
        }`}
      >
        <Box className={styles['mobile-header-link-container-top-nav']}>
          <Image src={HeroPageLogo} alt='Wakapadi Logo' />
          <CloseIcon
            className={styles['mobile-header-link-container-top-nav-close']}
            onClick={() => dispatch('CLOSE')}
          />
        </Box>

        <Box
          className={`${styles['mobile-header-link-container-links']} ${styles['mobile-header-link-container-links-not-homepage']}`}
        >
          <Link href='#' className={styles['header-link']}>
            Who is Nearby
          </Link>
          <Link href='#' className={styles['header-link']}>
            About
          </Link>
          <Link href='#' className={styles['header-link']}>
            Contact
          </Link>
          <Link>Log in</Link>
          <Box className={styles['mobile-header-link-container-language']}>
            {/* Language Icon and Text */}
            <LanguageIcon width='30px' height='30px' />
            <select name='language' id='language'>
              <option value='english'>English</option>
              <option value='french'>French</option>
              <option value='spanish'>Spanish</option>
              <option value='german'>German</option>
            </select>
            {/* <Typography variant='body1'>English</Typography> */}
          </Box>
          <Button>Sign up</Button>
        </Box>
      </Box>
    </nav>
  );
};

export default Header;
