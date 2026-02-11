import { useState, useEffect } from 'react';
import {
  Container,
  TextField,
  Button,
  Typography,
  Checkbox,
  FormControlLabel,
  Link,
  Box,
  Divider,
  Alert,
} from '@mui/material';
import { api } from '../lib/api/index';
import { useRouter } from 'next/router';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import styles from '../styles/AuthPage.module.css';
import { useTranslation, Trans } from 'next-i18next';
import { safeStorage } from '../lib/storage';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ email: '', username: '', password: '' });
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { t } = useTranslation('common');

  // Effect to capture the 'from' query parameter on component mount
  useEffect(() => {
    // Check if there's a 'from' query parameter (e.g., /auth?from=/dashboard)
    if (router.query.from) {
      safeStorage.setItem('lastPageBeforeLogin', router.query.from as string);
    }
  }, [router.query.from]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSuccessfulAuth = () => {
    const lastPage = safeStorage.getItem('lastPageBeforeLogin');
    if (lastPage) {
      router.push(lastPage);
      safeStorage.removeItem('lastPageBeforeLogin');
    } else {
      router.push('/whois'); 
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { email, username, password } = form;

    setError('');

    if (!email || !password || (!isLogin && !username)) {
      setError(t('authErrorRequiredFields'));
      return;
    }
    if (!isLogin && !agreeTerms) {
      setError(t('authErrorAgreeTerms'));
      return;
    }

    try {
      const endpoint = isLogin ? 'login' : 'register';
      const res = await api.post(`/auth/${endpoint}`, {
        email,
        username,
        password,
      });

      safeStorage.setItem('token', res.data.token);
      safeStorage.setItem('userId', res.data.userId);
      handleSuccessfulAuth();
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: unknown }).response === 'object' &&
        (err as { response?: { data?: unknown } }).response?.data &&
        typeof (err as { response: { data: { message?: unknown } } }).response
          .data.message === 'string'
      ) {
        setError(
          (err as { response: { data: { message: string } } }).response.data
            .message
        );
      } else {
        setError(t('authErrorFallback'));
      }
    }
  };
  const handleGoogleSuccess = async (
    credentialResponse: CredentialResponse
  ) => {
    try {
      const res = await api.post('/auth/google/token', {
        idToken: credentialResponse.credential,
      });

      safeStorage.setItem('token', res.data.token);
      safeStorage.setItem('userId', res.data.userId);
      handleSuccessfulAuth();
    } catch (err) {
      console.error('Google login error', err);
      setError(t('authGoogleLoginFailedDetailed'));
    }
  };

  return (
    <Container maxWidth="sm" className={styles.authContainer}>
      <Typography variant="h4" className={styles.title}>
        {isLogin ? t('authWelcomeBack') : t('authCreateAccount')}
      </Typography>

      <Typography variant="body1" className={styles.subtitle}>
        {isLogin ? t('authSignInContinue') : t('authJoinCommunity')}
      </Typography>

      {/* Google Login First */}
      <Box className={styles.googleButtonContainer}>
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => setError(t('authGoogleLoginFailed'))}
          theme="filled_blue"
          size="large"
          width="100%"
        />
      </Box>

      <Divider className={styles.divider}>{t('authDividerOr')}</Divider>

      {/* Email Form */}
      <form onSubmit={handleSubmit} className={styles.authForm}>
        <TextField
          fullWidth
          name="email"
          label={t('authEmailLabel')}
          type="email"
          value={form.email}
          onChange={handleChange}
          className={styles.inputField}
          required
        />

        {!isLogin && (
          <TextField
            fullWidth
            name="username"
            label={t('authUsernameLabel')}
            value={form.username}
            onChange={handleChange}
            className={styles.inputField}
            required
          />
        )}

        <TextField
          fullWidth
          type="password"
          name="password"
          label={t('authPasswordLabel')}
          value={form.password}
          onChange={handleChange}
          className={styles.inputField}
          required
        />

        {!isLogin && (
          <FormControlLabel
            control={
              <Checkbox
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                color="primary"
              />
            }
            label={
              <span className={styles.termsText}>
                <Trans
                  i18nKey="authAgreeTerms"
                  components={{
                    terms: <Link href="/terms" />,
                    privacy: <Link href="/privacy" />,
                  }}
                />
              </span>
            }
            className={styles.termsCheckbox}
          />
        )}

        {error && (
          <Alert severity="error" className={styles.errorAlert}>
            {error}
          </Alert>
        )}

        <Button
          fullWidth
          type="submit"
          variant="contained"
          className={styles.submitButton}
        >
          {isLogin ? t('authLoginWithEmail') : t('authSignUpWithEmail')}
        </Button>
      </form>

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
