import { useEffect } from 'react'
import { useNode } from '../../hooks/useNode'
import type { NodeDetail, ConnectionEntry } from '../../types'

interface Props {
  nodeId: string | null
  onClose: () => void
  onNodeClick: (nodeId: string) => void
}

function ConnectionList({ label, connections, onNodeClick }: {
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
          onClick={() => onNodeClick(conn.node.id)}
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

function PropertyRow({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="meta-label">{label}</div>
      <div className="content-text" style={{ marginTop: 2 }}>{String(value)}</div>
    </div>
  )
}

function NodeContent({ data, onNodeClick }: { data: NodeDetail; onNodeClick: (nodeId: string) => void }) {
  const props = data.properties

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <span className="node-badge" data-type={data.type}>{data.type}</span>
        <h2 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 22,
          fontWeight: 400,
          color: 'var(--color-text-primary)',
        }}>
          {String(props.name || props.label || props.title || '')}
        </h2>
      </div>

      {data.type === 'THINKER' && (
        <>
          <PropertyRow label="Born" value={props.bornYear} />
          <PropertyRow label="Died" value={props.diedYear} />
          <PropertyRow label="Tradition" value={props.tradition} />
          <PropertyRow label="Description" value={props.description} />
        </>
      )}

      {data.type === 'CONCEPT' && (
        <>
          <PropertyRow label="Year" value={props.year} />
          <PropertyRow label="Description" value={props.description} />
        </>
      )}

      {data.type === 'CLAIM' && (
        <>
          <PropertyRow label="Year" value={props.year} />
          <PropertyRow label="Claim" value={props.description} />
        </>
      )}

      {data.type === 'TEXT' && (
        <>
          <PropertyRow label="Published" value={props.publishedYear} />
          <PropertyRow label="Description" value={props.description} />
        </>
      )}

      <ConnectionList label="Outgoing" connections={data.outgoing} onNodeClick={onNodeClick} />
      <ConnectionList label="Incoming" connections={data.incoming} onNodeClick={onNodeClick} />
    </div>
  )
}

function PanelSkeleton() {
  return (
    <div>
      <div style={{
        height: 24,
        width: 120,
        background: 'var(--color-border)',
        marginBottom: 12,
      }} />
      <div style={{
        height: 14,
        width: 200,
        background: 'var(--color-border)',
        marginBottom: 8,
      }} />
      <div style={{
        height: 14,
        width: 160,
        background: 'var(--color-border)',
      }} />
    </div>
  )
}

export function DetailPanel({ nodeId, onClose, onNodeClick }: Props) {
  const { data, loading } = useNode(nodeId)

  useEffect(() => {
    if (!nodeId) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [nodeId, onClose])

  return (
    <div className={`detail-panel ${nodeId ? 'open' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <span className="meta-label">Node Detail</span>
        <button
          className="btn"
          onClick={onClose}
          style={{ padding: '4px 10px', fontSize: 11 }}
        >
          CLOSE
        </button>
      </div>
      {loading ? <PanelSkeleton /> : data ? <NodeContent data={data} onNodeClick={onNodeClick} /> : null}
    </div>
  )
}
