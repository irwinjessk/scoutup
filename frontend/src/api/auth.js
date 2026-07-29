import { apiFetch } from '@/api/client'

export function loginRequest({ email, password }) {
  return apiFetch('auth/login/', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ email, password }),
  })
}

export function registerRequest(payload) {
  return apiFetch('auth/register/', {
    method: 'POST',
    auth: false,
    body: JSON.stringify(payload),
  })
}

export function fetchMe() {
  return apiFetch('auth/me/')
}

export function logoutRequest(refresh) {
  return apiFetch('auth/logout/', {
    method: 'POST',
    body: JSON.stringify({ refresh }),
  })
}

export function fetchCommunautes() {
  return apiFetch('communautes/', { auth: false })
}

export function fetchOauthProviders() {
  return apiFetch('auth/oauth/providers/', { auth: false })
}

export function oauthLoginRequest(provider, payload) {
  return apiFetch(`auth/oauth/${provider}/`, {
    method: 'POST',
    auth: false,
    body: JSON.stringify(payload),
  })
}

export function fetchTikTokAuthorizeUrl(redirectUri, state = 'scoutup') {
  const q = new URLSearchParams({
    redirect_uri: redirectUri,
    state,
  })
  return apiFetch(`auth/oauth/tiktok/authorize/?${q}`, { auth: false })
}
