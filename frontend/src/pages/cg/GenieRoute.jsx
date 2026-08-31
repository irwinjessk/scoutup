import { useEffect, useState } from 'react'
import { ChevronDown, Trophy } from 'lucide-react'

import { fetchCgCompetitions } from '@/api/competitions'
import { ApiError } from '@/api/client'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const STATUT_LABEL = {
  BROUILLON: 'Brouillon',
  OUVERTE: 'Ouverte',
  CLOTUREE: 'Clôturée',
}

function statutTone(statut) {
  if (statut === 'OUVERTE') return 'bg-[var(--chef-primary)]/12 text-[var(--chef-primary)]'
  if (statut === 'CLOTUREE') return 'bg-emerald-50 text-emerald-700'
  return 'bg-slate-100 text-slate-600'
}

function formatDate(value) {
  if (!value) return null
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function CompetitionRow({ row }) {
  const [open, setOpen] = useState(false)
  const classement = row.classement || []

  return (
    <li className="rounded-2xl border border-[var(--chef-border)] bg-white px-4 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="truncate font-medium text-[var(--chef-ink)]">{row.titre}</p>
          <p className="truncate text-sm text-[var(--chef-muted)]">
            {row.communaute}
            {row.cc_nom_complet ? ` · ${row.cc_nom_complet}` : ''}
          </p>
        </div>
        <Badge variant="secondary" className={cn('w-fit shrink-0 border-0', statutTone(row.statut))}>
          {STATUT_LABEL[row.statut] || row.statut}
        </Badge>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-[var(--chef-muted)]">
        {classement.length > 0 ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1 font-medium text-[var(--chef-primary)] hover:underline"
          >
            <Trophy className="size-3.5" />
            {row.nb_participants} / {row.nb_actifs} participant{row.nb_actifs > 1 ? 's' : ''}
            <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
          </button>
        ) : (
          <span>
            {row.nb_participants} / {row.nb_actifs} participant{row.nb_actifs > 1 ? 's' : ''}
          </span>
        )}
        {row.published_at ? <span>Publiée le {formatDate(row.published_at)}</span> : null}
        {row.closes_at ? <span>Clôture le {formatDate(row.closes_at)}</span> : null}
      </div>

      {open && classement.length > 0 ? (
        <ol className="mt-3 space-y-1.5 border-t border-[var(--chef-border)] pt-3">
          {classement.map((p) => (
            <li
              key={p.jeune_id}
              className="flex items-center justify-between rounded-lg bg-[#fafafa] px-3 py-2 text-sm"
            >
              <span className="flex items-center gap-2 text-[var(--chef-ink)]">
                <span className="w-5 shrink-0 font-semibold text-[var(--chef-muted)]">
                  {p.rang}
                </span>
                {p.nom_complet}
              </span>
              <span className="font-medium text-[var(--chef-ink)]">
                {p.score} pt{p.score > 1 ? 's' : ''}
              </span>
            </li>
          ))}
        </ol>
      ) : null}
    </li>
  )
}

export default function CgGenieRoute() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    fetchCgCompetitions()
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
        <h1 className="text-2xl font-semibold tracking-tight">Génie Route</h1>
        <p className="mt-2 text-sm text-[var(--chef-muted)]">
          Compétitions créées par les CC du groupe et leur classement.
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
          Aucune compétition créée pour le moment.
        </div>
      ) : (
        <>
          <p className="text-sm text-[var(--chef-muted)]">
            {rows.length} compétition{rows.length > 1 ? 's' : ''}
          </p>
          <Separator className="bg-[var(--chef-border)]" />
          <ul className="space-y-4">
            {rows.map((row) => (
              <CompetitionRow key={row.id} row={row} />
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
