import { useEffect, useState } from 'react';
import { Container, Typography, CircularProgress, Button } from '@mui/material';
import { api } from '../lib/api';
import { useRouter } from 'next/router';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // Verify token exists before making the request
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) {
          throw new Error('No authentication token found');
        }

        const res = await api.get('/auth/me');
        setUser(res.data);
      } catch (err: any) {
        console.error('Error fetching profile', err);
        setError(err.response?.data?.message || err.message || 'Failed to load profile');
        
        // Redirect to login if unauthorized
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" mb={2}>My Profile</Typography>
      {loading ? (
        <CircularProgress />
      ) : error ? (
        <>
          <Typography color="error">{error}</Typography>
          <Button 
            variant="contained" 
            onClick={() => router.push('/login')}
            sx={{ mt: 2 }}
          >
            Go to Login
          </Button>
        </>
      ) : user ? (
        <>
          <Typography variant="h6">Username: {user.username}</Typography>
          <Typography variant="body1">User ID: {user._id}</Typography>
          <Button 
            variant="outlined" 
            onClick={handleLogout}
            sx={{ mt: 2 }}
          >
            Logout
          </Button>
        </>
      ) : (
        <Typography color="error">Failed to load user info.</Typography>
      )}
    </Container>
  );
}