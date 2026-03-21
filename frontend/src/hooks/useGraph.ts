import { useState, useEffect, useCallback } from 'react'
import { fetchGraph } from '../api/client'
import type { GraphData, GraphNode, GraphEdge } from '../types'

export function useGraph() {
  const [data, setData] = useState<GraphData>({ nodes: [], edges: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchGraph()
      .then(setData)
      .catch((fetchGraphErr) => setError(fetchGraphErr.message))
      .finally(() => setLoading(false))
  }, [])

  const addNode = useCallback((node: GraphNode) =>
    setData(prev => ({ ...prev, nodes: [...prev.nodes, node] })), [])

  const addEdge = useCallback((edge: GraphEdge) =>
    setData(prev => ({ ...prev, edges: [...prev.edges, edge] })), [])

  return { data, loading, error, addNode, addEdge }
}
