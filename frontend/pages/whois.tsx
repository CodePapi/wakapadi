import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  CircularProgress,
  Switch,
  List,
  ListItem,
  ListItemText,
  Divider,
  Skeleton,
  Chip,
} from '@mui/material';
import { api } from '../lib/api';
import { useRouter } from 'next/router';
import io from 'socket.io-client';

type NearbyUser = {
  _id: string;
  userId?: string;
  username?: string;
  city: string;
  coordinates?: { lat: number; lng: number };
  lastSeen: string;
  anonymous?: boolean;
  avatarUrl?: string;
  socials?: { instagram?: string };
};

export default function WhoisPage() {
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(true);
  const [city, setCity] = useState('');
  const [users, setUsers] = useState<NearbyUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Safe token check (SSR/SSG compatible)
  const isLoggedIn = typeof window !== 'undefined' && !!localStorage.getItem('token');

  // Memoized fetch to avoid redundant calls
  const fetchNearby = useCallback(async (targetCity: string) => {
    try {
      const res = await api.get('/whois/nearby', {
        params: { city: targetCity },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setUsers(res.data);
    } catch (err) {
      console.error('Fetch nearby failed:', err);
      setError('Failed to load nearby users. Retrying...');
      setTimeout(() => fetchNearby(targetCity), 5000); // Auto-retry
    }
  }, []);

  const pingPresence = useCallback(async (targetCity: string) => {
    try {
      await api.post('/whois/ping', { city: targetCity });
      await fetchNearby(targetCity);
    } catch (err) {
      console.error('Ping presence failed:', err);
      setError('Could not update your presence.');
    }
  }, [fetchNearby]);

  const togglePresence = async () => {
    try {
      if (visible) {
        await api.delete('/whois');
      } else {
        await pingPresence(city);
      }
      setVisible(!visible);
    } catch (err) {
      console.error('Toggle presence failed:', err);
    }
  };

  // WebSocket: Reconnect with fresh token
 // Replace your current useEffect for WebSocket with this:

useEffect(() => {
  if (!isLoggedIn) return;

  // Wait for token to be available
  const token = localStorage.getItem('token');
  if (!token) return;

  const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
    auth: { token },
    autoConnect: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('WebSocket connected');
  });

  socket.on('connect_error', (err) => {
    console.error('WebSocket connection error:', err.message);
    // Try to reconnect with fresh token if auth fails
    if (err.message.includes('auth')) {
      socket.auth = { token: localStorage.getItem('token') };
      socket.connect();
    }
  });

  socket.on('presence:update', (data: { userId: string; isOnline: boolean }) => {
    setUsers(prev => prev.map(user => 
      user.userId === data.userId 
        ? { ...user, lastSeen: new Date().toISOString() } 
        : user
    ));
  });

  return () => {
    socket.off('connect');
    socket.off('connect_error');
    socket.off('presence:update');
    socket.disconnect();
  };
}, [isLoggedIn]); // Only reconnect if login status changes

  // Geolocation + Initial Data Load
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const detectCityAndLoad = async () => {
      timeout = setTimeout(() => {
        setError('Geolocation timed out. Using default city.');
        setCity('berlin'); // Fallback
        setLoading(false);
      }, 10000);

      try {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            clearTimeout(timeout);
            try {
              const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`
              );
              const geocode = await res.json();
              const detectedCity = (
                geocode.address.city || 
                geocode.address.town || 
                'berlin'
              ).trim().toLowerCase();

              setCity(detectedCity);
              if (isLoggedIn) await pingPresence(detectedCity);
              await fetchNearby(detectedCity);
            } catch (geoErr) {
              setError('Could not detect city. Using default.');
              setCity('berlin');
            } finally {
              setLoading(false);
            }
          },
          (geoErr) => {
            clearTimeout(timeout);
            setError('Geolocation blocked. Using default city.');
            setCity('berlin');
            setLoading(false);
          }
        );
      } catch (err) {
        clearTimeout(timeout);
        setError('Unexpected error. Using default city.');
        setCity('berlin');
        setLoading(false);
      }
    };

    detectCityAndLoad();
    return () => clearTimeout(timeout);
  }, [isLoggedIn, pingPresence, fetchNearby]);

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" mb={2}>
        #whois Nearby
      </Typography>

      {error && (
        <Chip 
          label={error} 
          color="error" 
          onDelete={() => setError(null)} 
          sx={{ mb: 2 }} 
        />
      )}

      {isLoggedIn ? (
        <Box display="flex" alignItems="center" mb={2}>
          <Typography mr={2}>Visible to others:</Typography>
          <Switch 
            checked={visible} 
            onChange={togglePresence} 
            disabled={loading || !city}
          />
        </Box>
      ) : (
        <Box mb={3}>
          <Typography variant="body1" mb={1}>
            Want to be seen or connect with people nearby?
          </Typography>
          <Button variant="contained" onClick={() => router.push('/login')}>
            Login to Connect
          </Button>
        </Box>
      )}

      {loading ? (
        <Box>
          <Skeleton height={80} />
          <Skeleton height={80} />
          <Skeleton height={80} />
        </Box>
      ) : users.length === 0 ? (
        <Typography variant="body1" color="textSecondary">
          No users found in {city}. Be the first to ping!
        </Typography>
      ) : (
        <List>
          {users.map((user) => (
            <Box key={user._id}>
              <ListItem
                secondaryAction={
                  isLoggedIn && !user.anonymous && user.userId && (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => router.push(`/chat/${user.userId}`)}
                      disabled={!user.userId}
                    >
                      💬 Chat
                    </Button>
                  )
                }
              >
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center">
                      {user.anonymous ? '👤 Anonymous' : `👤 ${user.username}`}
                      <Box
                        ml={1}
                        width={8}
                        height={8}
                        bgcolor="green"
                        borderRadius="50%"
                      />
                      {user.socials?.instagram && (
                        <Chip 
                          label={`IG: ${user.socials.instagram}`} 
                          size="small" 
                          sx={{ ml: 1 }} 
                        />
                      )}
                    </Box>
                  }
                  secondary={`${user.city} • Last seen: ${
                    user.lastSeen
                      ? new Date(user.lastSeen).toLocaleTimeString()
                      : 'Unknown'
                  }`}
                />
              </ListItem>
              <Divider />
            </Box>
          ))}
        </List>
      )}
    </Container>
  );
}