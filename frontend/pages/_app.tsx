import '../lib/localStoragePolyfill';
import '../styles/global.css';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/600.css';
import type { AppProps } from 'next/app';
import { appWithTranslation } from 'next-i18next';
import { GoogleOAuthProvider } from '@react-oauth/google';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
      <Component {...pageProps} />
    </GoogleOAuthProvider>
  );
}

export default appWithTranslation(MyApp);
