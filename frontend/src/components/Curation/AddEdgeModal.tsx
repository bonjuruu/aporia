import { useState, useId, useCallback } from 'react'
import { createEdge } from '../../api/client'
import { NodeSearchInput } from './NodeSearchInput'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { isEdgeType, EDGE_TYPES } from '../../types'
import type { EdgeType, NodeType, GraphEdge, SearchResult } from '../../types'

interface Props {
  open: boolean
  onClose: () => void
  onEdgeCreated: (edge: GraphEdge) => void
  sourceNode?: { id: string; label: string; type: NodeType } | null
}

export function AddEdgeModal({ open, onClose, onEdgeCreated, sourceNode }: Props) {
  const [edgeType, setEdgeType] = useState<EdgeType>('INFLUENCED')
  const [target, setTarget] = useState<SearchResult | null>(null)
  const [description, setDescription] = useState('')
  const [sourceText, setSourceText] = useState<SearchResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const trapRef = useFocusTrap(open)
  const fieldIdPrefix = useId()

  function fieldId(name: string) {
    return `${fieldIdPrefix}-${name}`
  }

  const reset = useCallback(() => {
    setEdgeType('INFLUENCED')
    setTarget(null)
    setDescription('')
    setSourceText(null)
    setError(null)
    setSubmitting(false)
  }, [])

  const handleClose = useCallback(() => {
    reset()
    onClose()
  }, [onClose, reset])
  useEscapeKey(open, handleClose)

  async function handleSubmit() {
    if (!sourceNode || !target) return
    setSubmitting(true)
    setError(null)

    try {
      const edge = await createEdge({
        source: sourceNode.id,
        target: target.id,
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
          {/* Source (read-only) */}
          <div className="form-field">
            <div className="meta-label">From</div>
            <div className="edge-source-display">
              <span className="node-badge" data-type={sourceNode.type}>{sourceNode.type}</span>
              <span className="edge-source-label">{sourceNode.label}</span>
            </div>
          </div>

          {/* Edge type */}
          <div className="form-field">
            <label className="meta-label" htmlFor={fieldId('edgeType')}>Relationship</label>
            <select
              className="select"
              id={fieldId('edgeType')}
              value={edgeType}
              onChange={e => { if (isEdgeType(e.target.value)) setEdgeType(e.target.value) }}
            >
              {EDGE_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Target search */}
          <div className="form-field">
            <label className="meta-label" htmlFor={fieldId('target')}>To</label>
            <NodeSearchInput
              id={fieldId('target')}
              value={target}
              onChange={setTarget}
              placeholder="SEARCH TARGET NODE..."
              excludeId={sourceNode.id}
            />
          </div>

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
              placeholder="SEARCH TEXT NODE..."
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
              disabled={submitting || !target}
            >
              {submitting ? 'CREATING...' : 'CREATE'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
