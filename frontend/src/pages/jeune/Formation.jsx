import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Lock, Play } from 'lucide-react'

import { fetchFormationOverview, startFormation } from '@/api/formation'
import { ApiError } from '@/api/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

const STATUT_LABEL = {
  EN_COURS: 'En cours',
  VALIDE: 'Validé',
  ACQUIS: 'Acquis',
  VERROUILLE: 'Verrouillé',
}

function statutTone(statut) {
  if (statut === 'VALIDE' || statut === 'ACQUIS') return 'bg-emerald-500/15 text-emerald-300'
  if (statut === 'VERROUILLE') return 'bg-white/10 text-white/45'
  if (statut === 'EN_COURS') return 'bg-[#0073e6]/20 text-[#7eb6ff]'
  return 'bg-white/10 text-white/55'
}

export default function JeuneFormation() {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  async function load() {
    setError('')
    setLoading(true)
    try {
      const data = await fetchFormationOverview()
      setRows(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Chargement impossible.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function onStart(stageId) {
    setBusyId(stageId)
    setError('')
    try {
      await startFormation(stageId)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Impossible de démarrer.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Formation</h1>
        <p className="mt-1 text-sm text-white/55">
          {user?.etape_courante_titre
            ? `Étape en cours : ${user.etape_courante_titre}.`
            : 'Parcours libre Route — avance étape par étape.'}
        </p>
        <p className="mt-2 text-xs text-white/40">
          Mauvaise étape ? Demande à ton chef de communauté de la corriger.
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border border-[#ff3131]/30 bg-[#ff3131]/10 px-3 py-2 text-sm text-[#ff8a8a]">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-white/45">Chargement…</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const stage = row.stage
            const statut = row.statut
            const locked = statut === 'VERROUILLE' || statut === 'ACQUIS'
            const done = statut === 'VALIDE'
            const inProgress = statut === 'EN_COURS'
            const future = !statut

            return (
              <li
                key={stage.id}
                className={cn(
                  'rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 transition',
                  (locked || future) && 'opacity-60',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wider text-white/35">
                      Étape {stage.ordre}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold">{stage.titre}</h2>
                    <p className="mt-1 text-sm text-white/45">
                      {statut === 'ACQUIS'
                        ? 'Déjà acquise via ton placement'
                        : `${row.nb_reussies}/${row.nb_total || stage.nb_questions_parcours || 0} questions`}
                    </p>
                  </div>
                  <Badge className={cn('shrink-0 border-0', statutTone(statut))}>
                    {locked || future ? <Lock className="mr-1 size-3" /> : null}
                    {STATUT_LABEL[statut] || 'Verrouillé'}
                  </Badge>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {inProgress ? (
                    <Link
                      to="/jeune/quiz"
                      className="inline-flex h-7 items-center rounded-lg border border-white/15 px-2.5 text-[0.8rem] font-medium text-white transition hover:bg-white/10"
                    >
                      Continuer le quiz
                    </Link>
                  ) : null}
                  {future ? (
                    <p className="text-xs text-white/40">
                      Valide l’étape précédente pour débloquer.
                    </p>
                  ) : null}
                  {done ? (
                    <p className="text-xs text-emerald-300/80">Brevet délivré pour cette étape.</p>
                  ) : null}
                  {statut === 'ACQUIS' ? (
                    <p className="text-xs text-white/40">Non rejouable.</p>
                  ) : null}
                  {!statut && !future ? (
                    <Button
                      size="sm"
                      disabled={busyId === stage.id}
                      onClick={() => onStart(stage.id)}
                      className="bg-[#0073e6] text-white hover:bg-[#0073e6]/90"
                    >
                      <Play className="size-3.5" />
                      {busyId === stage.id ? '…' : 'Commencer'}
                    </Button>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
