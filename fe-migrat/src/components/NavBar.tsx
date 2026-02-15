import React, { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import NotificationsDropdown from './NotificationsDropdown';
import LanguageSwitcher from './LanguageSwitcher';
import LocaleStatus from './LocaleStatus';
import VisibilityIndicator from './VisibilityIndicator';
import PendingSyncNotice from './PendingSyncNotice';
import SafetyNotice from './SafetyNotice';
import { ensureAnonymousSession, setLogoutBlock } from '../lib/anonymousAuth';
import { useTranslation } from '../lib/i18n';
import { api } from '../lib/api';
import { useRef } from 'react';

export default function NavBar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() =>
    Boolean(localStorage.getItem('token')),
  );

  useEffect(() => {
    const onStorage = () =>
      setIsLoggedIn(Boolean(localStorage.getItem('token')));
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const handleLogin = async () => {
    try {
      const loc =
        window.location.pathname +
        window.location.search +
        window.location.hash;
      try {
        localStorage.setItem('wakapadi_return_to', loc);
      } catch {}
    } catch {}
    navigate('/login');
  };

  async function performLogout() {
    try {
      try {
        const token = localStorage.getItem('token');
        if (token) await api.patch('/whois', { visible: false });
      } catch (e) {
        console.warn('failed to update presence during logout', e);
      }
    } finally {
      try {
        localStorage.removeItem('token');
      } catch {}
      try {
        localStorage.removeItem('userId');
      } catch {}
      try {
        localStorage.removeItem('authProvider');
      } catch {}
      try {
        setLogoutBlock();
      } catch {}
      window.location.href = '/';
    }
  }

  const NavItem = ({
    to,
    label,
    icon,
  }: {
    to: string;
    label: string;
    icon?: React.ReactNode;
  }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        isActive
          ? 'flex items-center gap-2 px-3 py-2 text-blue-600 font-semibold border-b-2 border-blue-600'
          : 'flex items-center gap-2 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300'
      }
    >
      {icon}
      <span
        title={label}
        className="hidden sm:inline-block nav-label max-w-[10rem] truncate"
      >
        {label}
      </span>
    </NavLink>
  );

  const navRef = useRef<HTMLDivElement | null>(null);
  const [compactNav, setCompactNav] = useState(false);

  // labels used for dependency so effect runs when language changes
  const navLabels = [
    t('whoisNearby'),
    t('toursBrowseTitle'),
    t('savedLabel') || 'Saved',
    t('contactUs'),
  ];

  useEffect(() => {
    function checkOverflow() {
      if (!navRef.current) return setCompactNav(false);
      const labels = Array.from(
        navRef.current.querySelectorAll<HTMLElement>('.nav-label'),
      );
      const anyOverflow = labels.some((el) => el.scrollWidth > el.clientWidth);
      setCompactNav(anyOverflow);
    }

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [navLabels.join('|')]);

  return (
    <header
      style={{ zIndex: 99999 }}
      className="sticky top-0 z-50 bg-white/85 backdrop-blur-sm dark:bg-gray-900/85 border-b"
    >
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4 relative">
        <Link
          to="/"
          aria-label="Wakapadi home"
          className="flex items-center gap-3 flex-shrink-0"
        >
          <img src="/logo1.svg" alt="Wakapadi" className="h-8" />
        </Link>

        {/* Mobile centered nav: same vertical level as logo and hamburger */}
        {/* <MobileBottomNav isLoggedIn={isLoggedIn} onLogout={performLogout} inline /> */}

        <nav
          aria-label="Primary"
          ref={navRef}
          className={`hidden md:flex flex-1 justify-center items-center ${compactNav ? 'text-sm' : ''}`}
        >
          <div className="flex items-center gap-2 bg-transparent">
            <NavItem
              to="/whois"
              label={t('whoisNearby')}
              icon={<SvgPeople />}
            />
            <NavItem
              to="/tours"
              label={t('toursBrowseTitle')}
              icon={<SvgMap />}
            />
            <NavItem
              to="/saved"
              label={t('savedLabel') || 'Saved'}
              icon={<SvgBookmark />}
            />
            <NavItem
              to="/contact-us"
              label={t('contactUs')}
              icon={<SvgContact />}
            />
          </div>
        </nav>

        <div className="flex items-center gap-3 ml-auto">
          <div className="hidden sm:flex items-center gap-2">
            {isLoggedIn ? (
              <>
                <button
                  aria-label="Open chat"
                  onClick={async () => {
                    if (!localStorage.getItem('token')) {
                      try {
                        localStorage.setItem('wakapadi_return_to', '/chat');
                      } catch {}
                      await ensureAnonymousSession().catch(() => {});
                    }
                    navigate('/chat');
                  }}
                  className="p-2 rounded hover:bg-gray-100"
                >
                  <SvgChat />
                </button>
                <div className="flex items-center gap-2">
                  <Link
                    to="/profile"
                    className="p-2 rounded hover:bg-gray-100"
                    aria-label={t('profile')}
                  >
                    <SvgAvatar />
                  </Link>
                  <NotificationsDropdown />
                  <button
                    onClick={() => performLogout()}
                    aria-label={t('logout') || 'Logout'}
                    className="text-sm text-red-600 ml-2 hidden md:inline-block"
                  >
                    {t('logout') || 'Logout'}
                  </button>
                </div>
              </>
            ) : (
              <button onClick={handleLogin} className="text-sm text-blue-600">
                {t('login')}
              </button>
            )}

            <VisibilityIndicator />
            <LanguageSwitcher />
            <LocaleStatus />
          </div>

          <div className="hidden lg:flex items-center ml-4 space-x-4">
            <PendingSyncNotice />
            <SafetyNotice />
          </div>

          <button
            onClick={() => setOpen((s) => !s)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className="md:hidden p-2 rounded border"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-gray-700"
            >
              <path
                d="M3 5h14M3 10h14M3 15h14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-menu" className="md:hidden bg-white/95 border-t">
          <div className="px-4 py-3 max-w-6xl mx-auto flex flex-col gap-3">
            <nav aria-label="Mobile navigation" className="flex flex-col gap-2">
              <Link
                to="/whois"
                onClick={() => setOpen(false)}
                className="px-3 py-2 text-gray-700 hover:bg-gray-50 rounded"
              >
                {t('whoisNearby')}
              </Link>
              <Link
                to="/tours"
                onClick={() => setOpen(false)}
                className="px-3 py-2 text-gray-700 hover:bg-gray-50 rounded"
              >
                {t('toursBrowseTitle')}
              </Link>
              <Link
                to="/saved"
                onClick={() => setOpen(false)}
                className="px-3 py-2 text-gray-700 hover:bg-gray-50 rounded"
              >
                {t('savedLabel') || 'Saved'}
              </Link>
              <Link
                to="/contact-us"
                onClick={() => setOpen(false)}
                className="px-3 py-2 text-gray-700 hover:bg-gray-50 rounded"
              >
                {t('contactUs')}
              </Link>
            </nav>

            <div className="flex items-center gap-2">
              {isLoggedIn ? (
                <>
                  <Link
                    to="/profile"
                    onClick={() => setOpen(false)}
                    className="px-3 py-2 text-gray-700"
                  >
                    {t('profile')}
                  </Link>
                  <button
                    onClick={() => performLogout()}
                    className="px-3 py-2 text-red-600"
                  >
                    {t('logout') || 'Logout'}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleLogin}
                  className="px-3 py-2 text-blue-600"
                >
                  {t('login')}
                </button>
              )}
            </div>

            <div className="pt-2 border-t mt-2 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <LanguageSwitcher />
                <LocaleStatus />
              </div>
              <div className="flex items-center gap-2">
                <VisibilityIndicator />
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export function MobileBottomNav({
  isLoggedIn,
  onLogout,
  inline,
}: {
  isLoggedIn?: boolean;
  onLogout?: () => void;
  inline?: boolean;
}) {
  // if `inline` true, render centered inside header; otherwise fixed at viewport bottom
  const baseClass = inline
    ? 'sm:hidden absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/95 border rounded-full shadow-lg px-2 py-1 flex gap-2'
    : 'sm:hidden fixed bottom-4 left-1/2 -translate-x-1/2 bg-white/95 border rounded-full shadow-lg px-3 py-2 flex gap-4';

  const iconSize = inline ? 14 : 18;
  const itemSizeClass = inline ? 'w-7 h-7' : 'w-8 h-8';

  const navigate = useNavigate();

  const handleLogin = () => {
    try {
      const loc =
        window.location.pathname +
        window.location.search +
        window.location.hash;
      try {
        localStorage.setItem('wakapadi_return_to', loc);
      } catch {}
    } catch {}
    navigate('/login');
  };

  return (
    <nav
      style={
        inline
          ? { zIndex: 20 }
          : { bottom: 'env(safe-area-inset-bottom, 0.5rem)', zIndex: 10 }
      }
      className={baseClass}
    >
      <Link
        to="/"
        aria-label="Home"
        className={`${itemSizeClass} flex items-center justify-center rounded hover:bg-gray-100`}
      >
        <SvgHome size={iconSize} />
      </Link>

      <Link
        to="/whois"
        aria-label="Nearby"
        className={`${itemSizeClass} flex items-center justify-center rounded hover:bg-gray-100`}
      >
        <SvgPeople size={iconSize} />
      </Link>
      <Link
        to="/tours"
        aria-label="Tours"
        className={`${itemSizeClass} flex items-center justify-center rounded hover:bg-gray-100`}
      >
        <SvgMap size={iconSize} />
      </Link>

      {isLoggedIn ? (
        <>
          <div
            className={`${itemSizeClass} flex items-center justify-center rounded hover:bg-gray-100`}
          >
            <NotificationsDropdown />
          </div>
          <Link
            to="/chat"
            aria-label="Chat"
            className={`${itemSizeClass} flex items-center justify-center rounded hover:bg-gray-100`}
          >
            <SvgChat size={iconSize} />
          </Link>
          <Link
            to="/profile"
            aria-label="Profile"
            className={`${itemSizeClass} flex items-center justify-center rounded hover:bg-gray-100`}
          >
            <SvgAvatar size={iconSize} />
          </Link>

          <button
            onClick={() => onLogout && onLogout()}
            aria-label="Logout"
            style={{
              background: 'none',
            }}
            className={`flex items-center justify-center rounded bg-red-50 hover:bg-red-100 text-red-600`}
          >
            <svg
              width={iconSize}
              height={iconSize}
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-red-600"
            >
              <path
                d="M16 17l5-5-5-5M21 12H9"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M13 19H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h7"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </>
      ) : (
        <button
          onClick={handleLogin}
          aria-label="Login"
          className={` flex items-center justify-center rounded hover:bg-gray-100`}
          style={{
            background: 'none',
          }}
        >
          <SvgAvatar size={iconSize} />
        </button>
      )}
    </nav>
  );
}

function SvgPeople({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-gray-700"
    >
      <path
        d="M16 11c1.657 0 3-1.567 3-3.5S17.657 4 16 4s-3 1.567-3 3.5S14.343 11 16 11zM8 11c1.657 0 3-1.567 3-3.5S9.657 4 8 4 5 5.567 5 7.5 6.343 11 8 11zM4 20c0-2.209 3.134-4 7-4s7 1.791 7 4v1H4v-1z"
        stroke="currentColor"
        strokeWidth="0.8"
        fill="currentColor"
      />
    </svg>
  );
}

function SvgMap({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-gray-700"
    >
      <path
        d="M20.5 3.5l-5 2-6-2-5 2v13l5-2 6 2 5-2v-13z"
        stroke="currentColor"
        strokeWidth="0.8"
        fill="currentColor"
      />
    </svg>
  );
}

function SvgBookmark({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-gray-700"
    >
      <path
        d="M6 2v18l6-4 6 4V2z"
        stroke="currentColor"
        strokeWidth="0.8"
        fill="currentColor"
      />
    </svg>
  );
}

function SvgContact({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-gray-700"
    >
      <path
        d="M21 8V7l-3 2-2-1-4 3-4-3-2 1-3-2v1c0 6 9 12 12 12s12-6 12-12z"
        stroke="currentColor"
        strokeWidth="0.6"
        fill="currentColor"
      />
    </svg>
  );
}

function SvgChat({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-gray-700"
    >
      <path
        d="M21 15a2 2 0 0 1-2 2H8l-5 3V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
        stroke="currentColor"
        strokeWidth="0.8"
        fill="currentColor"
      />
    </svg>
  );
}

function SvgHome({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-gray-700"
    >
      <path
        d="M3 10.5L12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5z"
        stroke="currentColor"
        strokeWidth="0.8"
        fill="currentColor"
      />
    </svg>
  );
}

function SvgAvatar({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-gray-700"
    >
      <path
        d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5zM4 20c0-4 4-7 8-7s8 3 8 7"
        stroke="currentColor"
        strokeWidth="0.8"
        fill="currentColor"
      />
    </svg>
  );
}
