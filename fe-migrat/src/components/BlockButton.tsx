import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useTranslation } from '../lib/i18n'

type Props = {
  userId: string
  onChange?: (status: { blockedByMe: boolean; blockedByThem: boolean; anyReported: boolean }) => void
}

export default function BlockButton({ userId, onChange }: Props) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ blockedByMe: boolean; blockedByThem: boolean; anyReported: boolean } | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [reason, setReason] = useState('')

  const fetchStatus = async () => {
    try {
      const res: any = await api.get(`/users/block/status/${encodeURIComponent(String(userId))}`)
      const payload = res.data ?? res
      setStatus(payload)
      onChange?.(payload)
      try { window.dispatchEvent(new CustomEvent('wakapadi:block:changed', { detail: { userId: String(userId), status: payload } })) } catch (e) {}
    } catch (e) {
      // ignore
    }
  }

  useEffect(() => { if (userId) fetchStatus() }, [userId])

  const doBlock = async () => {
    setLoading(true)
    try {
      await api.post(`/users/block/${encodeURIComponent(String(userId))}`)
      try { window.dispatchEvent(new CustomEvent('wakapadi:toast', { detail: { text: t('userBlocked') || 'User blocked' } })) } catch {}
      await fetchStatus()
    } catch (e) {
      try { window.dispatchEvent(new CustomEvent('wakapadi:toast', { detail: { text: t('actionFailed') || 'Action failed' } })) } catch {}
    } finally { setLoading(false); setShowConfirm(false) }
  }

  const doUnblock = async () => {
    setLoading(true)
    try {
      await api.del(`/users/block/${encodeURIComponent(String(userId))}`)
      try { window.dispatchEvent(new CustomEvent('wakapadi:toast', { detail: { text: t('userUnblocked') || 'User unblocked' } })) } catch {}
      await fetchStatus()
    } catch (e) {
      try { window.dispatchEvent(new CustomEvent('wakapadi:toast', { detail: { text: t('actionFailed') || 'Action failed' } })) } catch {}
    } finally { setLoading(false) }
  }

  const doReport = async () => {
    setLoading(true)
    try {
      await api.post(`/users/report/${encodeURIComponent(String(userId))}`, { reason })
      try { window.dispatchEvent(new CustomEvent('wakapadi:toast', { detail: { text: t('reportSubmitted') || 'Report submitted' } })) } catch {}
      setShowReport(false)
      setReason('')
      await fetchStatus()
    } catch (e) {
      try { window.dispatchEvent(new CustomEvent('wakapadi:toast', { detail: { text: t('actionFailed') || 'Action failed' } })) } catch {}
    } finally { setLoading(false) }
  }

  return (
    <div className="flex items-center gap-2">
      {status && status.blockedByMe ? (
        <button onClick={doUnblock} disabled={loading} className="px-4 py-2 border rounded text-sm">{t('unblockUser') || 'Unblock'}</button>
      ) : (
        <>
          <button onClick={() => setShowConfirm(true)} disabled={loading} className="px-4 py-2 border rounded text-sm bg-white hover:bg-gray-50">{t('blockUser') || 'Block'}</button>
        </>
      )}

      <button onClick={() => setShowReport(true)} disabled={loading} className="px-4 py-2 bg-red-50 text-red-600 rounded text-sm hover:bg-red-100">{t('reportUser') || 'Report'}</button>

      {showConfirm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-30" onClick={() => setShowConfirm(false)} />
          <div className="bg-white dark:bg-gray-900 rounded p-4 z-50 max-w-sm w-full">
            <div className="text-lg font-semibold">{t('confirmBlock') || 'Block this user?'}</div>
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setShowConfirm(false)} className="px-3 py-1 border rounded">{t('cancel') || 'Cancel'}</button>
              <button onClick={doBlock} disabled={loading} className="px-3 py-1 bg-red-600 text-white rounded">{t('blockUser') || 'Block'}</button>
            </div>
          </div>
        </div>
      )}

      {showReport && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-30" onClick={() => setShowReport(false)} />
          <div className="bg-white dark:bg-gray-900 rounded p-4 z-50 max-w-lg w-full">
            <div className="text-lg font-semibold">{t('reportUser') || 'Report user'}</div>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="w-full mt-2 p-2 border rounded h-28" placeholder={t('reportReasonPrompt') || 'Reason (optional)'} />
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setShowReport(false)} className="px-3 py-1 border rounded">{t('cancel') || 'Cancel'}</button>
              <button onClick={doReport} disabled={loading} className="px-3 py-1 bg-red-600 text-white rounded">{t('reportUser') || 'Report'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
