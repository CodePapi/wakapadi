import '../lib/localStoragePolyfill';
import '../styles/global.css';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/600.css';
import type { AppProps } from 'next/app';
import { appWithTranslation } from 'next-i18next';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <Component {...pageProps} />
  );
}

export default appWithTranslation(MyApp);
