import { Box, Button, Typography } from '@mui/material';
import styles from '../../styles/components/explore.module.css';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';


const Explore = () => {
  const router = useRouter();
  const { t } = useTranslation('common');

  return (
    <Box className={styles.explore}>
      <Typography variant='h2'>{t('exploreTitle')}</Typography>
      <Typography variant='body1'>{t('exploreSubtitle')}</Typography>
      <Button onClick={() => router.push('/register')}>
        {t('exploreButton')}
      </Button>
    </Box>
  );
};

export default Explore;
