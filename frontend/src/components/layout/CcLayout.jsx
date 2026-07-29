import {
  BookOpen,
  ClipboardCheck,
  LayoutDashboard,
  Route,
  Users,
  CalendarCheck,
} from 'lucide-react'

import ChefLayout from '@/components/layout/ChefLayout'

const ITEMS = [
  { to: '/cc', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/cc/jeunes', label: 'Jeunes', icon: Users },
  { to: '/cc/formation', label: 'Formation', icon: BookOpen },
  { to: '/cc/evaluations', label: 'Évaluations', icon: ClipboardCheck },
  { to: '/cc/genie-route', label: 'Génie Route', icon: Route },
  { to: '/cc/presences', label: 'Présences', icon: CalendarCheck },
]

export default function CcLayout() {
  return <ChefLayout variant="cc" title="Chef de communauté" items={ITEMS} />
}
