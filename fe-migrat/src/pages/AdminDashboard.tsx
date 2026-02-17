import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import useAdminAuth from '../hooks/useAdminAuth'
import { useTranslation } from '../lib/i18n'
import { api } from '../lib/api'
import { safeStorage } from '../lib/storage'


function getUtcDayString(offsetDays = 0) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - offsetDays)
  return d.toISOString().slice(0, 10)
}

export default function AdminDashboard() {
  const { isAdmin, logout } = useAdminAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()

  useEffect(() => {
    if (!isAdmin) navigate('/admin/login')
  }, [isAdmin, navigate])

  if (!isAdmin) return null
  const [cityInput, setCityInput] = useState('')
  const [scrapeStatus, setScrapeStatus] = useState<string | null>(null)
  const [schedulerStatus, setSchedulerStatus] = useState<{ running: boolean; enabled: boolean; cron?: string } | null>(null)
  const [cronInput, setCronInput] = useState<string>('')
  const [toursCount, setToursCount] = useState<number | null>(null)
  const [whoisSummary, setWhoisSummary] = useState<{ city: string; count: number }[] | null>(null)
  const [citiesCount, setCitiesCount] = useState<number | null>(null)
  const [whoisUsers, setWhoisUsers] = useState<any[] | null>(null)
  const [contactMessages, setContactMessages] = useState<any[] | null>(null)
  const [addCitiesInput, setAddCitiesInput] = useState<string>('')
  const [addCitiesStatus, setAddCitiesStatus] = useState<string | null>(null)
  const [reports, setReports] = useState<any[] | null>(null)
  const [notesMap, setNotesMap] = useState<Record<string, string>>({})
  const [dailyVisits, setDailyVisits] = useState<Array<{ day: string; uniqueVisitors: number }>>([])
  const [apiToken, setApiToken] = useState<string>(() => safeStorage.getItem('token') || '')
  const [logs, setLogs] = useState<Array<{ ts: string; msg: string }>>([])
  const [pollingLogs, setPollingLogs] = useState(false)
  const [lastApiError, setLastApiError] = useState<string | null>(null)
  const pollRef = useRef<number | null>(null)
  const logsBoxRef = useRef<HTMLDivElement | null>(null)

  const saveToken = () => {
    try {
      if (apiToken) safeStorage.setItem('token', apiToken)
      else safeStorage.removeItem('token')
      window.location.reload()
    } catch (e) {}
  }

  const clearToken = () => {
    try { safeStorage.removeItem('token'); setApiToken('') } catch (e) {}
  }

  const triggerScrapeCity = async () => {
    setScrapeStatus('Running...')
    try {
      // start polling logs while the scrape runs
      startPollingLogs()
      const res: any = await api.post('/scraper/run', { city: cityInput || undefined })
      setScrapeStatus(res?.data?.message || 'Scrape triggered')
    } catch (e: any) {
      console.error('triggerScrapeCity error', e)
      let msg = e?.message || String(e)
      // try to extract JSON payload when api throws like: "API 500 {..json..}"
      try {
        const trimmed = msg.replace(/^API \d+ /, '')
        const parsed = JSON.parse(trimmed)
        msg = parsed?.detail || parsed?.message || msg
      } catch (_) {}
      setScrapeStatus('Error: ' + msg)
    }
    finally { stopPollingLogs() }
  }

  const triggerScrapeAll = async () => {
    setScrapeStatus('Running full scrape...')
    try {
      startPollingLogs()
      const res: any = await api.post('/scraper/run')
      setScrapeStatus(res?.data?.message || 'Scrape triggered')
    } catch (e: any) {
      console.error('triggerScrapeAll error', e)
      let msg = e?.message || String(e)
      try {
        const trimmed = msg.replace(/^API \d+ /, '')
        const parsed = JSON.parse(trimmed)
        msg = parsed?.detail || parsed?.message || msg
      } catch (_) {}
      setScrapeStatus('Error: ' + msg)
    }
    finally { stopPollingLogs() }
  }

  const fetchLogs = async () => {
    try {
      const res: any = await api.get('/scraper/logs', { cache: 'no-store' })
      const arr = Array.isArray(res?.data) ? res.data : []
      setLogs(arr)
      // auto-scroll
      try { if (logsBoxRef.current) { logsBoxRef.current.scrollTop = logsBoxRef.current.scrollHeight } } catch (e) {}
    } catch (e) {
      // ignore
    }
  }

  const startPollingLogs = () => {
    if (pollRef.current) return
    setPollingLogs(true)
    fetchLogs()
    pollRef.current = window.setInterval(fetchLogs, 1000) as unknown as number
  }

  const stopPollingLogs = () => {
    setPollingLogs(false)
    try { if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null } } catch (e) {}
  }

  const fetchSchedulerStatus = async () => {
    try {
      const res: any = await api.get('/scraper/status', { cache: 'no-store' })
      const body = res?.data || res
      setSchedulerStatus(body)
      setCronInput(body?.cron || '')
    } catch (e) {
      setSchedulerStatus(null)
    }
  }

  const pauseScheduler = async () => {
    try {
      await api.post('/scraper/pause')
      fetchSchedulerStatus()
    } catch (e) {}
  }

  const resumeScheduler = async () => {
    try {
      await api.post('/scraper/resume', { cron: cronInput || undefined })
      fetchSchedulerStatus()
    } catch (e) {}
  }

  const updateSchedule = async () => {
    try {
      if (!cronInput) return
      await api.post('/scraper/schedule', { cron: cronInput })
      fetchSchedulerStatus()
    } catch (e) {}
  }

  const addCities = async () => {
    try {
      const list = (addCitiesInput || '').split(',').map(s => s.trim()).filter(Boolean)
      if (list.length === 0) {
        setAddCitiesStatus('No cities to add')
        return
      }
      const res: any = await api.post('/cities/add', { cities: list })
      const added = res?.data?.added || res?.added || []
      setAddCitiesStatus(added.length ? `Added: ${added.join(', ')}` : 'No new cities added')
      setAddCitiesInput('')
      // refresh counts
      fetchCitiesWhois()
    } catch (e: any) {
      setAddCitiesStatus('Error: ' + (e?.message || String(e)))
    }
  }

  const fetchToursCount = async () => {
    try {
      const res: any = await api.get('/tours', { cache: 'no-store' })
      const list = Array.isArray(res?.data) ? res.data : []
      setToursCount(list.length)
    } catch (e) { setToursCount(null) }
  }

  const fetchCitiesWhois = async () => {
    try {
      const cRes: any = await api.get('/cities/all', { cache: 'no-store' })
      const cities: string[] = Array.isArray(cRes?.data) ? cRes.data : []
      setCitiesCount(cities.length)
      const summary: { city: string; count: number }[] = []
      for (const c of cities) {
        try {
          const w: any = await api.get(`/whois/nearby?city=${encodeURIComponent(c)}`, { cache: 'no-store' })
          const arr = Array.isArray(w?.data) ? w.data : []
          summary.push({ city: c, count: arr.length })
        } catch (e) {
          summary.push({ city: c, count: 0 })
        }
      }
      setWhoisSummary(summary)
      // fetch a sample of global whois users for admin actions
      try {
        const wRes: any = await api.get('/whois/nearby?city=&page=1&limit=100', { cache: 'no-store' })
        setWhoisUsers(Array.isArray(wRes?.data) ? wRes.data : [])
      } catch (e) {
        setWhoisUsers([])
      }
    } catch (e) {
      setWhoisSummary(null)
    }
  }

  const fetchWhoisUsers = async () => {
    try {
      const res: any = await api.get('/whois/nearby?city=&page=1&limit=100', { cache: 'no-store' })
      setWhoisUsers(Array.isArray(res?.data) ? res.data : [])
    } catch (e: any) {
      setWhoisUsers([])
      try { setLastApiError(e?.message || String(e)) } catch (_) {}
    }
  }


  const fetchContactMessages = async () => {
    try {
      const res: any = await api.get('/contact?page=1&limit=200', { cache: 'no-store' })
      setContactMessages(Array.isArray(res?.data?.items) ? res.data.items : (Array.isArray(res?.data) ? res.data : []))
    } catch (e: any) {
      setContactMessages([{ error: e?.message || String(e) }])
    }
  }

  const markAttend = async (id: string, noteParam?: string) => {
    try {
      const note = noteParam ?? notesMap[id]
      await api.post(`/contact/${encodeURIComponent(id)}/attend`, { attendedBy: safeStorage.getItem('token') || undefined, note })
      // clear note in UI after marking attended
      setNotesMap((s) => ({ ...s, [id]: '' }))
      fetchContactMessages()
    } catch (e) {}
  }

  const markUnattend = async (id: string) => {
    try {
      await api.post(`/contact/${encodeURIComponent(id)}/unattend`)
      fetchContactMessages()
    } catch (e) {}
  }

  const fetchReports = async () => {
    try {
      const res: any = await api.get('/users/reports', { cache: 'no-store' })
      setReports(Array.isArray(res?.data) ? res.data : [])
    } catch (e: any) {
      setReports([{ error: e?.message || String(e) }])
    }
  }

  const blockUser = async (userId: string) => {
    try {
      await api.post(`/users/block/${encodeURIComponent(userId)}`)
      fetchReports()
    } catch (e: any) { try { setLastApiError(e?.message || String(e)) } catch (_) {} }
  }

  const deleteUser = async (userId: string) => {
    try {
      await api.del(`/users/${encodeURIComponent(userId)}`)
      fetchReports()
    } catch (e: any) { try { setLastApiError(e?.message || String(e)) } catch (_) {} }
  }

  const fetchDailyVisitsRange = async (days = 7) => {
    const arr: Array<{ day: string; uniqueVisitors: number }> = []
    for (let i = 0; i < days; i++) {
      const day = getUtcDayString(i)
      try {
        const res: any = await api.get(`/auth/visits/daily?day=${day}`, { cache: 'no-store' })
        arr.push(res?.data || res)
      } catch (e) {
        arr.push({ day, uniqueVisitors: 0 })
      }
    }
    setDailyVisits(arr)
  }

  useEffect(() => {
    // initial stats fetch
    fetchToursCount()
    fetchCitiesWhois()
    fetchWhoisUsers()
    fetchDailyVisitsRange(7)
    fetchSchedulerStatus()
  }, [])

  return (
    <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{'Admin Dashboard'}</h1>
          <div className="flex items-center gap-3">
            <input placeholder="API token (optional)" value={apiToken} onChange={(e) => setApiToken(e.target.value)} className="px-3 py-2 border border-gray-300 rounded bg-white dark:bg-gray-700 text-sm" />
            <button onClick={saveToken} className="px-3 py-2 rounded bg-blue-600 text-white">Save token</button>
            <button onClick={clearToken} className="px-3 py-2 rounded bg-gray-300 text-sm">Clear token</button>
            <button onClick={() => { logout(); navigate('/') }} className="px-3 py-2 rounded bg-gray-200 dark:bg-gray-700">{t('logout') || 'Sign out'}</button>
          </div>
          {lastApiError ? (
            <div className="mt-2 p-2 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-200 rounded text-sm flex items-center justify-between">
              <div className="truncate mr-3">{lastApiError}</div>
              <div className="flex-shrink-0">
                <button onClick={() => setLastApiError(null)} className="px-2 py-1 bg-red-600 text-white rounded text-xs">Clear</button>
              </div>
            </div>
          ) : null}
        </div>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded shadow">
            <h3 className="font-semibold mb-2">Scraper</h3>
            <p className="text-sm text-gray-600 mb-3">Trigger scraping jobs. Server-scheduled scraping runs daily at 02:00 (server timezone).</p>
            <div className="flex gap-2 mb-3">
              <input value={cityInput} onChange={(e) => setCityInput(e.target.value)} placeholder="City name (e.g. Lisbon)" className="flex-1 px-3 py-2 border border-gray-300 rounded bg-white dark:bg-gray-700" />
              <button onClick={triggerScrapeCity} className="px-3 py-2 bg-blue-600 text-white rounded">Scrape city</button>
            </div>
            <div className="flex gap-2">
              <button onClick={triggerScrapeAll} className="px-3 py-2 bg-indigo-600 text-white rounded">Scrape all cities now</button>
                <div className="text-sm text-gray-600 self-center">{scrapeStatus}</div>
              </div>

              <div className="mt-4 border-t pt-3">
                <div className="text-sm text-gray-600 mb-2">Auto-scraper status</div>
                <div className="flex gap-2 items-center mb-2">
                  <div className="text-xs text-gray-500">Running:</div>
                  <div className="font-medium">{schedulerStatus ? String(schedulerStatus.running) : '—'}</div>
                  <div className="text-xs text-gray-500">Enabled:</div>
                  <div className="font-medium">{schedulerStatus ? String(schedulerStatus.enabled) : '—'}</div>
                </div>
                <div className="flex gap-2 items-center mb-2">
                  <input placeholder="Cron expression" value={cronInput} onChange={(e) => setCronInput(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded bg-white dark:bg-gray-700 text-sm" />
                  <button onClick={updateSchedule} className="px-3 py-2 bg-yellow-600 text-white rounded text-sm">Update</button>
                </div>
                <div className="flex gap-2">
                  <button onClick={fetchSchedulerStatus} className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded text-sm">Refresh status</button>
                  <button onClick={pauseScheduler} className="px-3 py-2 bg-red-600 text-white rounded text-sm">Pause</button>
                  <button onClick={resumeScheduler} className="px-3 py-2 bg-green-600 text-white rounded text-sm">Resume</button>
                </div>
                <div className="mt-4 border-t pt-3">
                  <div className="text-sm text-gray-600 mb-2">Add cities (comma separated)</div>
                  <div className="flex gap-2 items-center mb-2">
                    <input placeholder="e.g. Halle (Saale), Lisbon, Porto" value={addCitiesInput} onChange={(e) => setAddCitiesInput(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded bg-white dark:bg-gray-700 text-sm" />
                    <button onClick={addCities} className="px-3 py-2 bg-blue-600 text-white rounded text-sm">Add</button>
                  </div>
                  {addCitiesStatus ? <div className="text-sm text-gray-600">{addCitiesStatus}</div> : null}
                </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded shadow">
            <h3 className="font-semibold mb-2">Stats</h3>
            <p className="text-sm text-gray-600 mb-3">Quick metrics from the API.</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                <div className="text-xs text-gray-500">Total tours</div>
                <div className="text-lg font-bold">{toursCount ?? '—'}</div>
                <button onClick={fetchToursCount} className="mt-2 text-sm text-blue-600">Refresh</button>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                <div className="text-xs text-gray-500">Whois users (all cities)</div>
                <div className="text-lg font-bold">{whoisSummary ? whoisSummary.reduce((s, x) => s + x.count, 0) : '—'}</div>
                <button onClick={fetchCitiesWhois} className="mt-2 text-sm text-blue-600">Refresh</button>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                <div className="text-xs text-gray-500">Total cities</div>
                <div className="text-lg font-bold">{citiesCount ?? '—'}</div>
                <button onClick={fetchCitiesWhois} className="mt-2 text-sm text-blue-600">Refresh</button>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded shadow">
            <h3 className="font-semibold mb-2">Contact messages</h3>
            <p className="text-sm text-gray-600 mb-3">List of messages submitted via the contact form. Requires an API token if the endpoint is protected.</p>
            <div className="mb-3">
              <button onClick={fetchContactMessages} className="px-3 py-2 bg-blue-600 text-white rounded">Fetch messages</button>
            </div>
            <div className="space-y-3 max-h-64 overflow-auto">
              {contactMessages?.map((m, i) => (
                <div key={m._id || i} className="p-3 border rounded">
                  {m.error ? <div className="text-sm text-red-600">{m.error}</div> : (
                    <>
                      <div className="flex justify-between">
                        <div className="font-semibold">{m.name || m.email || 'Message'}</div>
                        <div className="text-xs text-gray-500">{m.createdAt ? new Date(m.createdAt).toISOString().slice(0,10) : ''}</div>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">{m.message || JSON.stringify(m)}</div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-gray-500">Attended:</div>
                        <div className="font-medium">{m.attended ? 'Yes' : 'No'}</div>
                        {m.attended && m.attendedAt ? <div className="text-xs text-gray-500">({new Date(m.attendedAt).toISOString().slice(0,10)})</div> : null}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <input placeholder="Short note" className="flex-1 px-2 py-1 border rounded bg-white dark:bg-gray-700 text-sm" value={notesMap[m._id] || ''} onChange={(e) => setNotesMap((s) => ({ ...s, [m._id]: e.target.value }))} />
                        <button onClick={() => markAttend(m._id)} className="px-2 py-1 bg-green-600 text-white rounded text-sm">Mark attended</button>
                        <button onClick={() => markUnattend(m._id)} className="px-2 py-1 bg-gray-300 text-sm rounded">Mark unattended</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          <aside className="bg-white dark:bg-gray-800 p-6 rounded shadow">
            <h3 className="font-semibold mb-2">Daily visits</h3>
            <div className="space-y-2">
              {dailyVisits.map((d) => (
                <div key={d.day} className="flex justify-between text-sm">
                  <div>{d.day}</div>
                  <div className="font-medium">{d.uniqueVisitors}</div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <button onClick={() => fetchDailyVisitsRange(7)} className="px-3 py-2 bg-blue-600 text-white rounded">Refresh 7 days</button>
            </div>
          </aside>
        </section>

        <section className="bg-white dark:bg-gray-800 p-6 rounded shadow mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Scrape logs</h3>
            <div className="flex items-center gap-2">
              <button onClick={() => { fetchLogs() }} className="px-2 py-1 text-sm text-blue-600">Refresh</button>
              <button onClick={async () => { await api.del('/scraper/logs'); setLogs([]) }} className="px-2 py-1 text-sm text-gray-600">Clear</button>
              <div className="text-xs text-gray-500">{pollingLogs ? 'Polling...' : 'Idle'}</div>
            </div>
          </div>
          <div ref={(el) => { logsBoxRef.current = el }} className="max-h-64 overflow-auto border rounded p-3 bg-gray-50 dark:bg-gray-900 text-sm">
            {logs.length === 0 ? <div className="text-gray-500">No logs yet.</div> : null}
            {logs.map((l, i) => (
              <div key={`${l.ts}-${i}`} className="py-1">
                <span className="text-xs text-gray-400 mr-2">{l.ts.replace('T', ' ').replace('Z', '')}</span>
                <span>{l.msg}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 p-6 rounded shadow">
          <h3 className="font-semibold mb-2">Reported users</h3>
          <p className="text-sm text-gray-600 mb-3">View and act on reported users. Requires an API token with admin privileges.</p>
          <div className="mb-3">
            <button onClick={fetchReports} className="px-3 py-2 bg-red-600 text-white rounded">Fetch reports</button>
          </div>
          <div className="space-y-3">
            {reports?.map((r: any, i: number) => (
              <div key={i} className="p-3 border rounded">
                {r.error ? <div className="text-sm text-red-600">{r.error}</div> : (
                  <>
                    <div className="text-sm">Reported user: <strong>{r.reportedId?.username || r.reportedId || r.reportedId?._id}</strong></div>
                    <div className="text-xs text-gray-500">Reason: {r.reason}</div>
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => blockUser(r.reportedId?._id || r.reportedId)} className="px-2 py-1 bg-yellow-600 text-white rounded text-sm">Block</button>
                      <button onClick={() => deleteUser(r.reportedId?._id || r.reportedId)} className="px-2 py-1 bg-red-600 text-white rounded text-sm">Delete user</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 p-6 rounded shadow">
          <h3 className="font-semibold mb-2">Whois per-city breakdown</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-80 overflow-auto">
            {whoisSummary?.map((c) => (
              <div key={c.city} className="p-3 border rounded">
                <div className="text-sm text-gray-500">{c.city}</div>
                <div className="text-lg font-bold">{c.count}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 p-6 rounded shadow mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Online Whois Users (sample)</h3>
            <div className="flex gap-2">
              <button onClick={fetchWhoisUsers} className="px-2 py-1 text-sm text-blue-600">Refresh</button>
            </div>
          </div>
          <div className="space-y-2 max-h-96 overflow-auto">
            {whoisUsers === null ? (
              <div className="text-sm text-gray-500">No data loaded.</div>
            ) : whoisUsers.length === 0 ? (
              <div className="text-sm text-gray-500">No online users found.</div>
            ) : whoisUsers.map((u) => (
              <div key={u.userId || u._id || u.id} className="p-3 border rounded flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium">{(u.username || u.handle || u.userId || u._id || u.id)}</div>
                  <div className="text-xs text-gray-500">{u.city || u.location || ''}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={async () => {
                    try {
                      if (!confirm('Remove stored presence for this user?')) return
                      const token = safeStorage.getItem('token')
                      if (!token) {
                        alert('No API token set. Enter an admin token and click Save token before proceeding.')
                        return
                      }
                      const id = u.userId || u._id || u.id
                      try {
                        await api.del(`/whois/${encodeURIComponent(id)}`)
                        try { window.dispatchEvent(new CustomEvent('wakapadi:toast', { detail: { text: 'Presence removed' } })) } catch (e) {}
                        await fetchWhoisUsers()
                      } catch (err: any) {
                        console.warn('remove presence failed', err)
                        try { setLastApiError(err?.message || String(err)) } catch (_) {}
                        try { window.dispatchEvent(new CustomEvent('wakapadi:toast', { detail: { text: 'Failed to remove presence: ' + (err?.message || String(err)) } })) } catch (e) {}
                      }
                    } catch (e) { console.warn('remove presence flow failed', e); try { setLastApiError(String(e)) } catch (_) {} }
                  }} className="px-2 py-1 bg-red-600 text-white rounded text-sm">Remove presence</button>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </main>
  )
}
