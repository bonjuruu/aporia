import { useState, useCallback, useRef } from 'react'
import { fetchPath } from '../api/client'
import type { GraphData, SearchResult } from '../types'

interface UsePathResult {
  pathData: GraphData | null
  fromId: string | null
  loading: boolean
  error: string | null
  findPath: (from: SearchResult, to: SearchResult) => void
  clearPath: () => void
}

export function usePath(): UsePathResult {
  const [pathData, setPathData] = useState<GraphData | null>(null)
  const [fromId, setFromId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const findPath = useCallback((from: SearchResult, to: SearchResult) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)
    setFromId(from.id)

    fetchPath(from.id, to.id, controller.signal)
      .then(data => {
        if (controller.signal.aborted) return
        if (data.nodes.length === 0) {
          setError('No path found between these nodes')
          setPathData(null)
          setFromId(null)
        } else {
          setPathData(data)
        }
        setLoading(false)
      })
      .catch(fetchPathErr => {
        if (fetchPathErr instanceof DOMException && fetchPathErr.name === 'AbortError') return
        if (controller.signal.aborted) return
        setError(fetchPathErr instanceof Error ? fetchPathErr.message : 'Failed to find path')
        setPathData(null)
        setFromId(null)
        setLoading(false)
      })
  }, [])

  const clearPath = useCallback(() => {
    abortRef.current?.abort()
    setPathData(null)
    setFromId(null)
    setError(null)
    setLoading(false)
  }, [])

  return { pathData, fromId, loading, error, findPath, clearPath }
}
