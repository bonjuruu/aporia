import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchSubgraph, fetchGraph, fetchNode } from '../../api/client'
import { GraphCanvas } from '../Graph/GraphCanvas'
import { DetailPanel } from '../Panel/DetailPanel'
import { ReadingSidebar } from './ReadingSidebar'
import type { GraphData, GraphNode, GraphEdge, NodeDetail, TextProperties } from '../../types'

interface Props {
  onLogout: () => void
}

export function ReadingView({ onLogout }: Props) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [subgraphData, setSubgraphData] = useState<GraphData>({ nodes: [], edges: [] })
  const [textDetail, setTextDetail] = useState<NodeDetail | null>(null)
  const [allTexts, setAllTexts] = useState<GraphNode[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [refetchCount, setRefetchCount] = useState(0)

  // Composite fetch key — changes when id or refetchCount changes
  const fetchKey = `${id}-${refetchCount}`
  const [settledKey, setSettledKey] = useState<string | null>(null)

  // Derive loading: unsettled whenever fetch key differs
  const loading = settledKey !== fetchKey

  // Fetch subgraph + text detail + all texts for dropdown
  useEffect(() => {
    if (!id) return
    let cancelled = false
    const key = fetchKey

    Promise.all([
      fetchSubgraph(id),
      fetchNode(id),
      fetchGraph(),
    ])
      .then(([subgraph, detail, fullGraph]) => {
        if (cancelled) return
        setSubgraphData(subgraph)
        setTextDetail(detail)
        setAllTexts(fullGraph.nodes.filter(n => n.type === 'TEXT'))
        setError(null)
      })
      .catch(fetchErr => {
        if (cancelled) return
        setError(fetchErr instanceof Error ? fetchErr.message : 'Failed to load reading view')
      })
      .finally(() => {
        if (!cancelled) setSettledKey(key)
      })

    return () => { cancelled = true }
  }, [fetchKey, id])

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedId(node.id)
  }, [])

  const handleNodeClickById = useCallback((nodeId: string) => {
    setSelectedId(nodeId)
  }, [])

  const handleClosePanel = useCallback(() => setSelectedId(null), [])

  const handleNodeCreated = useCallback((node: GraphNode) => {
    setSubgraphData(prev => prev.nodes.some(n => n.id === node.id)
      ? prev
      : { ...prev, nodes: [...prev.nodes, node] })
  }, [])

  const handleEdgeCreated = useCallback((edge: GraphEdge) => {
    setSubgraphData(prev => prev.edges.some(e => e.id === edge.id)
      ? prev
      : { ...prev, edges: [...prev.edges, edge] })
  }, [])

  const handleRefetch = useCallback(() => {
    setRefetchCount(c => c + 1)
  }, [])

  const handleNavigateToText = useCallback((textId: string) => {
    setSelectedId(null)
    navigate(`/reading/${textId}`)
  }, [navigate])

  const textProperties = useMemo(() => {
    if (!textDetail || textDetail.type !== 'TEXT') return null
    return textDetail.properties as TextProperties
  }, [textDetail])

  if (loading) {
    return (
      <div className="centered-screen" style={{ color: 'var(--color-text-muted)' }}>
        LOADING TEXT...
      </div>
    )
  }

  if (error) {
    return (
      <div className="centered-screen" style={{ color: 'var(--color-node-claim)' }}>
        ERROR: {error}
      </div>
    )
  }

  return (
    <div className="reading-layout">
      {/* Sidebar */}
      <ReadingSidebar
        textId={id!}
        textTitle={textProperties?.title ?? 'Unknown Text'}
        textYear={textProperties?.publishedYear}
        textDescription={textProperties?.description}
        onNodeCreated={handleNodeCreated}
        onEdgeCreated={handleEdgeCreated}
      />

      {/* Main content area */}
      <div className="reading-main">
        {/* Top bar */}
        <div className="reading-top-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className="btn btn--sm"
              onClick={() => navigate('/')}
            >
              BACK
            </button>
            <span className="meta-label">Reading Mode</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <select
              className="select"
              value={id}
              onChange={e => handleNavigateToText(e.target.value)}
              style={{ width: 'auto', minWidth: 200 }}
            >
              {allTexts.map(text => (
                <option key={text.id} value={text.id}>{text.label}</option>
              ))}
            </select>
            <button className="btn btn--sm" onClick={onLogout}>
              LOGOUT
            </button>
          </div>
        </div>

        {/* Subgraph canvas */}
        <GraphCanvas
          data={subgraphData}
          selectedId={selectedId}
          onNodeClick={handleNodeClick}
        />

        {/* Detail panel */}
        <DetailPanel
          nodeId={selectedId}
          onClose={handleClosePanel}
          onNodeClick={handleNodeClickById}
          onNodeUpdated={handleRefetch}
          onReadText={handleNavigateToText}
        />

        {/* Bottom stats */}
        <div className="stats-bar">
          <span>{subgraphData.nodes.length} nodes</span>
          <span>{subgraphData.edges.length} edges</span>
        </div>
      </div>
    </div>
  )
}
