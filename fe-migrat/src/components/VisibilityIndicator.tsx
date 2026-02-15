import { useEffect, useState } from 'react'
import { safeStorage } from '../lib/storage'

const STORAGE_KEY = 'wakapadi_visibility'

export default function VisibilityIndicator() {
  const [visible, setVisible] = useState<boolean>(() => {
    try {
      const raw = safeStorage.getItem(STORAGE_KEY)
      return raw === null ? true : raw === '1'
    } catch {
      return true
    }
  })

  useEffect(() => {
    const handler = () => {
      try {
        const raw = safeStorage.getItem(STORAGE_KEY)
        setVisible(raw === null ? true : raw === '1')
      } catch {
        setVisible(true)
      }
    }
    window.addEventListener('wakapadi:visibility-changed', handler)
    return () => window.removeEventListener('wakapadi:visibility-changed', handler)
  }, [])

  return (
    <div title={visible ? 'Visible to nearby travelers' : 'Hidden (anonymous)'} className="flex items-center gap-2">
      <span className={`inline-block w-2 h-2 rounded-full ${visible ? 'bg-green-500' : 'bg-gray-400'}`} />
      <span className="sr-only">{visible ? 'Visible' : 'Hidden'}</span>
    </div>
  )
}
