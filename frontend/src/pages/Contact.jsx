import { Link } from 'react-router-dom'

import logoScoutUp from '@/assets/brand/logo-scoutup.png'

export default function Contact() {
  return (
    <main className="min-h-svh bg-[#0d1117] text-white">
      <div className="mx-auto w-full max-w-lg px-6 py-8">
        <Link to="/" className="inline-flex items-center gap-3">
          <img src={logoScoutUp} alt="ScoutUp" className="h-10 w-auto" />
        </Link>

        <h1 className="mt-10 text-3xl font-bold tracking-tight">Contact</h1>
        <p className="mt-3 text-white/65">
          Pour toute question sur ScoutUp, écris à ton chef d&apos;unité ou au
          porteur du projet.
        </p>

        <div className="mt-8 space-y-3 text-sm text-white/80">
          <p>
            Email :{' '}
            <a
              className="text-[#0073e6] underline-offset-2 hover:underline"
              href="mailto:irwinjessk@gmail.com"
            >
              irwinjessk@gmail.com
            </a>
          </p>
          <p>Communauté Félix Houphouët-Boigny · Groupe MAMA</p>
        </div>

        <Link
          to="/"
          className="mt-10 inline-flex h-11 items-center justify-center rounded-xl border border-white/15 px-5 text-sm font-medium transition hover:bg-white/5"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  )
}
