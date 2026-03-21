import { useState, useEffect, useCallback } from 'react'
import { login as apiLogin, register as apiRegister, fetchMe } from '../api/client'
import type { AuthUser } from '../types'

function hasToken(): boolean {
  return !!localStorage.getItem('aporia_token')
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(hasToken)

  useEffect(() => {
    if (!hasToken()) return
    fetchMe()
      .then(setUser)
      .catch(() => localStorage.removeItem('aporia_token'))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { token } = await apiLogin(email, password)
    localStorage.setItem('aporia_token', token)
    const me = await fetchMe()
    setUser(me)
  }, [])

  const registerUser = useCallback(async (email: string, password: string) => {
    const { token } = await apiRegister(email, password)
    localStorage.setItem('aporia_token', token)
    const me = await fetchMe()
    setUser(me)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('aporia_token')
    setUser(null)
  }, [])

  return { user, loading, login, register: registerUser, logout }
}
