/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    instrumentationHook: true,
  },
  i18n: {
    locales: ['en', 'fr', 'es', 'de'], 
    defaultLocale: 'en',
  },
  images: {
    domains: [
      'www.freetour.com',
      'www.guruwalk.com',
      'media.guruwalk.com',
      'imagedelivery.net',
      'www.venicefreewalkingtour.com',
      'www.neweuropetours.eu',
      "assets.guruwalk.com"
    ]
  ,

    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.paris-walks.com',
        port: '',
        pathname: '/**', 
      },
    ],
  },

};

module.exports = nextConfig;