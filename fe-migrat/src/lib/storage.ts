export const safeStorage = {
  getItem(key: string) {
    if (typeof window === 'undefined') return null;
    try {
      const scope = (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_ANON_SCOPE) || 'browser'
      const storage = scope === 'session' ? window.sessionStorage : window.localStorage
      if (!storage || typeof storage.getItem !== 'function') return null
      return storage.getItem(key)
    } catch {
      return null
    }
  },
  setItem(key: string, value: string) {
    if (typeof window === 'undefined') return;
    try {
      const scope = (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_ANON_SCOPE) || 'browser'
      const storage = scope === 'session' ? window.sessionStorage : window.localStorage
      if (!storage || typeof storage.setItem !== 'function') return
      storage.setItem(key, value)
    } catch {
      // ignore
    }
  },
  removeItem(key: string) {
    if (typeof window === 'undefined') return;
    try {
      const scope = (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_ANON_SCOPE) || 'browser'
      const storage = scope === 'session' ? window.sessionStorage : window.localStorage
      if (!storage || typeof storage.removeItem !== 'function') return
      storage.removeItem(key)
    } catch {
      // ignore
    }
  },
};
