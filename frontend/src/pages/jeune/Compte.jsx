import { Button } from '@/components/ui/button'
import ModuleShell from '@/components/layout/ModuleShell'
import { useAuth } from '@/context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function JeuneCompte() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function onLogout() {
    await logout()
    navigate('/connexion', { replace: true })
  }

  return (
    <div className="space-y-6">
      <ModuleShell
        title="Compte"
        hint={user?.email || 'Profil jeune'}
      />
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-white/45">Nom</dt>
          <dd className="mt-0.5 font-medium">
            {[user?.prenoms || user?.first_name, user?.nom || user?.last_name]
              .filter(Boolean)
              .join(' ') || '—'}
          </dd>
        </div>
        <div>
          <dt className="text-white/45">Rôle</dt>
          <dd className="mt-0.5 font-medium">{user?.role || 'JEUNE'}</dd>
        </div>
      </dl>
      <Button
        variant="outline"
        onClick={onLogout}
        className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
      >
        Se déconnecter
      </Button>
    </div>
  )
}
