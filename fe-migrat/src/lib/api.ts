import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig } from 'axios'
import { safeStorage } from './storage'

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

function createClient(): AxiosInstance {
  const instance = axios.create({
    baseURL: BASE,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
    // Accept 200-299 and 304 (Not Modified) so cached responses don't throw
    validateStatus: (status) => (status >= 200 && status < 300) || status === 304,
  })

  instance.interceptors.request.use((cfg) => {
    const token = safeStorage.getItem('token')
    if (token) (cfg.headers as any) = { ...(cfg.headers as any || {}), Authorization: `Bearer ${token}` }
    return cfg
  })

  return instance
}

const client = createClient()

async function request(path: string, opts: AxiosRequestConfig & Record<string, any> = {}) {
  // support a `cache: 'no-store'` option similar to fetch; translate to cache-busting
  let url = path
  if (opts && opts.cache === 'no-store') {
    const sep = url.includes('?') ? '&' : '?'
    url = `${url}${sep}__t=${Date.now()}`
    // also set Cache-Control header
    opts.headers = { ...(opts.headers as any || {}), 'Cache-Control': 'no-store' }
    delete opts.cache
  }
  const cfg: AxiosRequestConfig = { url, ...opts }
  try {
    const res = await client.request(cfg)
    // Normalize to an object with `data` to match existing callers
    const payload = typeof res.data !== 'undefined' ? res.data : ((): any => {
      const contentType = (res.headers?.['content-type'] as string) || ''
      if (contentType.includes('application/json')) return {}
      return res.data ?? ''
    })()
    return { data: payload, status: res.status, headers: res.headers }
  } catch (err: any) {
      if (err.response) {
        const status = err.response.status
        const data = err.response.data
        throw new Error(`API ${status} ${typeof data === 'string' ? data : JSON.stringify(data)}`)
      }
    throw err
  }
}

  export const api = {
    get: (p: string, opts?: any) => request(p, { method: 'GET', ...(opts || {}) }),
    post: (p: string, body?: any, opts?: any) => request(p, { method: 'POST', data: body, ...(opts || {}) }),
    put: (p: string, body?: any, opts?: any) => request(p, { method: 'PUT', data: body, ...(opts || {}) }),
    patch: (p: string, body?: any, opts?: any) => request(p, { method: 'PATCH', data: body, ...(opts || {}) }),
    del: (p: string, opts?: any) => request(p, { method: 'DELETE', ...(opts || {}) }),
  }
