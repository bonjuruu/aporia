import { useState, useEffect, useCallback } from 'react'
import { fetchGraph } from '../api/client'
import type { GraphData, GraphNode, GraphEdge } from '../types'

export function useGraph() {
  const [data, setData] = useState<GraphData>({ nodes: [], edges: [] })
  const [error, setError] = useState<string | null>(null)
  const [fetchCount, setFetchCount] = useState(0)
  const [settledCount, setSettledCount] = useState(-1)

  useEffect(() => {
    let cancelled = false
    fetchGraph()
      .then(graphData => { if (!cancelled) { setData(graphData); setError(null) } })
      .catch(fetchGraphErr => { if (!cancelled) setError(fetchGraphErr.message) })
      .finally(() => { if (!cancelled) setSettledCount(fetchCount) })
    return () => { cancelled = true }
  }, [fetchCount])

  // Derive loading: unsettled whenever a new fetch is in-flight
  const loading = settledCount !== fetchCount

  const addNode = useCallback((node: GraphNode) =>
    setData(prev => prev.nodes.some(n => n.id === node.id)
      ? prev
      : { ...prev, nodes: [...prev.nodes, node] }), [])

  const addEdge = useCallback((edge: GraphEdge) =>
    setData(prev => prev.edges.some(e => e.id === edge.id)
      ? prev
      : { ...prev, edges: [...prev.edges, edge] }), [])

  const refetchGraph = useCallback(() => setFetchCount(c => c + 1), [])

  return { data, loading, error, addNode, addEdge, refetchGraph }
}
