const io = require('socket.io-client');
const crypto = require('crypto');

function base64url(input) {
  return Buffer.from(input).toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signHS256(input, secret) {
  return crypto.createHmac('sha256', secret).update(input).digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

// Adjust these values if your server expects a different host/port
const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// Use a test user id (ObjectId-like string)
const testUserId = process.env.TEST_USER_ID || '000000000000000000000099';

const header = { alg: 'HS256', typ: 'JWT' };
const now = Math.floor(Date.now() / 1000);
const payload = { id: testUserId, iat: now, exp: now + 60 * 60 * 24 };

const encoded = base64url(JSON.stringify(header)) + '.' + base64url(JSON.stringify(payload));
const sig = signHS256(encoded, JWT_SECRET);
const token = encoded + '.' + sig;

console.log('Using token for user:', testUserId);
console.log('Connecting to', SOCKET_URL);

const socket = io(SOCKET_URL, { path: '/socket.io', transports: ['websocket'], auth: { token } });

socket.on('connect', () => {
  console.log('connected', socket.id);
  // join notifications room explicitly
  socket.emit('joinNotifications', { userId: testUserId });

  // emit whois:join with coords
  const coords = { lat: 37.7749, lng: -122.4194 };
  socket.emit('whois:join', { city: 'san francisco', coordinates: coords });
  console.log('emitted whois:join with coords', coords);
});

socket.on('connect_error', (err) => {
  console.error('connect_error', err && err.message ? err.message : err);
});

socket.on('userOnline', (payload) => {
  console.log('userOnline event received:', JSON.stringify(payload));
});

socket.on('userOffline', (payload) => {
  console.log('userOffline event received:', JSON.stringify(payload));
});

// keep process alive for a short while to observe events
setTimeout(() => {
  console.log('disconnecting and exiting');
  try { socket.emit('whois:leave', {}); } catch (e) {}
  socket.close();
  process.exit(0);
}, 8000);
