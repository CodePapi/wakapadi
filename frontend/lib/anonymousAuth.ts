import { api } from './api/index';
import { safeStorage } from './storage';

const DEVICE_ID_KEY = 'wakapadi-device-id';

const generateDeviceId = () => {
  const globalCrypto =
    typeof globalThis !== 'undefined' ? (globalThis as unknown as { crypto?: Crypto }).crypto : undefined;

  if (globalCrypto && 'randomUUID' in globalCrypto && typeof globalCrypto.randomUUID === 'function') {
    try {
      return globalCrypto.randomUUID();
    } catch {
      // fall through to manual generation
    }
  }

  const array = new Uint8Array(16);
  if (globalCrypto && typeof globalCrypto.getRandomValues === 'function') {
    globalCrypto.getRandomValues(array);
  } else {
    for (let i = 0; i < array.length; i += 1) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }

  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
};

export const getDeviceId = () => {
  let deviceId = safeStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = generateDeviceId();
    safeStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
};

export const clearDeviceId = () => {
  safeStorage.removeItem(DEVICE_ID_KEY);
};

export const ensureAnonymousSession = async () => {
  const token = safeStorage.getItem('token');
  const userId = safeStorage.getItem('userId');
  if (token && userId) return { token, userId };

  const deviceId = getDeviceId();
  const res = await api.post('/auth/anonymous', { deviceId });

  safeStorage.setItem('token', res.data.token);
  safeStorage.setItem('userId', res.data.userId);
  if (res.data.username) {
    safeStorage.setItem('username', res.data.username);
  }
  return res.data;
};
