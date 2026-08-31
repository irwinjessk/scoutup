import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Swords, Trophy } from 'lucide-react'

import { fetchCompetitionShare } from '@/api/competitions'
import { ApiError } from '@/api/client'
import logoScoutUp from '@/assets/brand/logo-scoutup.png'
import { cn } from '@/lib/utils'

const MEDAL = {
  1: { color: 'text-[#e8b923]', label: '🥇' },
  2: { color: 'text-white/70', label: '🥈' },
  3: { color: 'text-[#b08d57]', label: '🥉' },
}

export default function GenieRoutePartage() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    fetchCompetitionShare(token)
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : 'Ce lien est introuvable ou a expiré.',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <main className="min-h-svh bg-[#0d1117] text-white">
      <div className="mx-auto flex min-h-svh w-full max-w-md flex-col items-center px-6 py-10 text-center">
        <Link to="/">
          <img src={logoScoutUp} alt="ScoutUp" className="h-10 w-auto" />
        </Link>

        <div className="flex flex-1 flex-col items-center justify-center">
          {loading ? <p className="text-sm text-white/45">Chargement…</p> : null}

          {!loading && error ? (
            <div className="space-y-3">
              <p className="text-3xl">🤷</p>
              <p className="text-sm text-white/60">{error}</p>
            </div>
          ) : null}

          {!loading && data ? (
            <div className="w-full space-y-6">
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 text-[#7eb6ff]">
                  <Swords className="size-5" />
                  <p className="text-xs font-medium uppercase tracking-wider">Génie Route</p>
                </div>
                <h1 className="text-2xl font-bold tracking-tight">{data.titre}</h1>
                <p className="text-sm text-white/55">
                  {data.communaute} · {data.nb_participants} participant
                  {data.nb_participants > 1 ? 's' : ''}
                </p>
              </div>

              {data.podium.length === 0 ? (
                <p className="text-sm text-white/45">Aucun participant sur cette compétition.</p>
              ) : (
                <ul className="space-y-2.5">
                  {data.podium.map((row) => (
                    <li
                      key={row.jeune_id}
                      className={cn(
                        'flex items-center justify-between rounded-2xl border px-4 py-3.5',
                        row.rang === 1
                          ? 'border-[#e8b923]/40 bg-[#e8b923]/10'
                          : 'border-white/10 bg-white/[0.04]',
                      )}
                    >
                      <span className="flex items-center gap-3 text-left">
                        <span className="text-xl">{MEDAL[row.rang]?.label ?? row.rang}</span>
                        <span className="font-medium text-white">{row.nom_complet}</span>
                      </span>
                      <span className={cn('font-semibold', MEDAL[row.rang]?.color ?? 'text-white')}>
                        {row.score} pt{row.score > 1 ? 's' : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex items-center justify-center gap-1.5 text-xs text-white/35">
                <Trophy className="size-3.5" />
                Compétition clôturée · classement final
              </div>
            </div>
          ) : null}
        </div>

        <Link
          to="/"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl border border-white/15 px-5 text-sm font-medium transition hover:bg-white/5"
        >
          Découvrir ScoutUp
        </Link>
      </div>
    </main>
  )
}
