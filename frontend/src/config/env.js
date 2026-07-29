/**
 * Configuration exposée au frontend (variables VITE_*).
 * Définir les valeurs dans frontend/.env (voir .env.example).
 */
export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  appName: import.meta.env.VITE_APP_NAME ?? 'ScoutUp',
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
}
