import { api } from './api'
import { safeStorage } from './storage'

const DEVICE_KEY = 'wakapadi_device_id'
const PENDING_PROFILE_KEY = 'wakapadi_pending_profile_edits'
const LOGOUT_BLOCK_KEY = 'wakapadi_logout_block'
export function setLogoutBlock() {
  try { localStorage.setItem(LOGOUT_BLOCK_KEY, '1') } catch {}
}
export function clearLogoutBlock() {
  try { localStorage.removeItem(LOGOUT_BLOCK_KEY) } catch {}
}
export function isLogoutBlocked() {
  try { return Boolean(localStorage.getItem(LOGOUT_BLOCK_KEY)) } catch { return false }
}
export async function ensureAnonymousSession() {
  try {
    // respect explicit logout block: do not auto-create sessions after user logged out
    if (isLogoutBlocked()) return null
    // proceed normally: create/restore session using device id
    const existingUser = safeStorage.getItem('userId')
    const existingToken = safeStorage.getItem('token')
    if (existingUser && existingToken) {
      // already have a session
      // but still attempt to flush pending edits if any
      await flushPendingProfileEdits()
      return { userId: existingUser, token: existingToken }
    }

    let deviceId = safeStorage.getItem(DEVICE_KEY)
    if (!deviceId) {
      // prefer browser crypto.randomUUID when available
      const gen = (typeof crypto !== 'undefined' && (crypto as any).randomUUID) ? (crypto as any).randomUUID() : null
      deviceId = gen || `d-${Math.random().toString(36).slice(2, 12)}`
      try { safeStorage.setItem(DEVICE_KEY, deviceId as string) } catch {}
    }

    const res = await api.post('/auth/anonymous', { deviceId })
    const data = res?.data || res
    if (data?.token) {
      try { safeStorage.setItem('token', data.token) } catch {}
    }
    if (data?.userId) {
      try { safeStorage.setItem('userId', data.userId) } catch {}
    }
    if (data?.username) {
      try { safeStorage.setItem('username', data.username) } catch {}
    }
    // mark auth provider for logout behaviour parity
    try { safeStorage.setItem('authProvider', data?.anonymous ? 'anonymous' : 'local') } catch {}

    await flushPendingProfileEdits()

    // ensure periodic retry of flushes in background
    ensureFlushInterval()

    return { userId: data?.userId, token: data?.token }
  } catch (err) {
    // non-fatal: do not throw — callers should continue in anonymous-browser mode
    console.warn('ensureAnonymousSession failed', err)
    return null
  }
}

export function clearDeviceId() {
  try { safeStorage.removeItem(DEVICE_KEY) } catch {}
}


let _flushInterval: any = null
function ensureFlushInterval() {
  if (_flushInterval) return
  _flushInterval = setInterval(() => {
    // attempt to flush pending edits periodically
    flushPendingProfileEdits().catch(() => {})
  }, 30 * 1000)
}

export function savePendingProfileEdits(edits: any) {
  try { safeStorage.setItem(PENDING_PROFILE_KEY, JSON.stringify(edits)) } catch {}
  // ensure background flush attempts are scheduled
  ensureFlushInterval()
}

async function flushPendingProfileEdits() {
  try {
    const raw = safeStorage.getItem(PENDING_PROFILE_KEY)
    if (!raw) return
    const pending = JSON.parse(raw)
    // If we have a token, attempt to apply
    const token = safeStorage.getItem('token')
    if (!token) return
    await api.patch('/auth/profile', pending)
    safeStorage.removeItem(PENDING_PROFILE_KEY)
  } catch (err) {
    // ignore — will retry later
    console.warn('flushPendingProfileEdits failed', err)
  }
}

export default { ensureAnonymousSession, clearDeviceId, savePendingProfileEdits }
