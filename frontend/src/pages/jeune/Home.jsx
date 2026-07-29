import { Link } from 'react-router-dom'
import { Award, ClipboardList } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/context/AuthContext'

export default function JeuneHome() {
  const { user } = useAuth()
  const prenom = user?.prenoms || user?.first_name || 'Routier'

  return (
    <div className="space-y-6">
      <div>
        <Badge className="border-0 bg-[#0073e6]/20 text-[#7eb6ff] hover:bg-[#0073e6]/20">
          Branche Route
        </Badge>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          Salut, {prenom}
        </h1>
        <p className="mt-1 text-sm text-white/55">
          Continue ta progression — Grandir · Apprendre · Servir.
        </p>
      </div>

      <div className="grid gap-3">
        <Link
          to="/jeune/evaluation"
          className="inline-flex h-12 items-center justify-start gap-3 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-white transition hover:bg-white/10"
        >
          <ClipboardList className="size-4 text-[#ff3131]" />
          Évaluation
        </Link>
        <Link
          to="/jeune/brevets"
          className="inline-flex h-12 items-center justify-start gap-3 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-white transition hover:bg-white/10"
        >
          <Award className="size-4 text-[#0073e6]" />
          Mes brevets
        </Link>
      </div>
    </div>
  )
}
