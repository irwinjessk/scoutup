import { createContext, useCallback, useContext, useMemo, useState } from 'react'

import {
  fetchMe,
  loginRequest,
  logoutRequest,
  registerRequest,
} from '@/api/auth'
import { clearAuth, getRefreshToken, loadAuth, saveAuth } from '@/stores/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const initial = loadAuth()
  const [user, setUser] = useState(initial.user)
  const [tokens, setTokens] = useState(initial.tokens)
  const [bootstrapping, setBootstrapping] = useState(Boolean(initial.tokens?.access))

  const persist = useCallback((nextUser, nextTokens) => {
    setUser(nextUser)
    setTokens(nextTokens)
    if (nextUser || nextTokens) {
      saveAuth({ user: nextUser, tokens: nextTokens })
    } else {
      clearAuth()
    }
  }, [])

  const login = useCallback(
    async ({ email, password }) => {
      const data = await loginRequest({ email, password })
      persist(data.user, data.tokens)
      return data.user
    },
    [persist],
  )

  const acceptSession = useCallback(
    (nextUser, nextTokens) => {
      persist(nextUser, nextTokens)
      return nextUser
    },
    [persist],
  )

  const register = useCallback(async (payload) => {
    return registerRequest(payload)
  }, [])

  const logout = useCallback(async () => {
    const refresh = getRefreshToken()
    try {
      if (refresh) await logoutRequest(refresh)
    } catch {
      // On déconnecte localement même si l'API échoue
    }
    persist(null, null)
  }, [persist])

  const refreshUser = useCallback(async () => {
    if (!tokens?.access) {
      setBootstrapping(false)
      return null
    }
    try {
      const me = await fetchMe()
      persist(me, tokens)
      return me
    } catch {
      persist(null, null)
      return null
    } finally {
      setBootstrapping(false)
    }
  }, [persist, tokens])

  const value = useMemo(
    () => ({
      user,
      tokens,
      isAuthenticated: Boolean(user && tokens?.access),
      bootstrapping,
      login,
      acceptSession,
      register,
      logout,
      refreshUser,
      setBootstrapping,
    }),
    [user, tokens, bootstrapping, login, acceptSession, register, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth doit être utilisé dans AuthProvider')
  }
  return ctx
}
