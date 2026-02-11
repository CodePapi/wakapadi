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
  reactStrictMode: true,
  experimental: {
    instrumentationHook: true,
  },
  i18n: {
    locales: ['en', 'fr', 'es', 'de'], // Ensure these match your actual setup
    defaultLocale: 'en',
  },
  images: {
    domains: [
      'www.freetour.com',
      'www.guruwalk.com',
      'media.guruwalk.com',
      'imagedelivery.net',
      'www.venicefreewalkingtour.com',
      'www.neweuropetours.eu'
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