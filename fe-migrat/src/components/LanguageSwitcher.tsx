import { useTranslation } from '../lib/i18n'

const LOCALES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
]

export default function LanguageSwitcher() {
  const { lang, setLang } = useTranslation()

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value
    try {
      setLang(next)
    } catch (err) {
      // fallback to English if something goes wrong
      setLang('en')
    }
  }

  return (
    <div className="flex items-center">
      <select value={lang} onChange={onChange} className="px-2 py-1 border rounded text-sm">
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
        ))}
      </select>
    </div>
  )
}
