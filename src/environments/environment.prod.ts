// Production build with hostname-based routing for the separate staging Vercel project.
const isStagingHost =
  typeof window !== 'undefined' && window.location.hostname.includes('staging');

export const environment = {
  production: !isStagingHost,
  apiUrl: isStagingHost
    ? 'https://backend-rentuhub-staging.up.railway.app/api'
    : 'https://backend-production-08a24.up.railway.app/api',
  defaultCurrency: 'ZAR',
  defaultLocale: 'en-ZA',
  googleClientId: '547425240105-drc54prgr1cmern62j23iivrn9lsg53a.apps.googleusercontent.com',
  facebookAppId: '',
};
