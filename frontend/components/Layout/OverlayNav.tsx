import Image from 'next/image';
import { Link, Button, Box } from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import CloseIcon from '@mui/icons-material/Close';
import styles from '../../styles/components/Header.module.css';
import HeroPageLogo from '../../public/logo2.svg';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router'

interface OverlayNavProps {
  homepage: boolean;
  ismobileMenuOpen: boolean;
  dispatch: React.Dispatch<string>;
}

const OverlayNav = ({
  homepage,
  ismobileMenuOpen,
  dispatch,
}: OverlayNavProps) => {
  const { t } = useTranslation('common');
  const router = useRouter();
  
  return (
    <Box
      className={`${styles['mobile-header-link-container']} ${
        ismobileMenuOpen ? styles['active'] : ''
      }`}
    >
      <Box className={styles['mobile-header-link-container-top-nav']}>
        <Image src={HeroPageLogo} alt='Wakapadi Logo' onClick={() => router.push('/')} />
        <CloseIcon
          className={styles['mobile-header-link-container-top-nav-close']}
          onClick={() => dispatch('CLOSE')}
        />
      </Box>

      <Box
        className={
          homepage
            ? styles['mobile-header-link-container-links']
            : `${styles['mobile-header-link-container-links']} ${styles['mobile-header-link-container-links-not-homepage']}`
        }
      >
        <Link href='/whois' className={styles['header-link']}>
        {t('whoisnearbylink')}
        </Link>
        <Link href='/about' className={styles['header-link']}>
        {t('about')}
        </Link>
        <Link href='/contact-us' className={styles['header-link']}>
        {t('contact')}
        </Link>
        <Link href='/login'>{t('login')}</Link>
        <Box className={styles['mobile-header-link-container-language']}>
          {/* Language Icon and Text */}
          <LanguageIcon width='30px' height='30px' />
          <select name='language' id='language'>
            <option value='english' style={{color: '#000'}}>English</option>
            <option value='french' style={{color: '#000'}}>French</option>
            <option value='spanish' style={{color: '#000'}}>Spanish</option>
            <option value='german' style={{color: '#000'}}>German</option>
          </select>
          {/* <Typography variant='body1'>English</Typography> */}
        </Box>
        <Button onClick={() => router.push('/register')}>Sign up</Button>
      </Box>
    </Box>
  );
};

export default OverlayNav;
