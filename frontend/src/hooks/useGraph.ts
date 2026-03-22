import { useState, useEffect, useCallback } from 'react'
import { fetchGraph } from '../api/client'
import type { GraphData, GraphNode, GraphEdge } from '../types'

export function useGraph() {
  const [data, setData] = useState<GraphData>({ nodes: [], edges: [] })
  const [error, setError] = useState<string | null>(null)
  const [fetchCount, setFetchCount] = useState(0)
  const [settledCount, setSettledCount] = useState(-1)

  useEffect(() => {
    const controller = new AbortController()
    fetchGraph(controller.signal)
      .then(graphData => { if (!controller.signal.aborted) { setData(graphData); setError(null) } })
      .catch(fetchGraphErr => {
        if (controller.signal.aborted) return
        setError(fetchGraphErr instanceof Error ? fetchGraphErr.message : 'Failed to load graph')
      })
      .finally(() => { if (!controller.signal.aborted) setSettledCount(fetchCount) })
    return () => controller.abort()
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

  const removeNode = useCallback((nodeId: string) =>
    setData(prev => ({
      nodes: prev.nodes.filter(n => n.id !== nodeId),
      edges: prev.edges.filter(e => {
        const sourceId = typeof e.source === 'string' ? e.source : e.source.id
        const targetId = typeof e.target === 'string' ? e.target : e.target.id
        return sourceId !== nodeId && targetId !== nodeId
      }),
    })), [])

  const removeEdge = useCallback((edgeId: string) =>
    setData(prev => ({
      ...prev,
      edges: prev.edges.filter(e => e.id !== edgeId),
    })), [])

  const refetchGraph = useCallback(() => setFetchCount(c => c + 1), [])

  return { data, loading, error, addNode, addEdge, removeNode, removeEdge, refetchGraph }
}
