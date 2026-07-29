/**
 * Configuration exposée au frontend (variables VITE_*).
 * Définir les valeurs dans frontend/.env (voir .env.example).
 */
export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  appName: import.meta.env.VITE_APP_NAME ?? 'ScoutUp',
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '',
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
}

export function tiktokRedirectUri() {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')
  return `${window.location.origin}${base}oauth/callback`
}
