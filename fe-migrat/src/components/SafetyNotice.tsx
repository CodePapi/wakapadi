import { useEffect, useState } from 'react'

const DISMISS_KEY = 'wakapadi_safety_notice_dismissed'

export default function SafetyNotice() {
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    try { return !Boolean(localStorage.getItem(DISMISS_KEY)) } catch { return true }
  })

  useEffect(() => {
    // nothing
  }, [])

  if (!visible) return null

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, '1') } catch {}
    setVisible(false)
  }

  return (
    <div className="bg-red-50 border-l-4 border-red-400 p-3 text-sm text-red-800 max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <strong>Safety reminder:</strong> Meet only in open, public places and let someone you trust know your plans.
        </div>
        <button aria-label="Dismiss" onClick={dismiss} className="text-red-600">Dismiss</button>
      </div>
    </div>
  )
}
