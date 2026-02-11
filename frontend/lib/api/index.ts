// lib/api.ts
import axios from 'axios';
import { safeStorage } from '../storage';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_SOCKET_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = safeStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
export { api };
