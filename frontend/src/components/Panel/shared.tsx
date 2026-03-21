import { useId } from 'react'
import type { ConnectionEntry } from '../../types'

export function ConnectionList({ label, connections, onNodeClick }: {
  label: string
  connections: ConnectionEntry[]
  onNodeClick: (nodeId: string) => void
}) {
  if (connections.length === 0) return null
  return (
    <div className="connection-list">
      <div className="meta-label" style={{ marginBottom: 8 }}>{label}</div>
      {connections.map(conn => (
        <button
          key={conn.edge.id}
          type="button"
          onClick={() => onNodeClick(conn.node.id)}
          className="connection-list__btn"
        >
          <span className="node-badge" data-type={conn.node.type}>
            {conn.node.type}
          </span>
          <span className="connection-list__label">
            {conn.node.label}
          </span>
          <span className="connection-list__edge-type">
            {conn.edge.type}
          </span>
        </button>
      ))}
    </div>
  )
}

export function PropertyRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="property-row">
      <div className="meta-label">{label}</div>
      <div className="content-text property-row__value">{String(value)}</div>
    </div>
  )
}

export function EditableField({ label, value, onChange, multiline, type }: {
  label: string
  value: string
  onChange: (value: string) => void
  multiline?: boolean
  type?: string
}) {
  const fieldId = useId()
  return (
    <div className="form-field">
      <label className="meta-label" htmlFor={fieldId}>{label}</label>
      {multiline ? (
        <textarea
          className="input"
          id={fieldId}
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={3}
          style={{ resize: 'vertical', marginTop: 2 }}
        />
      ) : (
        <input
          className="input"
          id={fieldId}
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ marginTop: 2 }}
        />
      )}
    </div>
  )
}
