import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isValidPhoneNumber } from 'react-phone-number-input'
import { Camera } from 'lucide-react'

import { updateMe } from '@/api/auth'
import { ApiError } from '@/api/client'
import ModuleShell from '@/components/layout/ModuleShell'
import { PhoneField } from '@/components/PhoneField'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { mediaUrl } from '@/lib/media'

function initials(user) {
  const a = (user?.prenoms || '').trim()[0] || ''
  const b = (user?.nom || '').trim()[0] || ''
  return (a + b).toUpperCase() || (user?.email?.[0] || 'J').toUpperCase()
}

const fieldClass =
  'h-12 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-white outline-none transition placeholder:text-white/30 focus:border-[#0073e6]/50'

export default function JeuneCompte() {
  const { user, logout, refreshUser } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef(null)

  const [form, setForm] = useState({
    nom: '',
    prenoms: '',
    telephone: '',
  })
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    setForm({
      nom: user?.nom || '',
      prenoms: user?.prenoms || '',
      telephone: user?.telephone || '',
    })
    setAvatarPreview(mediaUrl(user?.avatar))
    setAvatarFile(null)
  }, [user])

  const hasChanges = useMemo(() => {
    if (avatarFile) return true
    return (
      form.nom !== (user?.nom || '') ||
      form.prenoms !== (user?.prenoms || '') ||
      form.telephone !== (user?.telephone || '')
    )
  }, [avatarFile, form, user])

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setSuccess('')
  }

  function onPickAvatar(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Choisis une image (JPG, PNG, etc.).')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Image trop lourde (max 2 Mo).')
      return
    }
    setError('')
    setSuccess('')
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function onSave(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!form.nom.trim() || !form.prenoms.trim()) {
      setError('Le nom et les prénoms sont requis.')
      return
    }

    if (!form.telephone || !isValidPhoneNumber(form.telephone)) {
      setError('Indique un numéro de téléphone valide.')
      return
    }

    setSaving(true)
    try {
      await updateMe({
        nom: form.nom.trim(),
        prenoms: form.prenoms.trim(),
        telephone: form.telephone,
        ...(avatarFile ? { avatar: avatarFile } : {}),
      })
      await refreshUser()
      setAvatarFile(null)
      setSuccess('Profil mis à jour.')
    } catch (err) {
      if (err instanceof ApiError && err.data && typeof err.data === 'object') {
        const first = Object.values(err.data).flat?.()?.[0]
        setError(first || err.message)
      } else {
        setError(err.message || 'Mise à jour impossible.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function onLogout() {
    await logout()
    navigate('/connexion', { replace: true })
  }

  return (
    <div className="space-y-6">
      <ModuleShell title="Compte" hint={user?.email || 'Profil jeune'} />

      <form onSubmit={onSave} className="space-y-5">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="group relative shrink-0"
            aria-label="Changer la photo de profil"
          >
            <Avatar size="lg" className="size-16 border border-white/15 bg-white/10">
              {avatarPreview ? (
                <AvatarImage src={avatarPreview} alt="" className="object-cover" />
              ) : null}
              <AvatarFallback className="bg-transparent text-base text-white">
                {initials(user)}
              </AvatarFallback>
            </Avatar>
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 opacity-0 transition group-hover:opacity-100">
              <Camera className="size-5 text-white" />
            </span>
          </button>
          <div>
            <p className="text-sm font-medium">Photo de profil</p>
            <p className="text-xs text-white/45">JPG ou PNG, 2 Mo max.</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-1 h-8 px-2 text-[#7eb6ff] hover:bg-white/10 hover:text-[#7eb6ff]"
              onClick={() => fileRef.current?.click()}
            >
              Choisir une image
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPickAvatar}
          />
        </div>

        <label className="block space-y-2 text-sm">
          <span className="text-white/70">Prénoms *</span>
          <input
            className={fieldClass}
            value={form.prenoms}
            onChange={(e) => updateField('prenoms', e.target.value)}
            autoComplete="given-name"
            required
          />
        </label>

        <label className="block space-y-2 text-sm">
          <span className="text-white/70">Nom *</span>
          <input
            className={fieldClass}
            value={form.nom}
            onChange={(e) => updateField('nom', e.target.value)}
            autoComplete="family-name"
            required
          />
        </label>

        <PhoneField
          value={form.telephone}
          onChange={(value) => updateField('telephone', value || '')}
          required
        />

        <dl className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm">
          <div>
            <dt className="text-white/45">Email</dt>
            <dd className="mt-0.5 font-medium">{user?.email || '—'}</dd>
          </div>
          <div>
            <dt className="text-white/45">Étape</dt>
            <dd className="mt-0.5 font-medium">{user?.etape_courante_titre || '—'}</dd>
          </div>
        </dl>

        {error ? (
          <p className="rounded-xl border border-[#ff3131]/30 bg-[#ff3131]/10 px-3 py-2 text-sm text-[#ff9a9a]">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            {success}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={saving || !hasChanges}
          className="w-full bg-[#0073e6] text-white hover:bg-[#0073e6]/90 disabled:opacity-50"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </form>

      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/60">
        Mauvaise étape de départ ? Contacte ton <strong className="text-white/80">chef de
        communauté</strong> : il pourra la corriger depuis l’espace Jeunes.
      </div>

      <Button
        variant="outline"
        onClick={onLogout}
        className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
      >
        Se déconnecter
      </Button>
    </div>
  )
}
