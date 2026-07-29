const STORAGE_KEY = 'scoutup.auth'

/**
 * Persistance locale des tokens JWT + profil utilisateur.
 */
export function loadAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { user: null, tokens: null }
    const parsed = JSON.parse(raw)
    return {
      user: parsed.user ?? null,
      tokens: parsed.tokens ?? null,
    }
  } catch {
    return { user: null, tokens: null }
  }
}

export function saveAuth({ user, tokens }) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      user: user ?? null,
      tokens: tokens ?? null,
    }),
  )
}

export function clearAuth() {
  localStorage.removeItem(STORAGE_KEY)
}

export function getAccessToken() {
  return loadAuth().tokens?.access ?? null
}

export function getRefreshToken() {
  return loadAuth().tokens?.refresh ?? null
}
