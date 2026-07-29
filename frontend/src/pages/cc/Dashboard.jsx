import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { fetchPendingJeunes } from '@/api/cc'
import { Badge } from '@/components/ui/badge'

function asList(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.results)) return data.results
  return []
}

export default function CcDashboard() {
  const [pendingCount, setPendingCount] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchPendingJeunes()
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
    </div>
  )
}
