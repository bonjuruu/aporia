import { useState, useEffect, useCallback } from 'react'
import { login as apiLogin, register as apiRegister, fetchMe } from '../api/client'
import type { AuthUser } from '../types'

function hasToken(): boolean {
  return !!localStorage.getItem('aporia_token')
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fetchCount, setFetchCount] = useState(0)
  // Start unsettled (-1) if there's a token to verify; settled (0) if no token
  const [settledCount, setSettledCount] = useState(hasToken() ? -1 : 0)

  useEffect(() => {
    if (!hasToken()) return
    let cancelled = false
    fetchMe()
      .then(me => { if (!cancelled) { setUser(me); setError(null) } })
      .catch(fetchMeErr => {
        if (!cancelled) {
          // 401s are handled by the request() helper which clears the token.
          // Non-401 errors (network, 500) should surface so the user can retry.
          if (hasToken()) {
            setError(fetchMeErr instanceof Error ? fetchMeErr.message : 'Failed to verify session')
          }
        }
      })
      .finally(() => { if (!cancelled) setSettledCount(fetchCount) })
    return () => { cancelled = true }
  }, [fetchCount])

  const loading = hasToken() && settledCount !== fetchCount

  const retry = useCallback(() => {
    setError(null)
    setFetchCount(c => c + 1)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { token } = await apiLogin(email, password)
    localStorage.setItem('aporia_token', token)
    try {
      const me = await fetchMe()
      setUser(me)
    } catch (fetchMeErr) {
      localStorage.removeItem('aporia_token')
      throw fetchMeErr
    }
  }, [])

  const registerUser = useCallback(async (email: string, password: string) => {
    const { token } = await apiRegister(email, password)
    localStorage.setItem('aporia_token', token)
    try {
      const me = await fetchMe()
      setUser(me)
    } catch (fetchMeErr) {
      localStorage.removeItem('aporia_token')
      throw fetchMeErr
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('aporia_token')
    setUser(null)
  }, [])

  return { user, loading, error, login, register: registerUser, logout, retry }
}
