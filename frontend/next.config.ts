// const { i18n } = require('./next-i18next.config');

// module.exports = {
//   reactStrictMode: true,
//   i18n: {
//     locales: ['en', 'fr', 'de', 'es'], // Example locales, adjust as needed
//     defaultLocale: 'en',
//   },
// };


/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  i18n: {
    locales: ['en', 'fr', 'es', 'de'], // Ensure these match your actual setup
    defaultLocale: 'en',
    localeDetection: true, // Enable automatic locale detection
  },
  images: {
    domains: [
      'www.freetour.com'
    ]
    ,
    // This is the critical part
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.paris-walks.com', // EXACTLY this hostname
        port: '',
        pathname: '/**', // Allows any path on this host
      },
    ],
  },
  // ... any other configurations you might have
};

module.exports = nextConfig;