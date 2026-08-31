import { useEffect, useState } from 'react'

import { fetchCgEvaluations } from '@/api/evaluations'
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

function EvaluationRow({ row }) {
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

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-[var(--chef-muted)]">
        <span>
          {row.nb_participants} participant{row.nb_participants > 1 ? 's' : ''}
        </span>
        {row.published_at ? <span>Publiée le {formatDate(row.published_at)}</span> : null}
        {row.closes_at ? <span>Clôture le {formatDate(row.closes_at)}</span> : null}
      </div>
    </li>
  )
}

export default function CgEvaluations() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    fetchCgEvaluations()
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
        <h1 className="text-2xl font-semibold tracking-tight">Évaluations</h1>
        <p className="mt-2 text-sm text-[var(--chef-muted)]">
          Historique des évaluations surveillées créées par les CC du groupe.
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
          Aucune évaluation créée pour le moment.
        </div>
      ) : (
        <>
          <p className="text-sm text-[var(--chef-muted)]">
            {rows.length} évaluation{rows.length > 1 ? 's' : ''}
          </p>
          <Separator className="bg-[var(--chef-border)]" />
          <ul className="space-y-4">
            {rows.map((row) => (
              <EvaluationRow key={row.id} row={row} />
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
