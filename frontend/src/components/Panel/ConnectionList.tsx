import { useState } from 'react'
import { updateEdge } from '../../api/client'
import { NodeSearchInput } from '../Curation/NodeSearchInput'
import type { ConnectionEntry, SearchResult } from '../../types'

function ConnectionRow({ conn, onNodeClick, onDeleteEdge, onEdgeUpdated }: {
  conn: ConnectionEntry
  onNodeClick: (nodeId: string) => void
  onDeleteEdge?: (edgeId: string) => void
  onEdgeUpdated?: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editDesc, setEditDesc] = useState('')
  const [editSourceText, setEditSourceText] = useState<SearchResult | null>(null)
  const [saving, setSaving] = useState(false)

  const hasDetails = !!(conn.edge.description || conn.edge.sourceTextTitle)

  function toggleExpand(e: React.MouseEvent) {
    e.stopPropagation()
    setExpanded(prev => !prev)
    setEditing(false)
    setConfirmDelete(false)
  }

  function startEdit() {
    setEditDesc(conn.edge.description || '')
    setEditSourceText(
      conn.edge.sourceTextId && conn.edge.sourceTextTitle
        ? { id: conn.edge.sourceTextId, label: conn.edge.sourceTextTitle, type: 'TEXT', year: null }
        : null
    )
    setEditing(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateEdge(conn.edge.id, {
        description: editDesc || undefined,
        sourceTextId: editSourceText?.id || undefined,
      })
      setEditing(false)
      onEdgeUpdated?.()
    } catch {
      // keep edit mode open
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="conn-row">
      {/* Main row */}
      <div className="conn-row__main">
        <button
          type="button"
          className="conn-row__node"
          onClick={() => onNodeClick(conn.node.id)}
        >
          <span className="node-badge" data-type={conn.node.type}>{conn.node.type}</span>
          <span className="conn-row__label">{conn.node.label}</span>
        </button>
        <button
          type="button"
          className={`conn-row__type ${expanded ? 'conn-row__type--active' : ''} ${hasDetails ? 'conn-row__type--has-details' : ''}`}
          onClick={toggleExpand}
        >
          {conn.edge.type} {expanded ? '\u25B4' : '\u25BE'}
        </button>
        {onDeleteEdge && !confirmDelete && (
          <button
            className="conn-row__delete"
            onClick={() => setConfirmDelete(true)}
            aria-label={`Delete ${conn.edge.type} edge`}
          >&times;</button>
        )}
        {confirmDelete && (
          <span className="conn-row__confirm">
            <button className="conn-row__action" onClick={() => setConfirmDelete(false)}>no</button>
            <button className="conn-row__action conn-row__action--danger" onClick={() => onDeleteEdge?.(conn.edge.id)}>yes</button>
          </span>
        )}
      </div>

      {/* Expanded details */}
      {expanded && !editing && (
        <div className="conn-row__detail">
          {conn.edge.description && (
            <p className="conn-row__desc">{conn.edge.description}</p>
          )}
          {conn.edge.sourceTextTitle && (
            <span className="conn-row__source">from {conn.edge.sourceTextTitle}</span>
          )}
          {!hasDetails && (
            <span className="conn-row__empty">No details yet</span>
          )}
          <div className="conn-row__detail-actions">
            <button className="conn-row__action" onClick={startEdit}>edit</button>
          </div>
        </div>
      )}

      {/* Edit mode */}
      {expanded && editing && (
        <div className="conn-row__detail">
          <div style={{ marginBottom: 8 }}>
            <label className="meta-label" style={{ display: 'block', marginBottom: 4 }}>Description</label>
            <textarea
              className="input"
              value={editDesc}
              onChange={e => setEditDesc(e.target.value)}
              rows={2}
              placeholder="Optional..."
              style={{ resize: 'vertical', fontSize: 13 }}
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label className="meta-label" style={{ display: 'block', marginBottom: 4 }}>Found in Text</label>
            <NodeSearchInput
              value={editSourceText}
              onChange={setEditSourceText}
              placeholder="Search text..."
              filterType="TEXT"
            />
          </div>
          <div className="conn-row__detail-actions">
            <button className="conn-row__action" onClick={() => setEditing(false)}>cancel</button>
            <button
              className="conn-row__action conn-row__action--accent"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'saving...' : 'save'}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

export function ConnectionList({ label, connections, onNodeClick, onDeleteEdge, onEdgeUpdated }: {
  label: string
  connections: ConnectionEntry[]
  onNodeClick: (nodeId: string) => void
  onDeleteEdge?: (edgeId: string) => void
  onEdgeUpdated?: () => void
}) {
  if (connections.length === 0) return null
  return (
    <div className="connection-list">
      <div className="meta-label" style={{ marginBottom: 8 }}>{label}</div>
      {connections.map(conn => (
        <ConnectionRow
          key={conn.edge.id}
          conn={conn}
          onNodeClick={onNodeClick}
          onDeleteEdge={onDeleteEdge}
          onEdgeUpdated={onEdgeUpdated}
        />
      ))}
    </div>
  )
}
