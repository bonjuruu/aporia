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
