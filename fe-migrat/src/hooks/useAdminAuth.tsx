import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'wakapadi_is_admin_v1'

export function useAdminAuth() {
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1'
    } catch (e) { return false }
  })

  useEffect(() => {
    try {
      const listener = () => setIsAdmin(localStorage.getItem(STORAGE_KEY) === '1')
      window.addEventListener('storage', listener)
      return () => window.removeEventListener('storage', listener)
    } catch {
      // ignore
    }
  }, [])

  const login = useCallback((email: string) => {
    try {
      const allowed = (import.meta.env.VITE_ADMIN_EMAIL || '').toString().trim().toLowerCase()
      if (!allowed) return false
      if (String(email).trim().toLowerCase() === allowed) {
        localStorage.setItem(STORAGE_KEY, '1')
        setIsAdmin(true)
        return true
      }
    } catch (e) {
      // ignore
    }
    return false
  }, [])

  const logout = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
    setIsAdmin(false)
  }, [])

  return { isAdmin, login, logout }
}

export default useAdminAuth
