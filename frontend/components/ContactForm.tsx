// components/ContactForm.tsx
import { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  MenuItem,
  Typography,
  Alert,
  Paper,
  Stack,
} from '@mui/material';
import { api } from '../lib/api/index';
import { useTranslation } from 'next-i18next';

const initialForm = {
  name: '',
  email: '',
  type: 'inquiry',
  message: '',
};

export default function ContactForm() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const { t } = useTranslation('common');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    try {
      await api.post(`/contact`, { ...form });

      setStatus('success');
      setForm(initialForm);
    } catch (err) {
      console.error('error', err);
      setStatus('error');
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{ maxWidth: 560, mx: 'auto', p: { xs: 3, sm: 4 }, borderRadius: 3 }}
    >
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="h5" gutterBottom>
              {t('contactFormTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('contactSubtitle')}
            </Typography>
          </Box>

          <TextField
            label={t('contactFormNameLabel')}
            name="name"
            fullWidth
            required
            autoComplete="name"
            value={form.name}
            onChange={handleChange}
          />
          <TextField
            label={t('contactFormEmailLabel')}
            name="email"
            fullWidth
            required
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={handleChange}
          />
          <TextField
            select
            label={t('contactFormTypeLabel')}
            name="type"
            fullWidth
            value={form.type}
            onChange={handleChange}
          >
            {[
              { value: 'inquiry', label: t('contactFormTypeInquiry') },
              { value: 'complaint', label: t('contactFormTypeComplaint') },
              { value: 'feedback', label: t('contactFormTypeFeedback') },
              { value: 'suggestion', label: t('contactFormTypeSuggestion') },
              { value: 'other', label: t('contactFormTypeOther') },
            ].map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label={t('contactFormMessageLabel')}
            name="message"
            fullWidth
            required
            multiline
            minRows={4}
            maxRows={8}
            value={form.message}
            onChange={handleChange}
          />

          <Button
            variant="contained"
            type="submit"
            size="large"
            disabled={status === 'sending'}
            sx={{ borderRadius: 999, py: 1.2, fontWeight: 600 }}
          >
            {t('contactFormSubmit')}
          </Button>

          {status !== 'idle' && (
            <Alert
              sx={{ mt: 1 }}
              severity={status === 'error' ? 'error' : 'success'}
              role="status"
              aria-live="polite"
            >
              {status === 'sending'
                ? t('contactFormStatusSending')
                : status === 'success'
                  ? t('contactFormStatusSuccess')
                  : t('contactFormStatusError')}
            </Alert>
          )}
        </Stack>
      </Box>
    </Paper>
  );
}
