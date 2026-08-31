import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookMarked, ClipboardCheck, UserCog, Users } from 'lucide-react'

import { fetchPendingCCs } from '@/api/cg'
import { fetchCgDashboard } from '@/api/dashboard'
import { Badge } from '@/components/ui/badge'
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

export default function CgDashboard() {
  const [pendingCount, setPendingCount] = useState(null)
  const [stats, setStats] = useState(null)
  const [statsError, setStatsError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchPendingCCs()
      .then((data) => {
        if (!cancelled) setPendingCount(asList(data).length)
      })
      .catch(() => {
        if (!cancelled) setPendingCount(null)
      })
    fetchCgDashboard()
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

  const jeunes = stats?.jeunes
  const jeunesTotal = jeunes ? jeunes.en_cours + jeunes.valide + jeunes.acquis : 0

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tableau de bord</h1>
        <p className="mt-2 text-sm text-[var(--chef-muted)]">
          Pilotage du groupe et validations CC.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--chef-border)] bg-white px-5 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-[var(--chef-muted)]">CC en attente</p>
            <p className="mt-1 text-3xl font-semibold text-[var(--chef-accent)]">
              {pendingCount === null ? '—' : pendingCount}
            </p>
          </div>
          {pendingCount > 0 ? (
            <Badge className="border-0 bg-[var(--chef-accent)] text-white hover:bg-[var(--chef-accent)]">
              Action requise
            </Badge>
          ) : null}
        </div>
        <Link
          to="/cg/chefs"
          className="mt-5 inline-flex h-9 items-center justify-center rounded-lg bg-[var(--chef-primary)] px-3 text-sm font-medium text-white transition hover:bg-[var(--chef-primary)]/90"
        >
          Voir les chefs
        </Link>
      </div>

      {statsError ? (
        <p className="rounded-xl border border-[#ff3131]/30 bg-[#ff3131]/5 px-4 py-3 text-sm text-[#ff3131]">
          {statsError}
        </p>
      ) : null}

      {stats ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard icon={UserCog} title="Chefs de communauté actifs">
              <p className="text-2xl font-semibold text-[var(--chef-ink)]">
                {stats.chefs_actifs}
              </p>
              {stats.chefs_en_attente > 0 ? (
                <p className="mt-1 text-xs text-[#ff3131]">
                  {stats.chefs_en_attente} en attente de validation
                </p>
              ) : null}
            </StatCard>

            <StatCard icon={Users} title="Évolution des jeunes">
              <p className="text-2xl font-semibold text-[var(--chef-ink)]">
                {jeunes?.nb_actifs ?? 0}
              </p>
              <p className="text-xs text-[var(--chef-muted)]">jeunes actifs dans le groupe</p>
              {jeunesTotal > 0 ? (
                <p className="mt-2 text-sm text-[var(--chef-muted)]">
                  {jeunes.valide + jeunes.acquis} / {jeunesTotal} étapes validées
                </p>
              ) : null}
            </StatCard>
          </div>

          <StatCard icon={BookMarked} title="Contenus créés dans le groupe">
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xl font-semibold text-[var(--chef-ink)]">
                  {stats.contenus.nb_etapes}
                </p>
                <p className="text-xs text-[var(--chef-muted)]">étapes</p>
              </div>
              <div>
                <p className="text-xl font-semibold text-[var(--chef-ink)]">
                  {stats.contenus.nb_questions_formation}
                </p>
                <p className="text-xs text-[var(--chef-muted)]">questions formation</p>
              </div>
              <div>
                <p className="text-xl font-semibold text-[var(--chef-ink)]">
                  {stats.contenus.nb_evaluations}
                </p>
                <p className="text-xs text-[var(--chef-muted)]">évaluations</p>
              </div>
              <div>
                <p className="text-xl font-semibold text-[var(--chef-ink)]">
                  {stats.contenus.nb_competitions}
                </p>
                <p className="text-xs text-[var(--chef-muted)]">compétitions</p>
              </div>
            </div>
          </StatCard>

          <StatCard icon={ClipboardCheck} title="Historique des évaluations récentes">
            {stats.evaluations_recentes.length === 0 ? (
              <p className="text-sm text-[var(--chef-muted)]">Aucune évaluation pour le moment.</p>
            ) : (
              <ul className="space-y-2">
                {stats.evaluations_recentes.map((ev) => (
                  <li key={ev.id} className="flex items-center justify-between text-sm">
                    <span className="text-[var(--chef-ink)]">
                      {ev.titre} <span className="text-[var(--chef-muted)]">· {ev.communaute}</span>
                    </span>
                    <Badge variant="secondary" className={cn('border-0', statutTone(ev.statut))}>
                      {STATUT_LABEL[ev.statut] || ev.statut}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            <Link
              to="/cg/evaluations"
              className="mt-3 inline-block text-sm font-medium text-[var(--chef-primary)] hover:underline"
            >
              Voir tout l'historique
            </Link>
          </StatCard>
        </>
      ) : null}
    </div>
  )
}
