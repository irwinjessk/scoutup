import { useRef } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Home,
  LogOut,
  Route,
  Trophy,
  UserRound,
} from 'lucide-react'

import logoScoutUp from '@/assets/brand/logo-scoutup.png'
import FoulardIndicator from '@/components/FoulardIndicator'
import { PageMotion } from '@/components/layout/PageMotion'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/context/AuthContext'
import { gsap, useGSAP } from '@/lib/gsap'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/jeune', label: 'Accueil', icon: Home, end: true },
  { to: '/jeune/formation', label: 'Formation', icon: BookOpen },
  { to: '/jeune/quiz', label: 'Quiz', icon: Trophy },
  { to: '/jeune/genie-route', label: 'Génie', icon: Route },
  { to: '/jeune/compte', label: 'Compte', icon: UserRound },
]

function initials(user) {
  const a = (user?.prenoms || user?.first_name || '').trim()[0] || ''
  const b = (user?.nom || user?.last_name || '').trim()[0] || ''
  return (a + b).toUpperCase() || (user?.email?.[0] || 'J').toUpperCase()
}

export default function JeuneLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const headerRef = useRef(null)
  const navRef = useRef(null)

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
    if (headerRef.current) {
      tl.from(headerRef.current, { opacity: 0, y: -12, duration: 0.4 })
    }
    if (navRef.current) {
      tl.from(
        navRef.current.querySelectorAll('[data-nav-item]'),
        { opacity: 0, y: 16, stagger: 0.06, duration: 0.35 },
        '-=0.15',
      )
    }
  }, [])

  async function onLogout() {
    await logout()
    navigate('/connexion', { replace: true })
  }

  return (
    <div className="jeune-shell relative flex min-h-svh flex-col bg-[#0d1117] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,115,230,0.16),_transparent_50%),radial-gradient(ellipse_at_bottom,_rgba(255,49,49,0.1),_transparent_45%)]"
      />

      <header
        ref={headerRef}
        className="relative z-10 flex items-center justify-between gap-3 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
      >
        <div className="flex items-center gap-3">
          <img src={logoScoutUp} alt="ScoutUp" className="h-9 w-auto" />
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight">ScoutUp</p>
            <p className="text-xs text-white/45">Espace jeune</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <FoulardIndicator />
          <Avatar size="sm" className="border border-white/10 bg-white/10">
            <AvatarFallback className="bg-transparent text-[10px] text-white">
              {initials(user)}
            </AvatarFallback>
          </Avatar>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onLogout}
            className="text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Se déconnecter"
          >
            <LogOut />
          </Button>
        </div>
      </header>

      <Separator className="relative z-10 bg-white/10" />

      <main className="relative z-10 flex-1 overflow-y-auto px-4 py-5 pb-28">
        <PageMotion>
          <Outlet />
        </PageMotion>
      </main>

      <nav
        ref={navRef}
        className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#0d1117]/95 backdrop-blur-md"
        aria-label="Navigation jeune"
      >
        <ul className="mx-auto flex max-w-lg items-stretch justify-between gap-1 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <li key={to} data-nav-item className="min-w-0 flex-1">
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium transition',
                    isActive
                      ? 'bg-[#0073e6]/20 text-[#7eb6ff]'
                      : 'text-white/45 hover:bg-white/5 hover:text-white/80',
                  )
                }
              >
                <Icon className="size-5" strokeWidth={1.75} />
                <span className="truncate">{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
