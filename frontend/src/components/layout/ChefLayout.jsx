import { useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut, Menu, PanelLeft } from 'lucide-react'

import logoScoutUp from '@/assets/brand/logo-scoutup.png'
import { PageMotion } from '@/components/layout/PageMotion'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useAuth } from '@/context/AuthContext'
import { gsap, useGSAP } from '@/lib/gsap'
import { cn } from '@/lib/utils'

function initials(user) {
  const a = (user?.prenoms || user?.first_name || '').trim()[0] || ''
  const b = (user?.nom || user?.last_name || '').trim()[0] || ''
  return (a + b).toUpperCase() || (user?.email?.[0] || 'C').toUpperCase()
}

function displayName(user) {
  const name = [user?.prenoms || user?.first_name, user?.nom || user?.last_name]
    .filter(Boolean)
    .join(' ')
  return name || user?.email || 'Compte'
}

function NavItems({ items, onNavigate, className }) {
  return (
    <nav className={cn('flex flex-col gap-1 p-3', className)} aria-label="Menu">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          data-nav-item
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
              isActive
                ? 'bg-[var(--chef-accent)] text-white shadow-sm'
                : 'text-[var(--chef-muted)] hover:bg-[var(--chef-accent)]/10 hover:text-[var(--chef-ink)]',
            )
          }
        >
          <Icon className="size-4 shrink-0" strokeWidth={1.75} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

/**
 * Layout clair avec menu latéral (CC rouge/bleu, CG violet/bleu).
 * @param {{ variant: 'cc' | 'cg', title: string, items: Array }} props
 */
export default function ChefLayout({ variant, title, items }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const shellRef = useRef(null)
  const sidebarRef = useRef(null)

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
    if (sidebarRef.current) {
      tl.from(sidebarRef.current, { x: -24, opacity: 0, duration: 0.45 })
      tl.from(
        sidebarRef.current.querySelectorAll('[data-nav-item]'),
        { opacity: 0, x: -10, stagger: 0.05, duration: 0.3 },
        '-=0.2',
      )
    }
    if (shellRef.current) {
      tl.from(
        shellRef.current.querySelector('[data-chef-header]'),
        { opacity: 0, y: -8, duration: 0.35 },
        '-=0.25',
      )
    }
  }, [])

  async function onLogout() {
    await logout()
    navigate('/connexion', { replace: true })
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-4 py-5">
        <img src={logoScoutUp} alt="ScoutUp" className="h-9 w-auto" />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold text-[var(--chef-ink)]">
            ScoutUp
          </p>
          <Badge
            variant="secondary"
            className="mt-1 border-0 bg-[var(--chef-primary)]/12 text-[10px] text-[var(--chef-primary)]"
          >
            {title}
          </Badge>
        </div>
      </div>
      <Separator className="bg-[var(--chef-border)]" />
      <ScrollArea className="flex-1">
        <NavItems items={items} onNavigate={() => setOpen(false)} />
      </ScrollArea>
      <Separator className="bg-[var(--chef-border)]" />
      <div className="flex items-center gap-3 p-4">
        <Avatar className="border border-[var(--chef-border)] bg-[var(--chef-primary)]/10">
          <AvatarFallback className="bg-transparent text-xs text-[var(--chef-primary)]">
            {initials(user)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[var(--chef-ink)]">
            {displayName(user)}
          </p>
          <p className="truncate text-xs text-[var(--chef-muted)]">
            {user?.email}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onLogout}
          aria-label="Se déconnecter"
          className="text-[var(--chef-muted)]"
        >
          <LogOut />
        </Button>
      </div>
    </div>
  )

  return (
    <div
      ref={shellRef}
      data-chef-theme={variant}
      className="chef-shell flex min-h-svh bg-[var(--chef-bg)] text-[var(--chef-ink)]"
    >
      <aside
        ref={sidebarRef}
        className="hidden w-64 shrink-0 border-r border-[var(--chef-border)] bg-[var(--chef-sidebar)] lg:flex lg:flex-col"
      >
        {sidebar}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          data-chef-header
          className="flex items-center justify-between gap-3 border-b border-[var(--chef-border)] bg-[var(--chef-sidebar)]/80 px-4 py-3 backdrop-blur-sm lg:px-6"
        >
          <div className="flex items-center gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="lg:hidden"
                    aria-label="Ouvrir le menu"
                  />
                }
              >
                <Menu />
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[min(100%,18rem)] border-[var(--chef-border)] bg-[var(--chef-sidebar)] p-0"
                showCloseButton
              >
                <SheetHeader className="sr-only">
                  <SheetTitle>Menu {title}</SheetTitle>
                </SheetHeader>
                {sidebar}
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2 text-sm font-medium">
              <PanelLeft className="hidden size-4 text-[var(--chef-primary)] lg:block" />
              <span>{title}</span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onLogout}
            className="gap-1.5"
          >
            <LogOut className="size-3.5" />
            Déconnexion
          </Button>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
          <PageMotion>
            <Outlet />
          </PageMotion>
        </main>
      </div>
    </div>
  )
}
