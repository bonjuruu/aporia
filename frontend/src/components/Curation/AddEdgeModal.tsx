import { useState, useId, useCallback, useEffect, useMemo } from 'react'
import { createEdge } from '../../api/client'
import { NodeSearchInput } from './NodeSearchInput'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { isEdgeType, EDGE_TYPES } from '../../types'
import { VALID_PAIRS, pairMatches } from '../../types/edgePairs'
import type { EdgeType, NodeType, GraphEdge, SearchResult } from '../../types'

interface Props {
  open: boolean
  onClose: () => void
  onEdgeCreated: (edge: GraphEdge) => void
  sourceNode?: { id: string; label: string; type: NodeType } | null
}

/** Filter edge types valid for the given from/to node types. */
function getValidEdgeTypes(fromType: NodeType, toType?: NodeType): EdgeType[] {
  return EDGE_TYPES.filter(edgeType => {
    const pairs = VALID_PAIRS[edgeType]
    if (toType) return pairMatches(pairs, fromType, toType)
    // Only FROM known — show types where FROM can be the source
    return pairs.some(([s]) => s === fromType)
  })
}

/** Auto-infer direction: should source be from or to? */
function inferDirection(edgeType: EdgeType, fromType: NodeType, toType: NodeType): 'forward' | 'reverse' {
  const pairs = VALID_PAIRS[edgeType]
  const forwardValid = pairs.some(([s, t]) => s === fromType && t === toType)
  if (forwardValid) return 'forward'
  return 'reverse'
}

type NodeSlot = { id: string; label: string; type: NodeType; year?: number | null }

