import { Link } from 'react-router-dom'

import logoScoutUp from '@/assets/brand/logo-scoutup.png'

export default function PendingValidation() {
  return (
    <main className="min-h-svh bg-[#0d1117] text-white">
      <div className="mx-auto flex min-h-svh w-full max-w-md flex-col px-6 py-8">
        <Link to="/">
          <img src={logoScoutUp} alt="ScoutUp" className="h-10 w-auto" />
        </Link>

        <div className="flex flex-1 flex-col justify-center">
          <p className="text-sm font-medium tracking-wide text-[#ff3131] uppercase">
            Validation requise
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">
            Compte en attente
          </h1>
          <p className="mt-4 text-base leading-relaxed text-white/70">
            Ton inscription a bien été reçue. Un responsable doit encore valider
            ton compte avant que tu puisses accéder à ScoutUp.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-white/60">
            <li>• Jeune → validation par ton CC</li>
            <li>• Chef (CC) → validation par le CG</li>
          </ul>

          <div className="mt-10 flex flex-col gap-3">
            <Link
              to="/connexion"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-[#0073e6] text-sm font-semibold transition hover:bg-[#0066cc]"
            >
              Réessayer de se connecter
            </Link>
            <Link
              to="/"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-white/15 text-sm font-medium transition hover:bg-white/5"
            >
              Retour à l&apos;accueil
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
