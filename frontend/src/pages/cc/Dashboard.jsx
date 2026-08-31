import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, ClipboardCheck, Swords } from 'lucide-react'

import { fetchPendingJeunes } from '@/api/cc'
import { fetchCcDashboard } from '@/api/dashboard'
import { Badge } from '@/components/ui/badge'

function asList(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.results)) return data.results
  return []
}

function StatCard({ icon: Icon, title, children }) {
  return (
    <div className="rounded-2xl border border-[var(--chef-border)] bg-white px-5 py-5">
      <div className="flex items-center gap-2 text-[var(--chef-muted)]">
        <Icon className="size-4" />
        <p className="text-sm font-medium">{title}</p>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  )
}

export default function CcDashboard() {
  const [pendingCount, setPendingCount] = useState(null)
  const [stats, setStats] = useState(null)
  const [statsError, setStatsError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchPendingJeunes()
      .then((data) => {
        if (!cancelled) setPendingCount(asList(data).length)
      })
      .catch(() => {
        if (!cancelled) setPendingCount(null)
      })
    fetchCcDashboard()
      .then((data) => {
        if (!cancelled) setStats(data)
      })
      .catch(() => {
        if (!cancelled) setStatsError('Statistiques indisponibles.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const etapes = stats?.progression_par_etape || []

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tableau de bord</h1>
        <p className="mt-2 text-sm text-[var(--chef-muted)]">
          Vue d’ensemble de ta communauté.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--chef-border)] bg-white px-5 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-[var(--chef-muted)]">Jeunes en attente</p>
            <p className="mt-1 text-3xl font-semibold text-[#ff3131]">
              {pendingCount === null ? '—' : pendingCount}
            </p>
          </div>
          {pendingCount > 0 ? (
            <Badge className="border-0 bg-[#ff3131] text-white hover:bg-[#ff3131]">
              Action requise
            </Badge>
          ) : null}
        </div>
        <Link
          to="/cc/jeunes"
          className="mt-5 inline-flex h-9 items-center justify-center rounded-lg bg-[var(--chef-primary)] px-3 text-sm font-medium text-white transition hover:bg-[var(--chef-primary)]/90"
        >
          Voir les jeunes
        </Link>
      </div>

      {statsError ? (
        <p className="rounded-xl border border-[#ff3131]/30 bg-[#ff3131]/5 px-4 py-3 text-sm text-[#ff3131]">
          {statsError}
        </p>
      ) : null}

      {stats ? (
        <>
          <StatCard icon={BookOpen} title="Progression par étape">
            {etapes.length === 0 ? (
              <p className="text-sm text-[var(--chef-muted)]">Aucune étape active.</p>
            ) : (
              <ul className="space-y-2">
                {etapes.map((e) => {
                  const total = e.en_cours + e.valide + e.acquis
                  return (
                    <li key={e.stage_id} className="text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-[var(--chef-ink)]">{e.titre}</span>
                        <span className="text-[var(--chef-muted)]">
                          {e.valide + e.acquis} / {total || 0} validées
                        </span>
                      </div>
                      {total > 0 ? (
                        <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="bg-emerald-500"
                            style={{ width: `${((e.valide + e.acquis) / total) * 100}%` }}
                          />
                          <div
                            className="bg-[var(--chef-primary)]/50"
                            style={{ width: `${(e.en_cours / total) * 100}%` }}
                          />
                        </div>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            )}
          </StatCard>

          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard icon={ClipboardCheck} title="Évaluations surveillées">
              <p className="text-2xl font-semibold text-[var(--chef-ink)]">
                {stats.evaluations.nb_realisees}
              </p>
              <p className="text-xs text-[var(--chef-muted)]">évaluation(s) clôturée(s)</p>
              <div className="mt-3 space-y-1 text-sm text-[var(--chef-muted)]">
                <p>
                  Présence moyenne :{' '}
                  <span className="font-medium text-[var(--chef-ink)]">
                    {stats.evaluations.taux_presence_moyen != null
                      ? `${stats.evaluations.taux_presence_moyen}%`
                      : '—'}
                  </span>
                </p>
                <p>
                  Note moyenne :{' '}
                  <span className="font-medium text-[var(--chef-ink)]">
                    {stats.evaluations.moyenne_notes != null
                      ? `${stats.evaluations.moyenne_notes}%`
                      : '—'}
                  </span>
                </p>
              </div>
            </StatCard>

            <StatCard icon={Swords} title="Génie Route">
              <p className="text-2xl font-semibold text-[var(--chef-ink)]">
                {stats.competitions.nb_realisees}
              </p>
              <p className="text-xs text-[var(--chef-muted)]">compétition(s) clôturée(s)</p>
              <p className="mt-3 text-sm text-[var(--chef-muted)]">
                Participations totales :{' '}
                <span className="font-medium text-[var(--chef-ink)]">
                  {stats.competitions.nb_participations}
                </span>
              </p>
            </StatCard>
          </div>
        </>
      ) : null}
    </div>
  )
}
