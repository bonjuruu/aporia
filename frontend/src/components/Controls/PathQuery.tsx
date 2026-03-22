import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { NodeSearchInput } from '../Curation/NodeSearchInput'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import type { SearchResult, GraphData, GraphNode, GraphEdge } from '../../types'
import { edgeEndpointId } from '../../types'

interface PathQueryProps {
  open: boolean
  onClose: () => void
  onFindPath: (from: SearchResult, to: SearchResult) => void
  onClear: () => void
  hasPath: boolean
  loading: boolean
  error: string | null
}

export function PathQuery({ open, onClose, onFindPath, onClear, hasPath, loading, error }: PathQueryProps) {
  const [from, setFrom] = useState<SearchResult | null>(null)
  const [to, setTo] = useState<SearchResult | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const handleClose = useCallback(() => {
    setFrom(null)
    setTo(null)
    onClose()
  }, [onClose])

  useEscapeKey(open, handleClose)

  useEffect(() => {
    if (open) panelRef.current?.focus()
  }, [open])

  const handleSubmit = useCallback(() => {
    if (!from || !to) return
    onFindPath(from, to)
  }, [from, to, onFindPath])

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        ref={panelRef}
        className="modal"
        tabIndex={-1}
        role="dialog"
        aria-label="Find path between nodes"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <span className="meta-label">FIND PATH</span>
          <button className="btn btn--sm" onClick={handleClose}>×</button>
        </div>

        <div className="form-field">
          <label className="meta-label sidebar-field-label" htmlFor="path-from">FROM</label>
          <NodeSearchInput
            id="path-from"
            value={from}
            onChange={setFrom}
            placeholder="SEARCH START NODE..."
            excludeId={to?.id}
          />
        </div>

        <div className="form-field">
          <label className="meta-label sidebar-field-label" htmlFor="path-to">TO</label>
          <NodeSearchInput
            id="path-to"
            value={to}
            onChange={setTo}
            placeholder="SEARCH END NODE..."
            excludeId={from?.id}
          />
        </div>

        {error && <div className="inline-error" role="alert">{error}</div>}

        <div className="form-actions">
          <button
            className="btn btn--full"
            disabled={!from || !to || loading}
            onClick={handleSubmit}
          >
            {loading ? 'SEARCHING...' : 'FIND SHORTEST PATH'}
          </button>
        </div>

        {hasPath && (
          <button
            className="btn btn--full mt-2"
            onClick={() => { onClear(); handleClose() }}
          >
            CLEAR PATH
          </button>
        )}
      </div>
    </div>
  )
}

/* Ordered path panel (vertical chain) */
interface PathStripProps {
  pathData: GraphData
  fromId: string | null
  onNodeClick: (nodeId: string) => void
  onClear: () => void
}

export function PathStrip({ pathData, fromId, onNodeClick, onClear }: PathStripProps) {
  const orderedPath = useMemo(
    () => orderPathNodes(pathData.nodes, pathData.edges, fromId),
    [pathData, fromId]
  )

  return (
    <div className="path-panel" role="navigation" aria-label="Shortest path">
      <div className="path-panel__header">
        <span className="meta-label">SHORTEST PATH</span>
        <span className="meta-label meta-label--status">{orderedPath.length} nodes</span>
        <button className="btn btn--sm ml-auto" onClick={onClear} aria-label="Clear path">×</button>
      </div>
      <div className="path-panel__chain">
        {orderedPath.map((step, index) => (
          <div key={step.node.id} className="path-panel__step">
            <button
              className="path-panel__node"
              data-type={step.node.type}
              onClick={() => onNodeClick(step.node.id)}
            >
              <span className="node-badge" data-type={step.node.type}>{step.node.type}</span>
              <span className="path-panel__label">{step.node.label}</span>
            </button>
            {index < orderedPath.length - 1 && step.edgeType && (
              <div className="path-panel__connector">
                <div className="path-panel__line" />
                <span className="path-panel__edge">{step.edgeType}</span>
                <div className="path-panel__line" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

interface PathStep {
  node: GraphNode
  edgeType: string | null
}

function orderPathNodes(nodes: GraphNode[], edges: GraphEdge[], fromId: string | null): PathStep[] {
  if (nodes.length <= 1) {
    return nodes.map(n => ({ node: n, edgeType: null }))
  }

  // Single pass: build adjacency + degree maps
  type Neighbor = { neighborId: string; edgeType: string }
  const nodeIds = new Set(nodes.map(n => n.id))
  const adj = new Map<string, Neighbor[]>()
  const degree = new Map<string, number>()
  for (const edge of edges) {
    const sourceId = edgeEndpointId(edge.source)
    const targetId = edgeEndpointId(edge.target)
    if (!adj.has(sourceId)) adj.set(sourceId, [])
    if (!adj.has(targetId)) adj.set(targetId, [])
    adj.get(sourceId)!.push({ neighborId: targetId, edgeType: edge.type })
    adj.get(targetId)!.push({ neighborId: sourceId, edgeType: edge.type })
    if (nodeIds.has(sourceId)) degree.set(sourceId, (degree.get(sourceId) ?? 0) + 1)
    if (nodeIds.has(targetId)) degree.set(targetId, (degree.get(targetId) ?? 0) + 1)
  }

  // Start from the user's "from" node if present, else first degree-1 endpoint
  let startId = fromId && nodeIds.has(fromId) ? fromId : nodes[0].id
  if (!fromId) {
    for (const [id, deg] of degree) {
      if (deg === 1) { startId = id; break }
    }
  }

  // Walk the chain
  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  const visited = new Set<string>()
  const result: PathStep[] = []
  let currentId: string | null = startId

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId)
    const currentNode = nodeMap.get(currentId)
    if (!currentNode) break

    const neighbors: Neighbor[] = adj.get(currentId) ?? []
    let nextNeighbor: Neighbor | null = null
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor.neighborId) && nodeIds.has(neighbor.neighborId)) {
        nextNeighbor = neighbor
        break
      }
    }

    result.push({ node: currentNode, edgeType: nextNeighbor?.edgeType ?? null })
    currentId = nextNeighbor?.neighborId ?? null
  }

  return result
}
