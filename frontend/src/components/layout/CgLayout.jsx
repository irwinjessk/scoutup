import {
  BookMarked,
  BookOpen,
  ClipboardCheck,
  LayoutDashboard,
  ScrollText,
  Swords,
  UserCog,
  Users,
} from 'lucide-react'

import ChefLayout from '@/components/layout/ChefLayout'

const ITEMS = [
  { to: '/cg', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/cg/chefs', label: 'Chefs', icon: UserCog },
  { to: '/cg/jeunes', label: 'Jeunes', icon: Users },
  { to: '/cg/formations', label: 'Formations', icon: BookOpen },
  { to: '/cg/evaluations', label: 'Évaluations', icon: ClipboardCheck },
  { to: '/cg/genie-route', label: 'Génie Route', icon: Swords },
  { to: '/cg/contenus', label: 'Contenus', icon: BookMarked },
  { to: '/cg/journal', label: 'Journal', icon: ScrollText },
]

export default function CgLayout() {
  return <ChefLayout variant="cg" title="Commissaire de groupe" items={ITEMS} />
}
