// components/ContactForm.tsx
import { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  MenuItem,
  Typography,
  Alert,
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
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ maxWidth: 500, mx: 'auto', p: 3 }}
    >
      <Typography variant="h5" gutterBottom>
        {t('contactFormTitle')}
      </Typography>
      <TextField
        label={t('contactFormNameLabel')}
        name="name"
        fullWidth
        required
        margin="normal"
        value={form.name}
        onChange={handleChange}
      />
      <TextField
        label={t('contactFormEmailLabel')}
        name="email"
        fullWidth
        required
        margin="normal"
        value={form.email}
        onChange={handleChange}
      />
      <TextField
        select
        label={t('contactFormTypeLabel')}
        name="type"
        fullWidth
        margin="normal"
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
        rows={4}
        margin="normal"
        value={form.message}
        onChange={handleChange}
      />
      <Button variant="contained" type="submit" sx={{ mt: 2 }}>
        {t('contactFormSubmit')}
      </Button>
      {status !== 'idle' && (
        <Alert
          sx={{ mt: 2 }}
          severity={status === 'error' ? 'error' : 'success'}
        >
          {status === 'sending'
            ? t('contactFormStatusSending')
            : status === 'success'
              ? t('contactFormStatusSuccess')
              : t('contactFormStatusError')}
        </Alert>
      )}
    </Box>
  );
}
