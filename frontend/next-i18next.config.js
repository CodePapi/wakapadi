// next-i18next.config.js
module.exports = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'fr', 'es', 'de'], // Add more as needed
    localeDetection: true, // Enable automatic locale detection
  },
  reloadOnPrerender: process.env.NODE_ENV === 'development',
};
