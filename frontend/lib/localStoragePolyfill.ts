const shouldPolyfill = () => {
  if (typeof window !== 'undefined') return false;
  const existing = (globalThis as { localStorage?: unknown }).localStorage;
  if (!existing) return true;
  if (typeof existing !== 'object') return true;
  const storage = existing as { getItem?: unknown; setItem?: unknown; removeItem?: unknown };
  return (
    typeof storage.getItem !== 'function' ||
    typeof storage.setItem !== 'function' ||
    typeof storage.removeItem !== 'function'
  );
};

if (shouldPolyfill()) {
  const memoryStore = new Map<string, string>();
  const polyfill = {
    getItem(key: string) {
      return memoryStore.has(key) ? memoryStore.get(key)! : null;
    },
    setItem(key: string, value: string) {
      memoryStore.set(key, String(value));
    },
    removeItem(key: string) {
      memoryStore.delete(key);
    },
    clear() {
      memoryStore.clear();
    },
  };

  Object.defineProperty(globalThis, 'localStorage', {
    value: polyfill,
    configurable: true,
  });
}
