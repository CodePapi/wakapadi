import { useState, useEffect } from 'react';
import { Container, Typography } from '@mui/material';
import { useTranslation } from 'next-i18next';

export default function AuthPage() {
  const { t } = useTranslation('common');

  return (
    <Container maxWidth="sm">
      <Typography variant="h4" gutterBottom>
        {t('authDeprecatedTitle')}
      </Typography>
      <Typography>{t('authDeprecatedBody')}</Typography>
    </Container>
  );
}
      <Box className={styles.switchAuthMode}>
        <Typography variant="body2">
          {isLogin ? t('authNoAccount') : t('authHaveAccount')}
          <Link
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className={styles.authModeLink}
          >
            {isLogin ? ` ${t('authSignUp')}` : ` ${t('authLogin')}`}
          </Link>
        </Typography>

        {isLogin && (
          <Link href="/forgot-password" className={styles.forgotPassword}>
            {t('authForgotPassword')}
          </Link>
        )}
      </Box>
    </Container>
  );
}
