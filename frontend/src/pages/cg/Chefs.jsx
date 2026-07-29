import { useEffect, useState } from 'react'

import { acceptCC, fetchActiveCCs, fetchPendingCCs, rejectCC } from '@/api/cg'
import { ApiError } from '@/api/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

function asList(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.results)) return data.results
  return []
}

function ChefRow({ chef, pending, onAccept, onReject, busyId }) {
  const busy = busyId === chef.id
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-[var(--chef-border)] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate font-medium text-[var(--chef-ink)]">
          {chef.nom_complet || `${chef.prenoms || ''} ${chef.nom || ''}`.trim() || chef.email}
        </p>
        <p className="truncate text-sm text-[var(--chef-muted)]">{chef.email}</p>
      </div>
      {pending ? (
        <div className="flex shrink-0 gap-2">
          <Button
            size="sm"
            disabled={busy}
            onClick={() => onAccept(chef.id)}
            className="bg-[var(--chef-primary)] text-white hover:bg-[var(--chef-primary)]/90"
          >
            {busy ? '…' : 'Accepter'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => onReject(chef.id)}
            className="border-[#ff3131]/40 text-[#ff3131] hover:bg-[#ff3131]/10"
          >
            Refuser
          </Button>
        </div>
      ) : (
        <Badge
          variant="secondary"
          className="w-fit border-0 bg-[var(--chef-accent)]/12 text-[var(--chef-accent)]"
        >
          Actif
        </Badge>
      )}
    </li>
  )
}

export default function CgChefs() {
  const [pending, setPending] = useState([])
  const [actifs, setActifs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  async function load() {
    setError('')
    setLoading(true)
    try {
      const [p, a] = await Promise.all([fetchPendingCCs(), fetchActiveCCs()])
      setPending(asList(p))
      setActifs(asList(a))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Chargement impossible.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function onAccept(id) {
    setBusyId(id)
    setError('')
    try {
      await acceptCC(id)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Validation impossible.')
    } finally {
      setBusyId(null)
    }
  }

  async function onReject(id) {
    setBusyId(id)
    setError('')
    try {
      await rejectCC(id)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Refus impossible.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Chefs</h1>
        <p className="mt-2 text-sm text-[var(--chef-muted)]">
          Valide les inscriptions CC de ton groupe.
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border border-[#ff3131]/25 bg-[#ff3131]/8 px-4 py-3 text-sm text-[#b42318]">
          {error}
        </p>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-wide text-[var(--chef-ink)] uppercase">
            En attente
          </h2>
          <Badge variant="secondary" className="border-0 bg-[var(--chef-accent)]/12 text-[var(--chef-accent)]">
            {pending.length}
          </Badge>
        </div>
        {loading ? (
          <p className="text-sm text-[var(--chef-muted)]">Chargement…</p>
        ) : pending.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--chef-border)] px-4 py-6 text-sm text-[var(--chef-muted)]">
            Aucune demande CC pour le moment.
          </p>
        ) : (
          <ul className="space-y-2">
            {pending.map((chef) => (
              <ChefRow
                key={chef.id}
                chef={chef}
                pending
                busyId={busyId}
                onAccept={onAccept}
                onReject={onReject}
              />
            ))}
          </ul>
        )}
      </section>

      <Separator className="bg-[var(--chef-border)]" />

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-wide text-[var(--chef-ink)] uppercase">
            CC actifs
          </h2>
          <Badge variant="secondary">{actifs.length}</Badge>
        </div>
        {loading ? (
          <p className="text-sm text-[var(--chef-muted)]">Chargement…</p>
        ) : actifs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--chef-border)] px-4 py-6 text-sm text-[var(--chef-muted)]">
            Aucun CC validé pour l’instant.
          </p>
        ) : (
          <ul className="space-y-2">
            {actifs.map((chef) => (
              <ChefRow key={chef.id} chef={chef} busyId={null} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
