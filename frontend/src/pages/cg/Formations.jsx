import { useEffect, useState } from 'react'

import { fetchCGFormations } from '@/api/cg'
import { ApiError } from '@/api/client'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const STATUT_LABEL = {
  EN_COURS: 'En cours',
  VALIDE: 'Validé',
  ACQUIS: 'Acquis',
  VERROUILLE: 'Verrouillé',
}

function statutTone(statut) {
  if (statut === 'VALIDE' || statut === 'ACQUIS') {
    return 'bg-emerald-50 text-emerald-700'
  }
  if (statut === 'EN_COURS') return 'bg-[var(--chef-accent)]/12 text-[var(--chef-accent)]'
  if (statut === 'VERROUILLE') return 'bg-slate-100 text-slate-500'
  return 'bg-slate-100 text-slate-600'
}

function sortedProgressions(progressions) {
  return [...(progressions || [])].sort(
    (a, b) => (a.stage_ordre ?? a.stage ?? 0) - (b.stage_ordre ?? b.stage ?? 0),
  )
}

function JeuneFormationCard({ row }) {
  const progressions = sortedProgressions(row.progressions)

  return (
    <li className="rounded-2xl border border-[var(--chef-border)] bg-white px-4 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="truncate font-medium text-[var(--chef-ink)]">
            {row.nom_complet || row.email}
          </p>
          <p className="truncate text-sm text-[var(--chef-muted)]">{row.email}</p>
        </div>
        {row.etape_courante_titre ? (
          <Badge
            variant="secondary"
            className="w-fit shrink-0 border-0 bg-[var(--chef-primary)]/10 text-[var(--chef-primary)]"
          >
            {row.etape_courante_titre}
          </Badge>
        ) : null}
      </div>

      {progressions.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--chef-muted)]">Aucune progression enregistrée.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {progressions.map((prog) => (
            <li
              key={prog.id}
              className="flex flex-col gap-2 rounded-xl border border-[var(--chef-border)]/80 bg-[#fafafa] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--chef-ink)]">
                  {prog.stage_titre || `Étape ${prog.stage}`}
                </p>
                {prog.nb_total > 0 ? (
                  <p className="text-xs text-[var(--chef-muted)]">
                    {prog.nb_reussies}/{prog.nb_total} bonnes réponses
                  </p>
                ) : null}
              </div>
              <Badge
                variant="secondary"
                className={cn('w-fit shrink-0 border-0', statutTone(prog.statut))}
              >
                {STATUT_LABEL[prog.statut] || prog.statut}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

export default function CgFormations() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    fetchCGFormations()
      .then((data) => {
        if (!cancelled) setRows(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Chargement impossible.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Formations</h1>
        <p className="mt-2 text-sm text-[var(--chef-muted)]">
          Progression des jeunes actifs du groupe sur les étapes Route.
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border border-[#ff3131]/30 bg-[#ff3131]/5 px-4 py-3 text-sm text-[#ff3131]">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--chef-muted)]">Chargement…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-[var(--chef-border)] bg-white px-5 py-8 text-center text-sm text-[var(--chef-muted)]">
          Aucun jeune actif avec progression pour le moment.
        </div>
      ) : (
        <>
          <p className="text-sm text-[var(--chef-muted)]">
            {rows.length} jeune{rows.length > 1 ? 's' : ''} actif{rows.length > 1 ? 's' : ''}
          </p>
          <Separator className="bg-[var(--chef-border)]" />
          <ul className="space-y-4">
            {rows.map((row) => (
              <JeuneFormationCard key={row.jeune_id} row={row} />
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
