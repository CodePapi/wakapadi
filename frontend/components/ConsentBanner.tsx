import { useEffect, useState } from 'react';
import { Box, Typography, Button, Snackbar, Link } from '@mui/material';
import { safeStorage } from '../lib/storage';

export default function ConsentBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const consent = safeStorage.getItem('wakapadi-consent');
    if (!consent) setOpen(true);
  }, []);

  const handleAccept = () => {
    safeStorage.setItem('wakapadi-consent', 'accepted');
    setOpen(false);
  };

  return (
    <Snackbar
      open={open}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{ mb: 2 }}
    >
      <Box
        sx={{
          bgcolor: 'white',
          boxShadow: 2,
          borderRadius: 1,
          p: 2,
          maxWidth: 500,
          width: '100%',
        }}
      >
        <Typography variant="body2" mb={1}>
          By using Wakapadi, you agree to our{' '}
          <Link href="/privacy" target="_blank" underline="hover">Privacy Policy</Link>,{' '}
          <Link href="/terms" target="_blank" underline="hover">Terms of Use</Link>, and use of{' '}
          <Link href="/cookies" target="_blank" underline="hover">Cookies</Link>.
        </Typography>
        <Button variant="contained" size="small" onClick={handleAccept}>
          Accept & Continue
        </Button>
      </Box>
    </Snackbar>
  );
}
