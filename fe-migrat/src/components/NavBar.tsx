import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import NotificationsDropdown from './NotificationsDropdown';
import LanguageSwitcher from './LanguageSwitcher';
// LocaleStatus and VisibilityIndicator removed from header; imports cleaned up
import PendingSyncNotice from './PendingSyncNotice';
import VisibilityIndicator from './VisibilityIndicator';
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
    icon?: ReactNode;
  }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        isActive
          ? 'flex items-center gap-2 px-3 py-2 text-blue-600 font-semibold border-b-2 border-blue-600'
          : 'flex items-center gap-2 px-3 py-2 text-gray-700 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300'
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
      className="sticky top-0 z-50 bg-white/70 backdrop-blur-sm dark:bg-gray-900/85 border-b border-gray-100 dark:border-zinc-800"
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
          className={`hidden md:flex flex-1 justify-center items-center md:text-sm ${compactNav ? 'text-sm' : ''}`}
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
 <div className="hidden md:flex items-center mr-2">
                <LanguageSwitcher />
              </div>
            {isLoggedIn ? (
              <>
              <div className="hidden sm:flex items-center mr-2">
            <VisibilityIndicator />
          </div>
             
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
                  className="p-2 rounded hover:bg-transparent hover:text-gray-900 dark:hover:text-gray-100"
                >
                  <SvgChat />
                </button>
                <div className="flex items-center gap-2">
                  <Link
                    to="/profile"
                    className="p-2 rounded hover:bg-transparent hover:text-gray-900 dark:hover:text-gray-100"
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
          </div>

          {/* Mobile-only language switcher placed left of the hamburger */}
          <div className="md:hidden mr-2 flex items-center">
            <LanguageSwitcher />
          </div>

          <div className="hidden lg:flex items-center ml-4 space-x-4">
            <PendingSyncNotice />
          </div>

          <button
            onClick={() => setOpen((s) => !s)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className="md:hidden p-2 rounded border border-gray-200 dark:border-zinc-700 bg-white/60 dark:bg-transparent"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-gray-700 dark:text-gray-200"
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
        <div id="mobile-menu" className="md:hidden bg-gray-50 dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-700">
          <div className="px-4 py-3 max-w-6xl mx-auto flex flex-col gap-3">
            <nav aria-label="Mobile navigation" className="flex flex-col gap-2">
              <Link
                to="/whois"
                onClick={() => setOpen(false)}
                className="px-3 py-2 text-slate-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md"
              >
                {t('whoisNearby')}
              </Link>
              <Link
                to="/tours"
                onClick={() => setOpen(false)}
                className="px-3 py-2 text-slate-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md"
              >
                {t('toursBrowseTitle')}
              </Link>
              <Link
                to="/saved"
                onClick={() => setOpen(false)}
                className="px-3 py-2 text-slate-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md"
              >
                {t('savedLabel') || 'Saved'}
              </Link>
              <Link
                to="/contact-us"
                onClick={() => setOpen(false)}
                className="px-3 py-2 text-slate-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md"
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
                    className="px-3 py-2 text-slate-800 dark:text-gray-100 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800"
                  >
                    {t('profile')}
                  </Link>
                  <button
                    onClick={() => performLogout()}
                    className="px-3 py-2 text-red-600 rounded-md hover:bg-red-50"
                  >
                    {t('logout') || 'Logout'}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleLogin}
                  className="px-3 py-2 text-blue-600 rounded-md hover:bg-blue-50"
                >
                  {t('login')}
                </button>
              )}
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
  ? 'sm:hidden absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/90 border rounded-full shadow-lg px-2 py-1 flex gap-2'
  : 'sm:hidden fixed left-0 right-0 bottom-0 z-50';

  const iconSize = inline ? 16 : 20;
  // increase tappable area on real devices
  const itemSizeClass = inline ? 'w-8 h-8' : 'w-11 h-11';

  const navigate = useNavigate();
  const location = useLocation();
  const path = location?.pathname || '';

  const activeMatch = (p: string) => {
    if (p === '/') return path === '/'
    return path === p || path.startsWith(p + '/')
  }

  const homeActive = activeMatch('/');
  const whoisActive = activeMatch('/whois');
  const toursActive = activeMatch('/tours');
  const chatActive = activeMatch('/chat');
  const profileActive = activeMatch('/profile');

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
      style={ inline ? { zIndex: 20 } : { zIndex: 9999, bottom: 0 }}
      className={baseClass}
    >
      {/* full-width mobile bar with centered icons (Airbnb-like) */}
      <div className="w-full">
        <div className="w-full bg-white/90 dark:bg-zinc-900/95 border-t border-gray-200 dark:border-zinc-700 shadow-sm flex justify-around items-center" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)', height: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
          <Link to="/" aria-label="Home" className={`${itemSizeClass} flex flex-col items-center justify-center text-center ${homeActive ? 'text-blue-600' : 'text-gray-700 dark:text-gray-200'}`}>
            <div className="flex flex-col items-center">
              <SvgHome size={iconSize} className={homeActive ? 'text-blue-600' : 'text-gray-700'} />
              <span className="text-[10px] mt-1 text-slate-700 dark:text-gray-200">Home</span>
            </div>
          </Link>
          <Link to="/whois" aria-label="Nearby" className={`${itemSizeClass} flex flex-col items-center justify-center text-center ${whoisActive ? 'text-blue-600' : 'text-gray-700 dark:text-gray-200'}`}>
            <div className="flex flex-col items-center">
              <SvgPeople size={iconSize} className={whoisActive ? 'text-blue-600' : 'text-gray-700'} />
              <span className="text-[10px] mt-1 text-slate-700 dark:text-gray-200">Nearby</span>
            </div>
          </Link>
          <Link to="/tours" aria-label="Tours" className={`${itemSizeClass} flex flex-col items-center justify-center text-center ${toursActive ? 'text-blue-600' : 'text-gray-700 dark:text-gray-200'}`}>
            <div className="flex flex-col items-center">
              <SvgMap size={iconSize} className={toursActive ? 'text-blue-600' : 'text-gray-700'} />
              <span className="text-[10px] mt-1 text-slate-700 dark:text-gray-200">Tours</span>
            </div>
          </Link>
          {isLoggedIn ? (
            <>
                <NotificationsDropdown triggerClassName="p-0 relative" iconClassName="text-gray-700" />
                <Link to="/chat" aria-label="Chat" className={`${itemSizeClass} flex flex-col items-center justify-center text-center ${chatActive ? 'text-blue-600' : 'text-gray-700 dark:text-gray-200'}`}>
                  <div className="flex flex-col items-center">
                    <SvgChat size={iconSize} className={chatActive ? 'text-blue-600' : 'text-gray-700'} />
                    <span className="text-[10px] mt-1 text-slate-700 dark:text-gray-200">Chat</span>
                  </div>
                </Link>
                <Link to="/profile" aria-label="Profile" className={`${itemSizeClass} flex flex-col items-center justify-center text-center ${profileActive ? 'text-blue-600' : 'text-gray-700 dark:text-gray-200'}`}>
                  <div className="flex flex-col items-center">
                    <SvgAvatar size={iconSize} className={profileActive ? 'text-blue-600' : 'text-gray-700'} />
                    <span className="text-[10px] mt-1 text-slate-700 dark:text-gray-200">Profile</span>
                  </div>
                </Link>
                <button onClick={() => onLogout && onLogout()} aria-label="Logout" className="flex items-center justify-center p-1 text-red-600">
                  <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-red-600">
                    <path d="M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M13 19H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
            </>
          ) : (
            <button onClick={handleLogin} aria-label="Login" className={` flex items-center justify-center rounded hover:bg-transparent hover:text-gray-900 dark:hover:text-gray-100`} style={{ background: 'none' }}>
              <SvgAvatar size={iconSize} />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

function SvgPeople({ size = 18, className = 'text-gray-700' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
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

function SvgMap({ size = 18, className = 'text-gray-700' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
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

function SvgBookmark({ size = 18, className = 'text-gray-700' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
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

function SvgContact({ size = 18, className = 'text-gray-700' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
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

function SvgChat({ size = 18, className = 'text-gray-700' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
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

function SvgHome({ size = 18, className = 'text-gray-700' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
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

function SvgAvatar({ size = 18, className = 'text-gray-700' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
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
