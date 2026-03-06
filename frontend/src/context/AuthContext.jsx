import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getMe, logout as apiLogout } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getMe()
      .then((res) => {
        const data = res.data
        setUser(data.authenticated ? data.user : null)
      })
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(() => {
    window.location.href = '/api/auth/login'
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiLogout()
    } catch {
      // ignore errors – clear state regardless
    }
    setUser(null)
  }, [])

  const value = {
    user,
    isLoading,
    isAuthenticated: Boolean(user),
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
