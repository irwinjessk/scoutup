import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'

import { ApiError } from '@/api/client'
import { chooseEtape, fetchEtapes } from '@/api/formation'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

const HINTS = {
  NOVICIAT: 'Je découvre la Route.',
  APPRENTISSAGE: 'J’ai déjà validé le Noviciat.',
  COMPAGNONNAGE: 'Je suis plus avancé sur le parcours.',
  DEPART_ROUTIER: 'Je prépare mon départ routier.',
}

export default function JeunePlacement() {
  const { user, patchUser } = useAuth()
  const navigate = useNavigate()
  const [stages, setStages] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const alreadyPlaced = Boolean(user?.etape_placee || user?.etape_placee_le)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const data = await fetchEtapes()
        if (!cancelled) setStages(Array.isArray(data) ? data : [])
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Chargement impossible.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (alreadyPlaced) {
    return <Navigate to="/jeune" replace />
  }

  const selected = stages.find((s) => s.id === selectedId)

  async function onConfirm() {
    if (!selectedId) return
    setBusy(true)
    setError('')
    try {
      const updated = await chooseEtape(selectedId)
      patchUser(updated)
      navigate('/jeune/formation', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Placement impossible.')
      setConfirming(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative flex min-h-svh flex-col bg-[#0d1117] px-4 py-8 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,115,230,0.18),_transparent_55%)]"
      />
      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col">
        <p className="text-sm font-semibold tracking-tight text-[#7eb6ff]">ScoutUp</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Où en es-tu sur la Route&nbsp;?
        </h1>
        <p className="mt-2 text-sm text-white/55">
          Choisis ton étape actuelle. Tu ne pourras plus la changer seul — ton chef de communauté
          pourra corriger si besoin.
        </p>

        {error ? (
          <p className="mt-4 rounded-xl border border-[#ff3131]/30 bg-[#ff3131]/10 px-3 py-2 text-sm text-[#ff8a8a]">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="mt-8 text-sm text-white/45">Chargement des étapes…</p>
        ) : (
          <ul className="mt-8 space-y-3">
            {stages.map((stage) => {
              const active = selectedId === stage.id
              return (
                <li key={stage.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(stage.id)
                      setConfirming(false)
                    }}
                    className={cn(
                      'w-full rounded-2xl border px-4 py-4 text-left transition',
                      active
                        ? 'border-[#0073e6] bg-[#0073e6]/15'
                        : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.07]',
                    )}
                  >
                    <p className="text-xs uppercase tracking-wider text-white/35">
                      Étape {stage.ordre}
                    </p>
                    <p className="mt-1 text-lg font-semibold">{stage.titre}</p>
                    <p className="mt-1 text-sm text-white/50">
                      {HINTS[stage.code] || 'Sélectionne cette étape si c’est là où tu en es.'}
                    </p>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <div className="mt-auto space-y-3 pt-8 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {!confirming ? (
            <Button
              disabled={!selectedId || busy}
              onClick={() => setConfirming(true)}
              className="h-11 w-full bg-[#0073e6] text-white hover:bg-[#0073e6]/90"
            >
              Continuer
            </Button>
          ) : (
            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-sm text-white/75">
                Tu starts à <strong className="text-white">{selected?.titre}</strong>. Les étapes
                suivantes resteront verrouillées jusqu’à validation. Les étapes précédentes seront
                marquées « acquis ».
              </p>
              <div className="flex gap-2">
                <Button
                  disabled={busy}
                  onClick={onConfirm}
                  className="flex-1 bg-[#0073e6] text-white hover:bg-[#0073e6]/90"
                >
                  {busy ? '…' : 'Confirmer'}
                </Button>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => setConfirming(false)}
                  className="border-white/15 bg-transparent text-white hover:bg-white/10"
                >
                  Changer
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
