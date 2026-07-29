import { env } from '@/config/env'

/**
 * Appelle l'API backend avec l'URL de base définie dans .env
 * @param {string} path - chemin relatif, ex. "/api/health/"
 * @param {RequestInit} [options]
 */
export async function apiFetch(path, options = {}) {
  const url = `${env.apiUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  })

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText)
    throw new Error(message || `Erreur API ${response.status}`)
  }

  if (response.status === 204) return null
  return response.json()
}
