import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'

type Translations = Record<string, string>

type I18nContextValue = {
  lang: string
  setLang: (l: string) => void
  t: (key: string, vars?: Record<string, string | number>) => string
  loading: boolean
  error: Error | null
}

const I18nContext = createContext<I18nContextValue | null>(null)

const STORAGE_KEY = 'wakapadi_lang'

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<string>(() => localStorage.getItem(STORAGE_KEY) || navigator.language?.split('-')[0] || 'en')
  const [dict, setDict] = useState<Translations>({})
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async (l: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/locales/${l}/common.json`)
      if (!res.ok) throw new Error('no locale')
      const json = await res.json()
      setDict(json)
    } catch (err: any) {
      setError(err instanceof Error ? err : new Error(String(err)))
      if (l !== 'en') await load('en')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(lang)
  }, [lang, load])

  const setLang = (l: string) => {
    localStorage.setItem(STORAGE_KEY, l)
    setLangState(l)
  }

  const t = (key: string, vars?: Record<string, string | number>) => {
    const raw = (dict && (dict[key] as string)) || key
    if (!vars) return raw
    return Object.keys(vars).reduce((s, k) => s.replace(new RegExp(`\\{\\{?${k}\\}?\\}`, 'g'), String(vars[k])), raw)
  }

  return (
    <I18nContext.Provider value={{ lang, setLang, t, loading, error }}>{children}</I18nContext.Provider>
  )
}

export function useTranslation() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useTranslation must be used within I18nProvider')
  return ctx
}

export function useI18nStatus() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18nStatus must be used within I18nProvider')
  return { loading: ctx.loading, error: ctx.error }
}
