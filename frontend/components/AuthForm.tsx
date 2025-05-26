// components/AuthForm.tsx
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
  Alert,
  CircularProgress
} from '@mui/material';
import { api } from '../lib/api';
import { useRouter } from 'next/router';

type AuthMode = 'login' | 'register' | 'forgot';

export default function AuthForm({ mode = 'login' }: { mode?: AuthMode }) {
  const [currentMode, setCurrentMode] = useState<AuthMode>(mode);
  const [form, setForm] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Reset form when switching modes
  useEffect(() => {
    setForm({ email: '', username: '', password: '', confirmPassword: '' });
    setErrors({});
  }, [currentMode]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!form.email) {
      newErrors.email = 'Email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (currentMode !== 'forgot') {
      if (!form.password) {
        newErrors.password = 'Password is required';
      } else if (form.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }

      if (currentMode === 'register') {
        if (!form.username) {
          newErrors.username = 'Username is required';
        }
        if (form.password !== form.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        }
        if (!agreeTerms) {
          newErrors.terms = 'You must agree to the terms';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    // Clear error when user starts typing
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      let response;
      
      if (currentMode === 'login') {
        response = await api.post('/auth/login', {
          email: form.email,
          password: form.password
        });
      } else if (currentMode === 'register') {
        response = await api.post('/auth/register', {
          email: form.email,
          username: form.username,
          password: form.password
        });
      } else {
        response = await api.post('/auth/forgot-password', {
          email: form.email
        });
        setErrors({});
        return;
      }

      // Handle successful authentication
      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        api.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
        
        // Redirect to profile or dashboard
        const redirectTo = router.query.redirect || '/profile';
        router.push(typeof redirectTo === 'string' ? redirectTo : '/profile');
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      setErrors({
        form: error.response?.data?.message || 
             'Authentication failed. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 6 }}>
      <Typography variant="h4" gutterBottom>
        {currentMode === 'login' && 'Login'}
        {currentMode === 'register' && 'Create Account'}
        {currentMode === 'forgot' && 'Reset Password'}
      </Typography>

      {errors.form && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errors.form}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          margin="normal"
          name="email"
          label="Email"
          type="email"
          value={form.email}
          onChange={handleChange}
          error={!!errors.email}
          helperText={errors.email}
          required
        />

        {currentMode !== 'forgot' && (
          <>
            {currentMode === 'register' && (
              <TextField
                fullWidth
                margin="normal"
                name="username"
                label="Username"
                value={form.username}
                onChange={handleChange}
                error={!!errors.username}
                helperText={errors.username}
                required
              />
            )}

            <TextField
              fullWidth
              margin="normal"
              type="password"
              name="password"
              label={currentMode === 'login' ? 'Password' : 'Create Password'}
              value={form.password}
              onChange={handleChange}
              error={!!errors.password}
              helperText={errors.password}
              required
            />

            {currentMode === 'register' && (
              <TextField
                fullWidth
                margin="normal"
                type="password"
                name="confirmPassword"
                label="Confirm Password"
                value={form.confirmPassword}
                onChange={handleChange}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword}
                required
              />
            )}
          </>
        )}

        {currentMode === 'register' && (
          <FormControlLabel
            control={
              <Checkbox
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Typography color={errors.terms ? 'error' : 'inherit'}>
                I agree to the terms and conditions
              </Typography>
            }
            sx={{ mt: 1, mb: 2 }}
          />
        )}

        <Button
          fullWidth
          variant="contained"
          type="submit"
          size="large"
          sx={{ mt: 2 }}
          disabled={isLoading}
        >
          {isLoading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            currentMode === 'login' ? 'Sign In' :
            currentMode === 'register' ? 'Create Account' : 'Send Reset Link'
          )}
        </Button>
      </form>

      <Box sx={{ mt: 3, textAlign: 'center' }}>
        {currentMode === 'login' ? (
          <>
            <Typography variant="body2">
              Don't have an account?{' '}
              <Link
                component="button"
                onClick={() => setCurrentMode('register')}
                underline="hover"
              >
                Sign up
              </Link>
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              <Link
                component="button"
                onClick={() => setCurrentMode('forgot')}
                underline="hover"
              >
                Forgot password?
              </Link>
            </Typography>
          </>
        ) : currentMode === 'register' ? (
          <Typography variant="body2">
            Already have an account?{' '}
            <Link
              component="button"
              onClick={() => setCurrentMode('login')}
              underline="hover"
            >
              Sign in
            </Link>
          </Typography>
        ) : (
          <Typography variant="body2">
            Remember your password?{' '}
            <Link
              component="button"
              onClick={() => setCurrentMode('login')}
              underline="hover"
            >
              Sign in
            </Link>
          </Typography>
        )}
      </Box>
    </Container>
  );
}