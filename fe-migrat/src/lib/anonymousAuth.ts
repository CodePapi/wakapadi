import { api } from './api'
import { safeStorage } from './storage'

const BROWSER_KEY = 'wakapadi_browser_id'
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
    // choose storage scope: 'session' uses sessionStorage (per-tab), otherwise localStorage (per-browser)
    const scope = (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_ANON_SCOPE) || 'browser'
    const useSession = scope === 'session'
    const storage: Storage | null = (typeof window !== 'undefined') ? (useSession ? window.sessionStorage : window.localStorage) : null

    const existingUser = storage ? storage.getItem('userId') : safeStorage.getItem('userId')
    const existingToken = storage ? storage.getItem('token') : safeStorage.getItem('token')
    if (existingUser && existingToken) {
      // already have a session
      // but still attempt to flush pending edits if any
      await flushPendingProfileEdits()
      return { userId: existingUser, token: existingToken }
    }
    let deviceId = storage ? storage.getItem(BROWSER_KEY) : safeStorage.getItem(BROWSER_KEY)
    if (!deviceId) {
      // prefer browser crypto.randomUUID when available
      const gen = (typeof crypto !== 'undefined' && (crypto as any).randomUUID) ? (crypto as any).randomUUID() : null
      deviceId = gen || `b-${Math.random().toString(36).slice(2, 12)}`
      try { if (storage) storage.setItem(BROWSER_KEY, deviceId as string); else safeStorage.setItem(BROWSER_KEY, deviceId as string) } catch {}
    }

    const res = await api.post('/auth/anonymous', { deviceId })
    const data = res?.data || res
    if (data?.token) {
      try { if (storage) storage.setItem('token', data.token); else safeStorage.setItem('token', data.token) } catch {}
    }
    if (data?.userId) {
      try { if (storage) storage.setItem('userId', data.userId); else safeStorage.setItem('userId', data.userId) } catch {}
    }
    if (data?.username) {
      try { if (storage) storage.setItem('username', data.username); else safeStorage.setItem('username', data.username) } catch {}
    }
    // mark auth provider for logout behaviour parity
    try { if (storage) storage.setItem('authProvider', data?.anonymous ? 'anonymous' : 'local'); else safeStorage.setItem('authProvider', data?.anonymous ? 'anonymous' : 'local') } catch {}

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

export function clearBrowserId() {
  try {
    // clear from both storages
    try { if (typeof window !== 'undefined') window.sessionStorage.removeItem(BROWSER_KEY) } catch {}
    try { if (typeof window !== 'undefined') window.localStorage.removeItem(BROWSER_KEY) } catch {}
    safeStorage.removeItem(BROWSER_KEY)
  } catch {}
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

export default { ensureAnonymousSession, clearBrowserId, savePendingProfileEdits }
