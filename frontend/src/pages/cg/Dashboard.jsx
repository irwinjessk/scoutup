import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { fetchPendingCCs } from '@/api/cg'
import { Badge } from '@/components/ui/badge'

function asList(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.results)) return data.results
  return []
}

export default function CgDashboard() {
  const [pendingCount, setPendingCount] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchPendingCCs()
      .then((data) => {
        if (!cancelled) setPendingCount(asList(data).length)
      })
      .catch(() => {
        if (!cancelled) setPendingCount(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

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
    </div>
  )
}
