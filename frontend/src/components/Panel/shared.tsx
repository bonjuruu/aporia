import { useState } from 'react'
import type { ConnectionEntry } from '../../types'

function activateOnKeyDown(handler: () => void) {
  return (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handler()
    }
  }
}

export function ConnectionList({ label, connections, onNodeClick }: {
  label: string
  connections: ConnectionEntry[]
  onNodeClick: (nodeId: string) => void
}) {
  if (connections.length === 0) return null
  return (
    <div style={{ marginTop: 20 }}>
      <div className="meta-label" style={{ marginBottom: 8 }}>{label}</div>
      {connections.map(conn => (
        <div
          key={conn.edge.id}
          role="button"
          tabIndex={0}
          onClick={() => onNodeClick(conn.node.id)}
          onKeyDown={activateOnKeyDown(() => onNodeClick(conn.node.id))}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 0',
            cursor: 'pointer',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <span className="node-badge" data-type={conn.node.type}>
            {conn.node.type}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-primary)' }}>
            {conn.node.label}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
            {conn.edge.type}
          </span>
        </div>
      ))}
    </div>
  )
}

export function PropertyRow({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="meta-label">{label}</div>
      <div className="content-text" style={{ marginTop: 2 }}>{String(value)}</div>
    </div>
  )
}

let editableFieldCounter = 0

export function EditableField({ label, value, onChange, multiline, type }: {
  label: string
  value: string
  onChange: (value: string) => void
  multiline?: boolean
  type?: string
}) {
  const [fieldId] = useState(() => `editable-field-${++editableFieldCounter}`)
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
