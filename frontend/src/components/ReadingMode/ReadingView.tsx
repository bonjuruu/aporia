import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchSubgraph, fetchNodesByType, fetchNode } from '../../api/client'
import { GraphCanvas } from '../Graph/GraphCanvas'
import { DetailPanel } from '../Panel/DetailPanel'
import { ReadingSidebar } from './ReadingSidebar'
import { useProgress } from '../../hooks/useProgress'
import type { GraphData, GraphNode, GraphEdge, NodeDetail, TextProperties, ReadingProgress } from '../../types'

interface Props {
  onLogout: () => void
}

export function ReadingView({ onLogout }: Props) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { progressMap, update: updateProgressFn, fetchForText } = useProgress()
  const [textProgress, setTextProgress] = useState<ReadingProgress | null>(null)
  const touchedRef = useRef<string | null>(null)

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

  // Fetch existing progress for this text on mount / text change
  useEffect(() => {
    if (!id) return
    let cancelled = false
    fetchForText(id).then(progress => {
      if (cancelled) return
      setTextProgress(progress)
      // Auto-touch lastReadAt on mount (once per text)
      if (touchedRef.current !== id && progress) {
        touchedRef.current = id
        updateProgressFn(id, { chapter: progress.chapter }).catch(() => {})
      }
    })
    return () => { cancelled = true }
  }, [id, fetchForText, updateProgressFn])

  const handleProgressUpdated = useCallback((progress: ReadingProgress) => {
    setTextProgress(progress)
  }, [])

  // Fetch text list once on mount (not on every refetch)
  useEffect(() => {
    const controller = new AbortController()
    fetchNodesByType('TEXT', controller.signal)
      .then(textList => {
        if (!controller.signal.aborted) setAllTexts(textList)
      })
      .catch(() => { /* text list is non-critical — dropdown will be empty */ })
    return () => controller.abort()
  }, [])

  // Fetch subgraph + text detail (re-runs on id change or refetch)
  useEffect(() => {
    if (!id) return
    const controller = new AbortController()
    const key = fetchKey

    Promise.all([
      fetchSubgraph(id, controller.signal),
      fetchNode(id, controller.signal),
    ])
      .then(([subgraph, detail]) => {
        if (controller.signal.aborted) return
        setSubgraphData(subgraph)
        setTextDetail(detail)
        setError(null)
      })
      .catch(fetchErr => {
        if (controller.signal.aborted) return
        setError(fetchErr instanceof Error ? fetchErr.message : 'Failed to load reading view')
      })
      .finally(() => {
        if (!controller.signal.aborted) setSettledKey(key)
      })

    return () => controller.abort()
  }, [id, fetchKey])

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

  const initialLoad = loading && !textDetail

  if (!id) {
    return (
      <div className="centered-screen" style={{ color: 'var(--color-node-claim)' }}>
        ERROR: No text ID provided
      </div>
    )
  }

  if (initialLoad) {
    return (
      <div className="centered-screen" style={{ color: 'var(--color-text-muted)' }}>
        LOADING TEXT...
      </div>
    )
  }

  if (error && !textDetail) {
    return (
      <div className="centered-screen" style={{ color: 'var(--color-node-claim)' }}>
        <div>ERROR: {error}</div>
        <button className="btn" onClick={handleRefetch} style={{ fontSize: 11, marginTop: 12 }}>
          RETRY
        </button>
      </div>
    )
  }

  return (
    <div className="reading-layout">
      {/* Sidebar */}
      <ReadingSidebar
        textId={id}
        textTitle={textProperties?.title ?? 'Unknown Text'}
        textYear={textProperties?.publishedYear}
        textDescription={textProperties?.description}
        onNodeCreated={handleNodeCreated}
        onEdgeCreated={handleEdgeCreated}
        progress={textProgress}
        onProgressUpdated={handleProgressUpdated}
      />

      {/* Main content area */}
      <div className="reading-main">
        {/* Top bar */}
        <div className="reading-top-bar">
          <div className="flex-row">
            <button
              className="btn btn--sm"
              onClick={() => navigate('/')}
            >
              BACK
            </button>
            <span className="meta-label">Reading Mode</span>
            {loading && <span className="meta-label meta-label--status">REFRESHING...</span>}
          </div>

          <div className="flex-row">
            <label htmlFor="reading-text-select" className="sr-only">Select text</label>
            <select
              id="reading-text-select"
              className="select select--auto"
              value={id}
              onChange={e => handleNavigateToText(e.target.value)}
            >
              {allTexts.length === 0 && (
                <option value={id}>{textProperties?.title ?? id}</option>
              )}
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
          progressMap={progressMap}
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
