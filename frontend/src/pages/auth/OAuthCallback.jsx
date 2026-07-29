import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { oauthLoginRequest } from '@/api/auth'
import { ApiError } from '@/api/client'
import logoScoutUp from '@/assets/brand/logo-scoutup.png'
import { useAuth } from '@/context/AuthContext'
import { homeForRole } from '@/lib/authRoutes'

/**
 * Callback TikTok : ?code=&state=
 */
export default function OAuthCallback() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { acceptSession } = useAuth()
  const [error, setError] = useState('')

  useEffect(() => {
    const code = params.get('code')
    const err = params.get('error') || params.get('error_description')
    if (err) {
      setError(String(err))
      return
    }
    if (!code) {
      setError('Code TikTok manquant.')
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const saved = JSON.parse(sessionStorage.getItem('scoutup.oauth.tiktok') || '{}')
        const redirectUri = saved.redirectUri
        if (!redirectUri) {
          throw new Error('Session OAuth expirée. Réessaie depuis la connexion.')
        }
        const role = saved.role || 'JEUNE'
        const data = await oauthLoginRequest('tiktok', {
          code,
          redirect_uri: redirectUri,
          ...(saved.mode === 'register' ? { role } : {}),
        })
        if (cancelled) return
        sessionStorage.removeItem('scoutup.oauth.tiktok')
        acceptSession(data.user, data.tokens)
        navigate(homeForRole(data.user.role), { replace: true })
      } catch (e) {
        if (cancelled) return
        if (e instanceof ApiError && e.status === 403) {
          sessionStorage.removeItem('scoutup.oauth.tiktok')
          navigate('/attente-validation', { replace: true })
          return
        }
        setError(e.message || 'Connexion TikTok impossible.')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [params, navigate, acceptSession])

  return (
    <main className="min-h-svh bg-[#0d1117] text-white">
      <div className="mx-auto flex min-h-svh w-full max-w-md flex-col px-6 py-8">
        <Link to="/">
          <img src={logoScoutUp} alt="ScoutUp" className="h-10 w-auto" />
        </Link>
        <div className="flex flex-1 flex-col justify-center">
          {error ? (
            <>
              <h1 className="text-2xl font-bold">Connexion sociale</h1>
              <p className="mt-3 rounded-xl border border-[#ff3131]/30 bg-[#ff3131]/10 px-4 py-3 text-sm text-[#ffb4b4]">
                {error}
              </p>
              <Link
                to="/connexion"
                className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-[#0073e6] text-sm font-semibold"
              >
                Retour à la connexion
              </Link>
            </>
          ) : (
            <p className="text-sm text-white/60">Finalisation TikTok…</p>
          )}
        </div>
      </div>
    </main>
  )
}
