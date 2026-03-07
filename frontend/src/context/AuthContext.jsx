import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  getClientId,
  setClientId as saveClientId,
  getValidToken,
  startPKCELogin,
  clearToken,
  clearClientId,
} from '../lib/spotify-pkce'
import { setMarket, fetchCurrentUser } from '../lib/spotify-api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasClientId, setHasClientId] = useState(Boolean(getClientId()))

  useEffect(() => {
    if (!hasClientId) {
      setIsLoading(false)
      return
    }

    async function checkAuth() {
      const token = await getValidToken()
      if (!token) {
        setUser(null)
        setIsLoading(false)
        return
      }

      try {
        const data = await fetchCurrentUser()
        if (data.country) setMarket(data.country)
        setUser({
          id: data.id,
          display_name: data.display_name || data.id,
          email: data.email || '',
          image: data.images?.[0]?.url || null,
          country: data.country || null,
        })
      } catch {
        clearToken()
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [hasClientId])

  const login = useCallback(() => {
    startPKCELogin()
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
  }, [])

  const updateClientId = useCallback((id) => {
    saveClientId(id)
    setHasClientId(true)
  }, [])

  const resetSetup = useCallback(() => {
    clearToken()
    clearClientId()
    setUser(null)
    setHasClientId(false)
  }, [])

  const value = {
    user,
    isLoading,
    isAuthenticated: Boolean(user),
    hasClientId,
    login,
    logout,
    updateClientId,
    resetSetup,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
