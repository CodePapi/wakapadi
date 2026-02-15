import names from './anonymous_names.json'

function hashString(s: string) {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = (h * 33) ^ s.charCodeAt(i)
  }
  return Math.abs(h >>> 0)
}

export function getAnonymousHandleForId(id?: string) {
  if (!id || id.length === 0) {
    // fallback random pick
    return names[Math.floor(Math.random() * names.length)]
  }
  const idx = hashString(String(id)) % names.length
  return names[idx]
}

export function anonymousLabel(prefix = 'Anonymous', id?: string) {
  const handle = getAnonymousHandleForId(id)
  return `${prefix} ${handle}`
}

export default {
  getAnonymousHandleForId,
  anonymousLabel,
}
