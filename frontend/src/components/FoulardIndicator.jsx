import { useEffect, useState } from 'react'

import foulardImg from '@/assets/foulard.png'
import { fetchFoulard } from '@/api/formation'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

const NB_FOULARDS = 3
const RATIO_FOULARD = '238 / 389'
const OPACITE_MOITIE_PERDUE = 0.3

// Un fond dupliqué et zoomé x2 horizontalement : positionné à gauche, il ne montre
// que la moitié gauche du dessin ; à droite, que la moitié droite.
const styleFond = {
  backgroundImage: `url(${foulardImg})`,
  backgroundSize: '200% 100%',
  backgroundRepeat: 'no-repeat',
}

/**
 * Affiche les 3 foulards, chacun coupé en une moitié gauche et une moitié droite.
 * À la 1ère mauvaise réponse sur un foulard, sa moitié gauche passe à 30 % d'opacité ;
 * à la 2e, sa moitié droite aussi (RF-51) — chaque moitié garde son opacité propre,
 * jamais un fondu uniforme sur tout le foulard, et jamais de disparition totale (0 %).
 * Synchronise périodiquement pour la récupération +15 min (RF-52).
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

  const moitiesPerdues = local?.moities_perdues ?? 0
  const restantes = local?.moities_restantes ?? NB_FOULARDS * 2

  return (
    <div
      className={cn('flex items-center gap-1', className)}
      title={`${restantes}/6 moitiés · ${local?.foulards_restants ?? NB_FOULARDS} foulards`}
      aria-label={`Foulard : ${restantes} moitiés restantes`}
    >
      {Array.from({ length: NB_FOULARDS }, (_, i) => {
        const perduesPourCeFoulard = Math.min(2, Math.max(0, moitiesPerdues - i * 2))
        const gauchePerdue = perduesPourCeFoulard >= 1
        const droitePerdue = perduesPourCeFoulard >= 2

        return (
          <div key={i} className="relative h-11" style={{ aspectRatio: RATIO_FOULARD }} aria-hidden>
            <div
              className="absolute inset-y-0 left-0 w-1/2 transition-opacity duration-700 ease-out"
              style={{
                ...styleFond,
                backgroundPosition: 'left',
                opacity: gauchePerdue ? OPACITE_MOITIE_PERDUE : 1,
              }}
            />
            <div
              className="absolute inset-y-0 right-0 w-1/2 transition-opacity duration-700 ease-out"
              style={{
                ...styleFond,
                backgroundPosition: 'right',
                opacity: droitePerdue ? OPACITE_MOITIE_PERDUE : 1,
              }}
            />
          </div>
        )
      })}
    </div>
  )
}
