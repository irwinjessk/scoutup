import { env } from '@/config/env'

/** URL absolue pour un fichier media renvoyé par l'API. */
export function mediaUrl(path) {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path
  const base = env.apiUrl.replace(/\/$/, '')
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalized}`
}
