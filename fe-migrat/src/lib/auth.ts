import { api } from './api'
import { safeStorage } from './storage'

function normalizeAuthPayload(data: any) {
  // Support multiple backend shapes: { token, userId, username }
  // or { accessToken, user: { id, name } } or { jwt, user: { id, username } }
  const token = data?.token || data?.accessToken || data?.jwt || data?.access_token
  const userId = data?.userId || data?.user?.id || data?.user?.userId || data?.id
  const username = data?.username || data?.user?.username || data?.user?.name || data?.user?.displayName
  return { token, userId, username }
}

export async function login(creds: { email?: string; username?: string; password?: string }) {
  // Try the typical endpoint first
  try {
    const res = await api.post('/auth/login', creds, { cache: 'no-store' })
    const data = res?.data ?? res
    const { token, userId, username } = normalizeAuthPayload(data)
    if (!token) throw new Error('No token in response')
    try { safeStorage.setItem('token', token) } catch {}
    try { if (userId) safeStorage.setItem('userId', userId) } catch {}
    try { if (username) safeStorage.setItem('username', username) } catch {}
    try { safeStorage.setItem('authProvider', 'local') } catch {}
    return { token, userId, username }
  } catch (err: any) {
    // If the primary endpoint doesn't exist or returns a non-JSON shape, try common alternates
    if (err?.message?.includes('404') || err?.message?.includes('Not Found')) {
      // some backends expose /auth/local
      try {
        const alt = await api.post('/auth/local', creds, { cache: 'no-store' })
        const a = alt?.data ?? alt
        const { token, userId, username } = normalizeAuthPayload(a)
        if (!token) throw new Error('No token in alt response')
        try { safeStorage.setItem('token', token) } catch {}
        try { if (userId) safeStorage.setItem('userId', userId) } catch {}
        try { if (username) safeStorage.setItem('username', username) } catch {}
        try { safeStorage.setItem('authProvider', 'local') } catch {}
        return { token, userId, username }
      } catch (err2) {
        throw err2
      }
    }
    throw err
  }
}

export function logoutLocal() {
  try { safeStorage.removeItem('token') } catch {}
  try { safeStorage.removeItem('userId') } catch {}
  try { safeStorage.removeItem('username') } catch {}
  try { safeStorage.removeItem('authProvider') } catch {}
}

export default { login, logoutLocal }
