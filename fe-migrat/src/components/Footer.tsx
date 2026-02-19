import { useTranslation } from '../lib/i18n'

export default function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="mt-12 border-t border-gray-200 dark:border-zinc-800 py-8">
      <div className="mx-auto max-w-6xl px-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-sm text-slate-700 dark:text-slate-300">{t('footerTagline')}</div>
        <div className="flex items-center gap-3">
          <a
            href="https://www.instagram.com/wakapadi_io"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 hover:underline"
            aria-label={t('followUsOnInstagram')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M7 2C4.243 2 2 4.243 2 7v10c0 2.757 2.243 5 5 5h10c2.757 0 5-2.243 5-5V7c0-2.757-2.243-5-5-5H7zm10 2c1.654 0 3 1.346 3 3v10c0 1.654-1.346 3-3 3H7c-1.654 0-3-1.346-3-3V7c0-1.654 1.346-3 3-3h10z" />
              <path d="M12 7a5 5 0 100 10 5 5 0 000-10zm0 2a3 3 0 110 6 3 3 0 010-6zM17.5 6.5a1 1 0 110 2 1 1 0 010-2z" />
            </svg>
            <span>{t('followUsOnInstagram')}</span>
          </a>
        </div>
      </div>
    </footer>
  )
}