export function AddEdgeModal({ open, onClose, onEdgeCreated, sourceNode }: Props) {
  const [fromNode, setFromNode] = useState<NodeSlot | null>(null)
  const [toNode, setToNode] = useState<SearchResult | null>(null)
  const [edgeType, setEdgeType] = useState<EdgeType>('INFLUENCED')
  const [description, setDescription] = useState('')
  const [sourceText, setSourceText] = useState<SearchResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const trapRef = useFocusTrap(open)
  const fieldIdPrefix = useId()

  // Initialize fromNode when modal opens with a sourceNode
  useEffect(() => {
    if (open && sourceNode) {
      setFromNode(sourceNode)
    }
  }, [open, sourceNode])

  // Compute valid edge types for current pair
  const validTypes = useMemo(() => {
    if (fromNode && toNode) return getValidEdgeTypes(fromNode.type, toNode.type)
    if (fromNode) return getValidEdgeTypes(fromNode.type)
    // Only TO known — show types where TO can appear in either position
    if (toNode) return EDGE_TYPES.filter(et => VALID_PAIRS[et].some(([s, t]) => s === toNode.type || t === toNode.type))
    return [...EDGE_TYPES]
  }, [fromNode, toNode])

  // Auto-select first valid type when valid list changes
  useEffect(() => {
    if (validTypes.length > 0 && !validTypes.includes(edgeType)) {
      setEdgeType(validTypes[0])
    }
  }, [validTypes, edgeType])

  function fieldId(name: string) {
    return `${fieldIdPrefix}-${name}`
  }

  const reset = useCallback(() => {
    setFromNode(sourceNode ?? null)
    setToNode(null)
    const defaultTypes = sourceNode ? getValidEdgeTypes(sourceNode.type) : []
    setEdgeType(defaultTypes[0] ?? 'INFLUENCED')
    setDescription('')
    setSourceText(null)
    setError(null)
    setSubmitting(false)
  }, [sourceNode])

  const handleClose = useCallback(() => {
    reset()
    onClose()
  }, [onClose, reset])
  useEscapeKey(open, handleClose)

  function handleSwap() {
    const prevFrom = fromNode
    const prevTo = toNode
    setFromNode(prevTo ? { id: prevTo.id, label: prevTo.label, type: prevTo.type, year: prevTo.year } : null)
    setToNode(prevFrom ? { id: prevFrom.id, label: prevFrom.label, type: prevFrom.type, year: prevFrom.year ?? null } : null)
  }

  // Resolve final source/target based on edge type direction inference
  function resolveDirection(): { sourceId: string; targetId: string } | null {
    if (!fromNode || !toNode) return null
    const dir = inferDirection(edgeType, fromNode.type, toNode.type)
    if (dir === 'forward') return { sourceId: fromNode.id, targetId: toNode.id }
    return { sourceId: toNode.id, targetId: fromNode.id }
  }

  async function handleSubmit() {
    const resolved = resolveDirection()
    if (!resolved) return
    setSubmitting(true)
    setError(null)

    try {
      const edge = await createEdge({
        source: resolved.sourceId,
        target: resolved.targetId,
        type: edgeType,
        ...(description ? { description } : {}),
        ...(sourceText ? { sourceTextId: sourceText.id } : {}),
      })
      onEdgeCreated(edge)
      handleClose()
    } catch (submitErr) {
      setError(submitErr instanceof Error ? submitErr.message : 'Failed to create edge')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open || !sourceNode) return null

  // Direction preview
  const resolved = fromNode && toNode ? resolveDirection() : null
  const previewFrom = resolved && fromNode && toNode
    ? (resolved.sourceId === fromNode.id ? fromNode : toNode)
    : null
  const previewTo = resolved && fromNode && toNode
    ? (resolved.targetId === fromNode.id ? fromNode : toNode)
    : null

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        ref={trapRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-edge-modal-title"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <span id="add-edge-modal-title" className="meta-label">Create Edge</span>
          <button className="btn btn--sm" onClick={handleClose}>CLOSE</button>
        </div>

        <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
          {/* FROM */}
          <div className="form-field">
            <label className="meta-label" htmlFor={fieldId('from')}>From</label>
            {fromNode ? (
              <div className="edge-node-display">
                <span className="node-badge" data-type={fromNode.type}>{fromNode.type}</span>
                <span className="edge-source-label">{fromNode.label}</span>
                <button
                  type="button"
                  className="edge-node-display__clear"
                  onClick={() => setFromNode(null)}
                  aria-label="Clear from node"
                >&times;</button>
              </div>
            ) : (
              <NodeSearchInput
                id={fieldId('from')}
                value={null}
                onChange={v => { if (v) setFromNode({ id: v.id, label: v.label, type: v.type, year: v.year }) }}
                placeholder="Search node..."
                excludeId={toNode?.id}
              />
            )}
          </div>

          {/* Swap button */}
          <div className="edge-swap-row">
            <div className="edge-swap-row__line" />
            <button
              type="button"
              className="edge-swap-row__btn"
              onClick={handleSwap}
              title="Swap from and to"
            >
              &#8645;
            </button>
            <div className="edge-swap-row__line" />
          </div>

          {/* TO */}
          <div className="form-field">
            <label className="meta-label" htmlFor={fieldId('target')}>To</label>
            {toNode ? (
              <div className="edge-node-display">
                <span className="node-badge" data-type={toNode.type}>{toNode.type}</span>
                <span className="edge-source-label">{toNode.label}</span>
                <button
                  type="button"
                  className="edge-node-display__clear"
                  onClick={() => setToNode(null)}
                  aria-label="Clear to node"
                >&times;</button>
              </div>
            ) : (
              <NodeSearchInput
                id={fieldId('target')}
                value={null}
                onChange={setToNode}
                placeholder="Search node..."
                excludeId={fromNode?.id}
              />
            )}
          </div>

          {/* Relationship (filtered) */}
          <div className="form-field">
            <label className="meta-label" htmlFor={fieldId('edgeType')}>Relationship</label>
            <select
              className="select"
              id={fieldId('edgeType')}
              value={edgeType}
              onChange={e => { if (isEdgeType(e.target.value)) setEdgeType(e.target.value) }}
            >
              {validTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Direction preview */}
          {previewFrom && previewTo && (
            <div className="edge-direction-preview">
              <span className="node-badge" data-type={previewFrom.type} style={{ fontSize: 9 }}>{previewFrom.type}</span>
              <span className="edge-direction-preview__label">{previewFrom.label}</span>
              <span className="edge-direction-preview__arrow">{edgeType} &rarr;</span>
              <span className="node-badge" data-type={previewTo.type} style={{ fontSize: 9 }}>{previewTo.type}</span>
              <span className="edge-direction-preview__label">{previewTo.label}</span>
            </div>
          )}

          {/* Description */}
          <div className="form-field">
            <label className="meta-label" htmlFor={fieldId('description')}>Description</label>
            <input
              className="input"
              id={fieldId('description')}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional"
            />
          </div>

          {/* Source text */}
          <div className="form-field">
            <label className="meta-label" htmlFor={fieldId('sourceText')}>Found in Text</label>
            <NodeSearchInput
              id={fieldId('sourceText')}
              value={sourceText}
              onChange={setSourceText}
              placeholder="Search text node..."
              filterType="TEXT"
            />
          </div>

          {error && (
            <div className="inline-error mb-3" role="alert">{error}</div>
          )}

          <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
            <button
              className="btn btn--sm btn--accent"
              type="submit"
              disabled={submitting || !fromNode || !toNode}
            >
              {submitting ? 'CREATING...' : 'CREATE'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
