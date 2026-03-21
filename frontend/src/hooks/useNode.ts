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
    const controller = new AbortController()
    fetchNode(nodeId, controller.signal)
      .then(result => { if (!controller.signal.aborted) { setData(result); setError(null) } })
      .catch(fetchErr => {
        if (controller.signal.aborted) return
        setData(null)
        setError(fetchErr instanceof Error ? fetchErr.message : 'Failed to load node')
      })
      .finally(() => { if (!controller.signal.aborted) setSettledKey(key) })
    return () => controller.abort()
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
    // Only return the error once the latest fetch has settled
    if (settledKey !== fetchKey) return null
    return error
  }, [nodeId, error, settledKey, fetchKey])

  // Loading until the fetch for the current nodeId + fetchCount settles
  const loading = nodeId !== null && settledKey !== fetchKey

  return { data: resolvedData, loading, error: resolvedError, refetch }
}
