import React, { useState } from 'react'
import { ensureAnonymousSession } from '../lib/anonymousAuth'

export default function LoginModal({ onClose }: { onClose?: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e?: React.FormEvent) {
    if (e) e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await ensureAnonymousSession()
      // close modal and navigate home so header updates
      if (onClose) onClose()
      // use full reload so header (storage) picks up immediately in all contexts
      window.location.href = '/'
    } catch (err: any) {
      setError(err?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="absolute inset-0 bg-black/40" onClick={() => onClose && onClose()} />
      <form onSubmit={submit} className="bg-white rounded p-6 z-10 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Sign in</h3>
        {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
        <label className="block text-sm mb-2">Email
          <input className="mt-1 block w-full border px-2 py-1" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block text-sm mb-2">Password
          <input type="password" className="mt-1 block w-full border px-2 py-1" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button type="button" className="px-3 py-1" onClick={() => onClose && onClose()}>Cancel</button>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">{loading ? 'Signing in...' : 'Sign in'}</button>
        </div>
      </form>
    </div>
  )
}
