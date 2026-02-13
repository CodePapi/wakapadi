export const safeStorage = {
  getItem(key: string) {
    if (typeof window === 'undefined') return null;
    const storage = window.localStorage;
    if (!storage || typeof storage.getItem !== 'function') return null;
    try {
      return storage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string) {
    if (typeof window === 'undefined') return;
    const storage = window.localStorage;
    if (!storage || typeof storage.setItem !== 'function') return;
    try {
      storage.setItem(key, value);
    } catch {
      // ignore
    }
  },
  removeItem(key: string) {
    if (typeof window === 'undefined') return;
    const storage = window.localStorage;
    if (!storage || typeof storage.removeItem !== 'function') return;
    try {
      storage.removeItem(key);
    } catch {
      // ignore
    }
  },
};
