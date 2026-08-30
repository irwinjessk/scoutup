import { useEffect, useState } from 'react'

import { fetchCcPresences } from '@/api/evaluations'
import { ApiError } from '@/api/client'
import { Separator } from '@/components/ui/separator'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export default function CcPresences() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    fetchCcPresences()
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

  const moyenne = rows.length
    ? Math.round(rows.reduce((sum, r) => sum + r.taux, 0) / rows.length)
    : 0

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Présences aux réunions</h1>
        <p className="mt-2 text-sm text-[var(--chef-muted)]">
          Générées automatiquement par les évaluations surveillées — fini le cahier de présence.
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
          Aucune réunion clôturée pour le moment.
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--chef-border)] bg-white px-4 py-3">
              <p className="text-xs text-[var(--chef-muted)]">Présence moyenne</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--chef-ink)]">{moyenne}%</p>
            </div>
            <div className="rounded-2xl border border-[var(--chef-border)] bg-white px-4 py-3">
              <p className="text-xs text-[var(--chef-muted)]">Réunions évaluées</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--chef-ink)]">{rows.length}</p>
            </div>
          </div>

          <Separator className="bg-[var(--chef-border)]" />

          <div className="overflow-x-auto rounded-2xl border border-[var(--chef-border)] bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--chef-border)] text-xs uppercase tracking-wide text-[var(--chef-muted)]">
                  <th className="px-4 py-3 font-medium">Réunion</th>
                  <th className="px-4 py-3 font-medium">Évaluation associée</th>
                  <th className="px-4 py-3 font-medium">Présents</th>
                  <th className="px-4 py-3 font-medium">Taux</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--chef-border)]">
                {rows.map((row) => (
                  <tr key={row.evaluation_id}>
                    <td className="px-4 py-3 capitalize text-[var(--chef-ink)]">
                      {formatDate(row.date)}
                    </td>
                    <td className="px-4 py-3 text-[var(--chef-ink)]">{row.titre}</td>
                    <td className="px-4 py-3 text-[var(--chef-muted)]">
                      {row.presents}/{row.total}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-[var(--chef-primary)]"
                            style={{ width: `${Math.min(100, row.taux)}%` }}
                          />
                        </div>
                        <span className="text-xs text-[var(--chef-muted)]">{row.taux}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
