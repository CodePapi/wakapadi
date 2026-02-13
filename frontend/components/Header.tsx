import Link from 'next/link';
import Image from 'next/image';
import styles from '../styles/components/Header.module.css';
import { useReducer } from 'react';

interface HeaderProps {
  homepage?: boolean;
}

const Header = (props: HeaderProps) => {
  const handleMobileNavState = (state: boolean, action: string) => {
    switch (action) {
      case 'OPEN':
        return true;
      case 'CLOSE':
        return false;
      default:
        return state;
    }
  };

  // useReducer to manage mobile menu state
  // 'OPEN' to open the menu, 'CLOSE' to close it
  const [ismobileMenuOpen, dispatch] = useReducer(handleMobileNavState, false);
  const { homepage } = props;

  // Render the header with different styles based on homepage prop
  if (homepage) {
    return (
      <nav
        className={`w-full ${styles['header-nav-homepage']} bg-transparent`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <a aria-label="Wakapadi home" className="inline-block">
                <Image src="/logo1.svg" alt="Wakapadi Logo" width={140} height={40} priority />
              </a>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <Link href="/tours"><a className="text-white font-medium hover:opacity-90">Tours</a></Link>
            <Link href="/whois"><a className="text-white font-medium hover:opacity-90">Meet people nearby</a></Link>
            <Link href="/about"><a className="text-white/90 hover:opacity-95">About</a></Link>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link href="/login"><a className="text-white/90">Log in</a></Link>
            <Link href="/register"><a className="inline-flex items-center px-4 py-2 rounded-full bg-white text-slate-900 font-semibold shadow">Get started</a></Link>
          </div>

          {/* Mobile controls */}
          <div className="flex md:hidden items-center gap-2">
            <button aria-label="open menu" aria-expanded={ismobileMenuOpen} onClick={() => dispatch('OPEN')} className="p-2 rounded-md bg-white/8 text-white hover:bg-white/12 focus:outline-none focus:ring-2 focus:ring-white">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu overlay */}
        <div className={`${ismobileMenuOpen ? 'fixed inset-0 z-50' : 'hidden'}`}>
          <div className="absolute inset-0 bg-black/60" onClick={() => dispatch('CLOSE')} />
          <div className="absolute top-0 right-0 w-full max-w-sm bg-white h-full p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <Link href="/">
                <a aria-label="Wakapadi home"><Image src="/logo1.svg" alt="Wakapadi Logo" width={120} height={36} /></a>
              </Link>
              <button aria-label="close menu" onClick={() => dispatch('CLOSE')} className="p-2 rounded-md hover:bg-slate-100">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <nav className="mt-8 flex flex-col gap-4">
              <Link href="/tours"><a className="text-slate-900 font-semibold text-lg">Tours</a></Link>
              <Link href="/whois"><a className="text-slate-900 font-semibold text-lg">Meet people nearby</a></Link>
              <Link href="/about"><a className="text-slate-700">About</a></Link>
              <Link href="/contact-us"><a className="text-slate-700">Contact</a></Link>
              <Link href="/login"><a className="text-slate-700">Log in</a></Link>
              <Link href="/register"><a className="mt-4 inline-flex items-center justify-center px-4 py-2 rounded-full bg-gradient-to-r from-sky-600 to-emerald-500 text-white font-semibold">Get started</a></Link>
            </nav>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className={styles['header-nav']} role="navigation" aria-label="Main navigation">
      <Link href="/">
        <a aria-label="Wakapadi home">
          <Image src="/logo1.svg" alt="Wakapadi Logo" width={140} height={40} priority />
        </a>
      </Link>
      {/* 1st nav */}
      <div className={styles['header-link-container']}>
        <a href="#">Who is Nearby</a>
        <a href="#">About</a>
        <a href="#">Contact</a>
      </div>
      {/* 2nd nav */}
      <div className={styles['header-authentication-link']}>
        <Link href="/login"><a className={styles['header-link']}>Log in</a></Link>
        <Link href="/register"><a className={styles['cta-button']}>Get started</a></Link>
        <button aria-label="language" className={styles['icon-button']}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 2a10 10 0 100 20 10 10 0 000-20z" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      </div>
      <div
        className={`${styles['mobile-header-authentication-link']} ${
          homepage ? styles[''] : styles['not-homepage']
        }`}
      >
        <button aria-label="language" className={styles['icon-button']}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 2a10 10 0 100 20 10 10 0 000-20z" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
        <button aria-label="open menu" className={styles['icon-button']} onClick={() => dispatch('OPEN')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div
        className={`${styles['mobile-header-link-container']} ${
          ismobileMenuOpen ? styles['active'] : ''
        }`}
      >
        <div className={styles['mobile-header-link-container-top-nav']}>
          <Link href="/">
            <a aria-label="Wakapadi home">
              <Image src="/logo2.svg" alt="Wakapadi Logo" width={120} height={36} />
            </a>
          </Link>
          <button
            className={styles['mobile-header-link-container-top-nav-close']}
            aria-label="close menu"
            onClick={() => dispatch('CLOSE')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div
          className={`${styles['mobile-header-link-container-links']} ${styles['mobile-header-link-container-links-not-homepage']}`}
        >
          <a href="#" className={styles['header-link']}>
            Who is Nearby
          </a>
          <a href="#" className={styles['header-link']}>
            About
          </a>
          <a href="#" className={styles['header-link']}>
            Contact
          </a>
          <a>Log in</a>
          <div className={styles['mobile-header-link-container-language']}>
            <button aria-label="language" className={styles['icon-button']}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 2a10 10 0 100 20 10 10 0 000-20z" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
            <select name='language' id='language'>
              <option value='english'>English</option>
              <option value='french'>French</option>
              <option value='spanish'>Spanish</option>
              <option value='german'>German</option>
            </select>
          </div>
          <button className={styles['cta-button']}>Sign up</button>
        </div>
      </div>
    </nav>
  );
};

export default Header;
