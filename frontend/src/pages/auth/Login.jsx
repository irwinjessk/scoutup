import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { ApiError } from '@/api/client'
import logoScoutUp from '@/assets/brand/logo-scoutup.png'
import { SocialAuthButtons } from '@/components/SocialAuthButtons'
import { useAuth } from '@/context/AuthContext'
import { homeForRole } from '@/lib/authRoutes'

export default function Login() {
  const navigate = useNavigate()
  const { login, acceptSession } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login({ email, password })
      navigate(homeForRole(user.role, user), { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        navigate('/attente-validation', { replace: true })
        return
      }
      setError(err.message || 'Connexion impossible.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-svh bg-[#0d1117] text-white">
      <div className="mx-auto w-full max-w-md px-6 py-8">
        <Link to="/">
          <img src={logoScoutUp} alt="ScoutUp" className="h-10 w-auto" />
        </Link>

        <h1 className="mt-10 text-3xl font-bold tracking-tight">Connexion</h1>
        <p className="mt-2 text-sm text-white/60">
          Accède à ton espace ScoutUp.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block space-y-2 text-sm">
            <span className="text-white/70">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white outline-none ring-[#0073e6] placeholder:text-white/30 focus:ring-2"
              placeholder="toi@email.com"
            />
          </label>

          <label className="block space-y-2 text-sm">
            <span className="text-white/70">Mot de passe</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white outline-none ring-[#0073e6] placeholder:text-white/30 focus:ring-2"
              placeholder="••••••••"
            />
          </label>

          {error ? (
            <p className="rounded-xl border border-[#ff3131]/30 bg-[#ff3131]/10 px-4 py-3 text-sm text-[#ffb4b4]">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#0073e6] text-sm font-semibold transition hover:bg-[#0066cc] disabled:opacity-60"
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <SocialAuthButtons
          mode="login"
          className="mt-6"
          onSuccess={(data) => {
            acceptSession(data.user, data.tokens)
            navigate(homeForRole(data.user.role, data.user), { replace: true })
          }}
          onPending={() => navigate('/attente-validation', { replace: true })}
          onError={setError}
        />

        <p className="mt-6 text-center text-sm text-white/55">
          Pas encore de compte ?{' '}
          <Link to="/inscription" className="font-medium text-[#0073e6]">
            S&apos;inscrire
          </Link>
        </p>
      </div>
    </main>
  )
}
