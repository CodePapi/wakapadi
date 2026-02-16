import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '../lib/i18n'

const LOCALES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
]

export default function LanguageSwitcher() {
  const { lang, setLang } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties | undefined>(undefined)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  useEffect(() => {
    if (!open || !buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const preferredWidth = 160
    const left = rect.left + preferredWidth > window.innerWidth ? Math.max(8, window.innerWidth - preferredWidth - 8) : rect.left
    const top = rect.bottom + 8
    setDropdownStyle({ position: 'fixed', left: Math.round(left), top: Math.round(top), width: preferredWidth, zIndex: 99999 })
  }, [open])

  const current = LOCALES.find((l) => l.code === lang) || LOCALES[0]

  function choose(code: string) {
    try {
      setLang(code)
    } catch (err) {
      setLang('en')
    }
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((s) => !s)}
        ref={buttonRef}
        className="flex items-center gap-2 px-2 py-1 rounded-full border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-800/80 hover:bg-white dark:hover:bg-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 text-sm text-gray-800 dark:text-gray-100"
      >
        <span className="text-lg leading-none">{current.flag}</span>
        <span className="hidden sm:inline">{current.code.toUpperCase()}</span>
        <svg width="14" height="14" viewBox="0 0 20 20" className="ml-1 text-gray-600 dark:text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none">
          <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Select language"
          style={dropdownStyle}
          className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded shadow-lg overflow-hidden text-gray-900 dark:text-gray-100"
        >
          {LOCALES.map((l) => (
            <li
              key={l.code}
              role="option"
              aria-selected={l.code === current.code}
              onClick={() => choose(l.code)}
              className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-700 ${l.code === current.code ? 'bg-gray-100 dark:bg-zinc-700/60' : ''}`}
            >
              <span className="text-lg leading-none">{l.flag}</span>
              <span className="text-sm">{l.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
