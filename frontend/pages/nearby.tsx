import { useEffect, useState } from 'react';
import { TextField, CircularProgress, Card, CardContent, Typography, Avatar } from '@mui/material';

export default function NearbyPage() {
  const [city, setCity] = useState('');
  const [manualCity, setManualCity] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!manualCity) {
      getCityFromBrowser();
    }
  }, []);

  useEffect(() => {
    const targetCity = manualCity || city;
    if (targetCity) fetchNearbyUsers(targetCity);
  }, [manualCity, city]);

  const getCityFromBrowser = () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        const data = await res.json();
        const detectedCity = data.address?.city || data.address?.town || data.address?.village || '';
        setCity(detectedCity);
      } catch (err) {
        setError('Failed to detect location');
      }
    }, () => setError('Permission denied for location'));
  };

  const fetchNearbyUsers = async (targetCity: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/whois/nearby?city=${targetCity}`);
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError('Could not load users');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Typography variant="h4" gutterBottom>Nearby Users</Typography>

      <div className="mb-4">
        <TextField
          label="Search City"
          value={manualCity}
          onChange={(e) => setManualCity(e.target.value)}
          fullWidth
        />
      </div>

      {loading && <CircularProgress />}
      {error && <Typography color="error">{error}</Typography>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {users.map((user: any) => (
          <Card key={user.id} className="shadow rounded-xl">
            <CardContent className="flex items-center gap-4">
              <Avatar src={user.user?.avatarUrl || ''} alt={user.user?.username || 'User'} />
              <div>
                <Typography variant="h6">{user.user?.username || 'Anonymous'}</Typography>
                <Typography variant="body2" color="textSecondary">{user.city}</Typography>
                {user.user?.socials?.instagram && (
                  <Typography variant="body2">Instagram: {user.user.socials.instagram}</Typography>
                )}
                {user.user?.socials?.whatsapp && (
                  <Typography variant="body2">WhatsApp: {user.user.socials.whatsapp}</Typography>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!loading && users.length === 0 && (
        <Typography variant="body2" className="mt-4 text-center">No nearby users found.</Typography>
      )}
    </div>
  );
}
