import { useEffect, useState } from 'react'

import {
  acceptJeune,
  assignJeuneEtape,
  fetchActiveJeunes,
  fetchPendingJeunes,
  rejectJeune,
} from '@/api/cc'
import { ApiError } from '@/api/client'
import { fetchCcStages, initCcStages } from '@/api/formation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

function asList(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.results)) return data.results
  return []
}

function JeuneRow({
  jeune,
  pending,
  stages,
  onAccept,
  onReject,
  onAssignEtape,
  busyId,
}) {
  const busy = busyId === jeune.id
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-[var(--chef-border)] bg-white px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate font-medium text-[var(--chef-ink)]">
            {jeune.nom_complet ||
              `${jeune.prenoms || ''} ${jeune.nom || ''}`.trim() ||
              jeune.email}
          </p>
          <p className="truncate text-sm text-[var(--chef-muted)]">{jeune.email}</p>
          {!pending ? (
            <p className="mt-1 text-xs text-[var(--chef-muted)]">
              Étape :{' '}
              <span className="font-medium text-[var(--chef-ink)]">
                {jeune.etape_courante_titre || 'Non placé'}
              </span>
              {!jeune.etape_placee ? ' · en attente de choix' : ''}
            </p>
          ) : null}
        </div>
        {pending ? (
          <div className="flex shrink-0 gap-2">
            <Button
              size="sm"
              disabled={busy}
              onClick={() => onAccept(jeune.id)}
              className="bg-[var(--chef-primary)] text-white hover:bg-[var(--chef-primary)]/90"
            >
              {busy ? '…' : 'Accepter'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => onReject(jeune.id)}
              className="border-[#ff3131]/40 text-[#ff3131] hover:bg-[#ff3131]/10"
            >
              Refuser
            </Button>
          </div>
        ) : (
          <Badge
            variant="secondary"
            className="w-fit border-0 bg-[var(--chef-primary)]/12 text-[var(--chef-primary)]"
          >
            Actif
          </Badge>
        )}
      </div>

      {!pending && stages.length > 0 ? (
        <div className="flex flex-col gap-2 border-t border-[var(--chef-border)] pt-3 sm:flex-row sm:items-center">
          <label className="text-xs font-medium text-[var(--chef-muted)] shrink-0">
            Corriger l’étape
          </label>
          <select
            className="h-9 flex-1 rounded-lg border border-[var(--chef-border)] bg-white px-2 text-sm outline-none focus:border-[var(--chef-primary)]"
            disabled={busy}
            value={jeune.etape_courante || ''}
            onChange={(e) => {
              const value = e.target.value
              if (!value) return
              onAssignEtape(jeune.id, Number(value))
            }}
          >
            <option value="" disabled>
              Choisir une étape…
            </option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.titre}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </li>
  )
}

export default function CcJeunes() {
  const [pending, setPending] = useState([])
  const [actifs, setActifs] = useState([])
  const [stages, setStages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  async function load() {
    setError('')
    setLoading(true)
    try {
      let st = await fetchCcStages()
      if (!Array.isArray(st) || st.length === 0) {
        const init = await initCcStages()
        st = init.stages || []
      }
      const [p, a] = await Promise.all([fetchPendingJeunes(), fetchActiveJeunes()])
      setStages(Array.isArray(st) ? st : [])
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
      await acceptJeune(id)
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
      await rejectJeune(id)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Refus impossible.')
    } finally {
      setBusyId(null)
    }
  }

  async function onAssignEtape(jeuneId, etapeId) {
    setBusyId(jeuneId)
    setError('')
    try {
      await assignJeuneEtape(jeuneId, etapeId)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Correction d’étape impossible.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Jeunes</h1>
        <p className="mt-2 text-sm text-[var(--chef-muted)]">
          Valide les inscriptions et corrige l’étape de départ si besoin.
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
          <Badge
            variant="secondary"
            className="border-0 bg-[#ff3131]/12 text-[#ff3131]"
          >
            {pending.length}
          </Badge>
        </div>
        {loading ? (
          <p className="text-sm text-[var(--chef-muted)]">Chargement…</p>
        ) : pending.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--chef-border)] px-4 py-6 text-sm text-[var(--chef-muted)]">
            Aucune demande jeune pour le moment.
          </p>
        ) : (
          <ul className="space-y-2">
            {pending.map((jeune) => (
              <JeuneRow
                key={jeune.id}
                jeune={jeune}
                pending
                stages={stages}
                busyId={busyId}
                onAccept={onAccept}
                onReject={onReject}
                onAssignEtape={onAssignEtape}
              />
            ))}
          </ul>
        )}
      </section>

      <Separator className="bg-[var(--chef-border)]" />

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-wide text-[var(--chef-ink)] uppercase">
            Jeunes actifs
          </h2>
          <Badge variant="secondary">{actifs.length}</Badge>
        </div>
        {loading ? (
          <p className="text-sm text-[var(--chef-muted)]">Chargement…</p>
        ) : actifs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--chef-border)] px-4 py-6 text-sm text-[var(--chef-muted)]">
            Aucun jeune validé pour l’instant.
          </p>
        ) : (
          <ul className="space-y-2">
            {actifs.map((jeune) => (
              <JeuneRow
                key={jeune.id}
                jeune={jeune}
                stages={stages}
                busyId={busyId}
                onAssignEtape={onAssignEtape}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
