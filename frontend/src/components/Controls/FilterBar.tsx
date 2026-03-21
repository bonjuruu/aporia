import type { NodeType } from '../../types'

const NODE_TYPES: { type: NodeType; color: string }[] = [
  { type: 'THINKER', color: 'var(--color-node-thinker)' },
  { type: 'CONCEPT', color: 'var(--color-node-concept)' },
  { type: 'CLAIM', color: 'var(--color-node-claim)' },
  { type: 'TEXT', color: 'var(--color-node-text)' },
]

interface Props {
  activeTypes: Set<string>
  onToggle: (type: string) => void
}

export function FilterBar({ activeTypes, onToggle }: Props) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {NODE_TYPES.map(({ type, color }) => {
        const active = activeTypes.has(type)
        return (
          <button
            key={type}
            onClick={() => onToggle(type)}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '4px 10px',
              border: `1px solid ${active ? color : 'var(--color-border)'}`,
              background: active ? `${color}15` : 'transparent',
              color: active ? color : 'var(--color-text-muted)',
              cursor: 'pointer',
              transition: 'all 150ms ease-out',
            }}
          >
            {type}
          </button>
        )
      })}
    </div>
  )
}
