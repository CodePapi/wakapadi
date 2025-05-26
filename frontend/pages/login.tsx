// pages/login.tsx
import { Container } from '@mui/material';
import AuthForm from '../components/AuthForm';

export default function LoginPage() {
  return (
    <Container sx={{ 
      mt: 8,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: '80vh'
    }}>
      <AuthForm mode="login" />
    </Container>
  );
}