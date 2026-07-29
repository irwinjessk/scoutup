import { useEffect } from 'react'

import { useAuth } from '@/context/AuthContext'

/**
 * Au démarrage, si un access token existe, recharge /auth/me/.
 */
export function AuthBootstrap({ children }) {
  const { tokens, refreshUser, setBootstrapping } = useAuth()

  useEffect(() => {
    if (!tokens?.access) {
      setBootstrapping(false)
      return
    }
    refreshUser()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- bootstrap une seule fois

  return children
}
