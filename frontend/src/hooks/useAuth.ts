import { useState, useEffect, useCallback } from 'react'
import { login as apiLogin, register as apiRegister, logout as apiLogout, fetchMe, UnauthorizedError } from '../api/client'
import type { AuthUser } from '../types'

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fetchCount, setFetchCount] = useState(0)
  // Always start unsettled — we need to call /auth/me to check if the cookie is valid
  const [settledCount, setSettledCount] = useState(-1)

  useEffect(() => {
    const controller = new AbortController()
    fetchMe(controller.signal)
      .then(me => { if (!controller.signal.aborted) { setUser(me); setError(null) } })
      .catch(fetchMeErr => {
        if (controller.signal.aborted) return
        // 401 means no valid cookie — not an error, just not logged in
        if (fetchMeErr instanceof UnauthorizedError) {
          setUser(null)
        } else {
          setError(fetchMeErr instanceof Error ? fetchMeErr.message : 'Failed to verify session')
        }
      })
      .finally(() => { if (!controller.signal.aborted) setSettledCount(fetchCount) })
    return () => controller.abort()
  }, [fetchCount])

  const loading = settledCount !== fetchCount

  const retry = useCallback(() => {
    setError(null)
    setFetchCount(c => c + 1)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    await apiLogin(email, password)
    // Cookie is now set by the server — trigger fetchMe to pick up user data
    setFetchCount(c => c + 1)
  }, [])

  const registerUser = useCallback(async (email: string, password: string) => {
    await apiRegister(email, password)
    setFetchCount(c => c + 1)
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiLogout()
    } catch {
      // Best-effort — clear local state even if the server call fails
    }
    setUser(null)
    setError(null)
  }, [])

  // Listen for 401 events from the API client so we stay in the React tree
  useEffect(() => {
    const handleUnauthorized = () => { setUser(null) }
    window.addEventListener('aporia:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('aporia:unauthorized', handleUnauthorized)
  }, [])

  return { user, loading, error, login, register: registerUser, logout, retry }
}
