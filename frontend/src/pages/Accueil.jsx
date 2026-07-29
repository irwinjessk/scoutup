import { useRef } from 'react'
import { Link } from 'react-router-dom'

import logoScoutUp from '@/assets/brand/logo-scoutup.png'
import { Button } from '@/components/ui/button'
import { gsap, useGSAP } from '@/lib/gsap'

export default function Accueil() {
  const root = useRef(null)

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
      tl.from('[data-hero-brand]', { opacity: 0, y: -12, duration: 0.45 })
        .from('[data-hero-title]', { opacity: 0, y: 18, duration: 0.5 }, '-=0.2')
        .from('[data-hero-copy]', { opacity: 0, y: 12, duration: 0.4 }, '-=0.25')
        .from(
          '[data-hero-cta]',
          { opacity: 0, y: 10, stagger: 0.08, duration: 0.35 },
          '-=0.15',
        )
    },
    { scope: root },
  )

  return (
    <main
      ref={root}
      className="relative min-h-svh overflow-hidden bg-[#0d1117] text-white"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,115,230,0.22),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(255,49,49,0.18),_transparent_45%)]"
      />

      <div className="relative mx-auto flex min-h-svh w-full max-w-lg flex-col px-6 pb-10 pt-8">
        <header
          data-hero-brand
          className="flex items-center justify-between"
        >
          <img
            src={logoScoutUp}
            alt="ScoutUp"
            className="h-12 w-auto object-contain"
          />
          <Link
            to="/contact"
            className="text-sm text-white/60 transition hover:text-white"
          >
            Contact
          </Link>
        </header>

        <section className="flex flex-1 flex-col justify-center py-12">
          <p
            data-hero-title
            className="text-sm font-medium tracking-[0.2em] text-[#0073e6] uppercase"
          >
            Branche Route
          </p>
          <h1
            data-hero-title
            className="mt-4 font-sans text-5xl leading-[1.05] font-bold tracking-tight"
          >
            <span className="text-[#dbe4ff]">Scout</span>
            <span className="text-[#ff3131]">Up</span>
          </h1>
          <p
            data-hero-copy
            className="mt-4 max-w-sm text-base leading-relaxed text-white/70"
          >
            Apprends, progresse et relève des défis — Grandir · Apprendre · Servir.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button
              data-hero-cta
              nativeButton={false}
              render={<Link to="/inscription" />}
              className="h-12 rounded-xl bg-[#0073e6] px-6 text-sm font-semibold text-white hover:bg-[#0066cc]"
            >
              S&apos;inscrire
            </Button>
            <Button
              data-hero-cta
              nativeButton={false}
              render={<Link to="/connexion" />}
              variant="outline"
              className="h-12 rounded-xl border-white/15 bg-white/5 px-6 text-sm font-semibold text-white hover:bg-white/10 hover:text-white"
            >
              Se connecter
            </Button>
          </div>
        </section>
      </div>
    </main>
  )
}
