import { env } from '@/config/env'
import { clearAuth, getAccessToken, getRefreshToken, loadAuth, saveAuth } from '@/stores/auth'

export class ApiError extends Error {
  constructor(message, { status, data } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

async function parseError(response) {
  const text = await response.text().catch(() => '')
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text || null
  }

  const message =
    (data && (data.detail || data.message)) ||
    (typeof data === 'string' && data) ||
    `Erreur API ${response.status}`

  return new ApiError(String(message), { status: response.status, data })
}

/**
 * Appelle l'API backend (/api/v1/...).
 * @param {string} path - ex. "auth/login/"
 * @param {RequestInit & { auth?: boolean }} [options]
 */
export async function apiFetch(path, options = {}) {
  const { auth = true, headers: customHeaders, ...rest } = options
  const url = `${env.apiUrl.replace(/\/$/, '')}/api/v1/${path.replace(/^\//, '')}`

  const headers = {
    Accept: 'application/json',
    ...(rest.body ? { 'Content-Type': 'application/json' } : {}),
    ...customHeaders,
  }

  if (auth) {
    const token = getAccessToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(url, {
    ...rest,
    headers,
  })

  if (response.status === 401 && auth) {
    clearAuth()
  }

  if (!response.ok) {
    throw await parseError(response)
  }

  if (response.status === 204) return null
  return response.json()
}

/**
 * Requête multipart (ex. upload avatar).
 * @param {string} path
 * @param {FormData} formData
 * @param {{ method?: string, auth?: boolean }} [options]
 */
export async function apiFetchForm(path, formData, options = {}) {
  const { auth = true, method = 'PATCH', headers: customHeaders, ...rest } = options
  const url = `${env.apiUrl.replace(/\/$/, '')}/api/v1/${path.replace(/^\//, '')}`

  const headers = {
    Accept: 'application/json',
    ...customHeaders,
  }

  if (auth) {
    const token = getAccessToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(url, {
    method,
    ...rest,
    headers,
    body: formData,
  })

  if (response.status === 401 && auth) {
    clearAuth()
  }

  if (!response.ok) {
    throw await parseError(response)
  }

  if (response.status === 204) return null
  return response.json()
}

export async function refreshAccessToken() {
  const refresh = getRefreshToken()
  if (!refresh) return null

  const data = await apiFetch('auth/refresh/', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ refresh }),
  })

  const current = loadAuth()
  const tokens = {
    access: data.access,
    refresh: data.refresh ?? refresh,
  }
  saveAuth({ user: current.user, tokens })
  return tokens.access
}
