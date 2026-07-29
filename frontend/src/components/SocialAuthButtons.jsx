import { useCallback, useEffect, useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'

import {
  fetchOauthProviders,
  fetchTikTokAuthorizeUrl,
  oauthLoginRequest,
} from '@/api/auth'
import { ApiError } from '@/api/client'
import { env, tiktokRedirectUri } from '@/config/env'
import { cn } from '@/lib/utils'

/**
 * Boutons OAuth Google / TikTok.
 * @param {{ mode?: 'login' | 'register', role?: string, onSuccess: (data) => void, onPending: () => void, onError: (msg: string) => void, className?: string }} props
 */
export function SocialAuthButtons({
  mode = 'login',
  role = 'JEUNE',
  onSuccess,
  onPending,
  onError,
  className,
}) {
  const [providers, setProviders] = useState({ google: false, tiktok: false })
  const [busy, setBusy] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchOauthProviders()
      .then((data) => {
        if (cancelled) return
        const map = data?.providers || {}
        setProviders({
          google: Boolean(map.google?.configured && env.googleClientId),
          tiktok: Boolean(map.tiktok?.configured),
        })
      })
      .catch(() => {
        if (!cancelled) setProviders({ google: false, tiktok: false })
      })
    return () => {
      cancelled = true
    }
  }, [])

  const finishOauth = useCallback(
    async (provider, payload) => {
      setBusy(provider)
      try {
        const body = {
          ...payload,
          ...(mode === 'register' ? { role } : {}),
        }
        const data = await oauthLoginRequest(provider, body)
        onSuccess?.(data)
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
          onPending?.()
          return
        }
        onError?.(err.message || 'Connexion sociale impossible.')
      } finally {
        setBusy('')
      }
    },
    [mode, role, onSuccess, onPending, onError],
  )

  async function startTikTok() {
    setBusy('tiktok')
    onError?.('')
    try {
      const redirectUri = tiktokRedirectUri()
      const state = mode === 'register' ? `register:${role}` : 'login'
      sessionStorage.setItem(
        'scoutup.oauth.tiktok',
        JSON.stringify({ redirectUri, state, mode, role }),
      )
      const data = await fetchTikTokAuthorizeUrl(redirectUri, state)
      if (!data?.authorize_url) throw new Error('URL TikTok indisponible.')
      window.location.assign(data.authorize_url)
    } catch (err) {
      onError?.(err.message || 'TikTok indisponible.')
      setBusy('')
    }
  }

  if (!providers.google && !providers.tiktok) {
    return null
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="relative py-2 text-center text-xs text-white/40">
        <span className="relative z-10 bg-[#0d1117] px-3">ou continuer avec</span>
        <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/10" />
      </div>

      {providers.google ? (
        <div className="flex justify-center [&_iframe]:!w-full">
          <GoogleLogin
            onSuccess={(res) => {
              if (!res.credential) {
                onError?.('Réponse Google invalide.')
                return
              }
              finishOauth('google', { id_token: res.credential })
            }}
            onError={() => onError?.('Connexion Google annulée.')}
            theme="filled_black"
            size="large"
            shape="pill"
            width="320"
            text={mode === 'register' ? 'signup_with' : 'signin_with'}
            locale="fr"
          />
          {busy === 'google' ? (
            <p className="mt-2 w-full text-center text-xs text-white/50">
              Vérification Google…
            </p>
          ) : null}
        </div>
      ) : null}

      {providers.tiktok ? (
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={startTikTok}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-black text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
        >
          <TikTokMark />
          {busy === 'tiktok' ? 'Redirection TikTok…' : 'Continuer avec TikTok'}
        </button>
      ) : null}
    </div>
  )
}

function TikTokMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path
        fill="currentColor"
        d="M14.5 3c.4 2.2 1.8 3.9 4 4.5v2.4c-1.4-.1-2.7-.6-3.8-1.4v6.3c0 3.3-2.6 5.9-5.9 5.9S2.9 18.1 2.9 14.8 5.5 8.9 8.8 8.9c.3 0 .7 0 1 .1v2.5c-.3-.1-.6-.1-1-.1-1.9 0-3.4 1.5-3.4 3.4s1.5 3.4 3.4 3.4 3.4-1.5 3.4-3.4V3h2.3Z"
      />
    </svg>
  )
}
