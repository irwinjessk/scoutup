import { useEffect, useState } from 'react'

import { fetchFoulard } from '@/api/formation'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

const MAX = 6

/**
 * Affiche les 6 moitiés de foulard (pleines / perdues).
 * Synchronise périodiquement pour la récupération +15 min.
 */
export default function FoulardIndicator({ className }) {
  const { user, patchUser } = useAuth()
  const [local, setLocal] = useState(user?.foulard ?? null)

  useEffect(() => {
    setLocal(user?.foulard ?? null)
  }, [user?.foulard])

  useEffect(() => {
    let cancelled = false

    async function sync() {
      try {
        const data = await fetchFoulard()
        if (cancelled) return
        setLocal(data)
        patchUser({ foulard: data })
      } catch {
        /* silencieux en header */
      }
    }

    sync()
    const id = window.setInterval(sync, 30_000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [patchUser])

  const restantes = local?.moities_restantes ?? MAX
  const lost = Math.max(0, Math.min(MAX, MAX - restantes))

  return (
    <div
      className={cn('flex items-center gap-1.5', className)}
      title={`${restantes}/6 moitiés · ${local?.foulards_restants ?? 3} foulards`}
      aria-label={`Foulard : ${restantes} moitiés restantes`}
    >
      <div className="flex gap-0.5" aria-hidden>
        {Array.from({ length: MAX }, (_, i) => {
          const filled = i < restantes
          return (
            <span
              key={i}
              className={cn(
                'h-3 w-1.5 rounded-sm transition-colors duration-300',
                filled ? 'bg-[#e8b923]' : 'bg-white/15',
              )}
            />
          )
        })}
      </div>
      <span className="text-[10px] font-medium tabular-nums text-white/55">
        {restantes}
        {lost > 0 ? ` · −${lost}` : ''}
      </span>
    </div>
  )
}
