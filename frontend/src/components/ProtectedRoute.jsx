import { Navigate, Outlet } from 'react-router-dom'

import { useAuth } from '@/context/AuthContext'
import { homeForRole, isPendingStatus } from '@/lib/authRoutes'

/**
 * Protège une zone : session requise, statut validé, rôle autorisé.
 * @param {{ roles?: string[] }} props
 */
export function ProtectedRoute({ roles }) {
  const { user, isAuthenticated, bootstrapping } = useAuth()

  if (bootstrapping) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[#0d1117] text-sm text-white/60">
        Chargement…
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/connexion" replace />
  }

  if (isPendingStatus(user.status || user.statut)) {
    return <Navigate to="/attente-validation" replace />
  }

  if (roles?.length && !roles.includes(user.role)) {
    return <Navigate to={homeForRole(user.role)} replace />
  }

  return <Outlet />
}

/** Redirige un utilisateur déjà connecté hors des pages publiques auth. */
export function GuestRoute() {
  const { user, isAuthenticated, bootstrapping } = useAuth()

  if (bootstrapping) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[#0d1117] text-sm text-white/60">
        Chargement…
      </div>
    )
  }

  if (isAuthenticated && user) {
    if (isPendingStatus(user.status || user.statut)) {
      return <Navigate to="/attente-validation" replace />
    }
    return <Navigate to={homeForRole(user.role)} replace />
  }

  return <Outlet />
}
