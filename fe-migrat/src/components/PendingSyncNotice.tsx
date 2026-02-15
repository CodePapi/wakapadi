import { useEffect, useState } from 'react'
import { safeStorage } from '../lib/storage'

const PENDING_KEY = 'wakapadi_pending_profile_edits'

export default function PendingSyncNotice() {
  const [pending, setPending] = useState(false)

  useEffect(() => {
    const check = () => setPending(Boolean(safeStorage.getItem(PENDING_KEY)))
    check()
    const id = setInterval(check, 3000)
    return () => clearInterval(id)
  }, [])

  if (!pending) return null

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 text-sm text-yellow-800">Your profile changes were saved locally and will be synced when your session is available.</div>
  )
}
