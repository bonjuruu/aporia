import { useState, useEffect, useCallback, useMemo } from 'react'
import { fetchNode } from '../api/client'
import type { NodeDetail } from '../types'

export function useNode(nodeId: string | null) {
  const [data, setData] = useState<NodeDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fetchCount, setFetchCount] = useState(0)
  // Composite key tracks both nodeId and fetchCount so that changing either
  // puts us into a loading state until the corresponding fetch settles.
  const [settledKey, setSettledKey] = useState('')
  const fetchKey = `${nodeId}-${fetchCount}`

  useEffect(() => {
    if (!nodeId) return
    const key = `${nodeId}-${fetchCount}`
    let cancelled = false
    fetchNode(nodeId)
      .then(result => { if (!cancelled) { setData(result); setError(null) } })
      .catch(fetchErr => {
        if (!cancelled) {
          setData(null)
          setError(fetchErr instanceof Error ? fetchErr.message : 'Failed to load node')
        }
      })
      .finally(() => { if (!cancelled) setSettledKey(key) })
    return () => { cancelled = true }
  }, [nodeId, fetchCount])

  const refetch = useCallback(() => {
    setError(null)
    setFetchCount(c => c + 1)
  }, [])

  // Derive resolved values — don't expose stale data from a previous nodeId
  const resolvedData = useMemo(() => {
    if (!nodeId) return null
    if (data?.id === nodeId) return data
    return null
  }, [nodeId, data])

  const resolvedError = useMemo(() => {
    if (!nodeId) return null
    if (data?.id === nodeId) return null
    return error
  }, [nodeId, data, error])

  // Loading until the fetch for the current nodeId + fetchCount settles
  const loading = nodeId !== null && settledKey !== fetchKey

  return { data: resolvedData, loading, error: resolvedError, refetch }
}
