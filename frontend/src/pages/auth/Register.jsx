import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { fetchCommunautes } from '@/api/auth'
import { ApiError } from '@/api/client'
import logoScoutUp from '@/assets/brand/logo-scoutup.png'
import { useAuth } from '@/context/AuthContext'

const emptyForm = {
  role: 'JEUNE',
  nom: '',
  prenoms: '',
  date_naissance: '',
  genre: 'M',
  email: '',
  password: '',
  password_confirm: '',
  communaute_id: '',
}

export default function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [step, setStep] = useState('role') // role | form
  const [form, setForm] = useState(emptyForm)
  const [communautes, setCommunautes] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchCommunautes()
      .then((data) => {
        if (!cancelled) setCommunautes(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (!cancelled) setCommunautes([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function onSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register({
        ...form,
        communaute_id: Number(form.communaute_id),
      })
      navigate('/attente-validation', { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.data && typeof err.data === 'object') {
        const first = Object.values(err.data).flat?.()?.[0]
        setError(first || err.message)
      } else {
        setError(err.message || 'Inscription impossible.')
      }
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

        <h1 className="mt-10 text-3xl font-bold tracking-tight">Inscription</h1>

        {step === 'role' ? (
          <div className="mt-8 space-y-4">
            <p className="text-sm text-white/65">
              Choisis ton profil. Ton compte devra être validé par ton
              responsable (CC ou CG).
            </p>
            <button
              type="button"
              onClick={() => {
                updateField('role', 'JEUNE')
                setStep('form')
              }}
              className="flex w-full flex-col rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition hover:border-[#0073e6]/50 hover:bg-white/10"
            >
              <span className="text-lg font-semibold">Jeune (Routier)</span>
              <span className="mt-1 text-sm text-white/55">
                Validé par ton Coordinateur de Communauté
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                updateField('role', 'CC')
                setStep('form')
              }}
              className="flex w-full flex-col rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition hover:border-[#ff3131]/40 hover:bg-white/10"
            >
              <span className="text-lg font-semibold">Chef (CC)</span>
              <span className="mt-1 text-sm text-white/55">
                Validé par le Chef de Groupe
              </span>
            </button>
            <p className="pt-2 text-center text-sm text-white/55">
              Déjà inscrit ?{' '}
              <Link to="/connexion" className="font-medium text-[#0073e6]">
                Se connecter
              </Link>
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <button
              type="button"
              onClick={() => setStep('role')}
              className="text-sm text-white/50 hover:text-white"
            >
              ← Changer de profil ({form.role === 'JEUNE' ? 'Jeune' : 'Chef'})
            </button>

            <Field label="Nom">
              <input
                required
                value={form.nom}
                onChange={(e) => updateField('nom', e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Prénoms">
              <input
                required
                value={form.prenoms}
                onChange={(e) => updateField('prenoms', e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Date de naissance">
              <input
                type="date"
                required
                value={form.date_naissance}
                onChange={(e) => updateField('date_naissance', e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Genre">
              <select
                value={form.genre}
                onChange={(e) => updateField('genre', e.target.value)}
                className={inputClass}
              >
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
                <option value="AUTRE">Autre</option>
              </select>
            </Field>
            <Field label="Communauté">
              <select
                required
                value={form.communaute_id}
                onChange={(e) => updateField('communaute_id', e.target.value)}
                className={inputClass}
              >
                <option value="">Choisir…</option>
                {communautes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Email">
              <input
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Mot de passe">
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Confirmer le mot de passe">
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={form.password_confirm}
                onChange={(e) => updateField('password_confirm', e.target.value)}
                className={inputClass}
              />
            </Field>

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
              {loading ? 'Création…' : 'Créer mon compte'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}

function Field({ label, children }) {
  return (
    <label className="block space-y-2 text-sm">
      <span className="text-white/70">{label}</span>
      {children}
    </label>
  )
}

const inputClass =
  "h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white outline-none ring-[#0073e6] focus:ring-2 [color-scheme:dark]"
