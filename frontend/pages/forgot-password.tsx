// pages/forgot-password.tsx
import { Container } from '@mui/material';
import AuthForm from '../components/AuthForm';

export default function ForgotPasswordPage() {
  return (
    <Container sx={{ mt: 6 }}>
      <AuthForm mode="forgot" />
    </Container>
  );
}