import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { NodeType } from '../../types'

const NODE_TYPES: { value: NodeType; label: string }[] = [
  { value: 'THINKER', label: 'Thinker' },
  { value: 'CONCEPT', label: 'Concept' },
  { value: 'CLAIM', label: 'Claim' },
  { value: 'TEXT', label: 'Text' },
]

interface Props {
  x: number
  y: number
  onSelect: (type: NodeType) => void
  onClose: () => void
}

export function ContextMenu({ x, y, onSelect, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ left: x, top: y })

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  // Clamp to viewport before paint so the menu never flickers at the unclamped position
  useLayoutEffect(() => {
    const menu = menuRef.current
    if (!menu) return
    const rect = menu.getBoundingClientRect()
    const clampedLeft = Math.max(0, Math.min(x, window.innerWidth - rect.width - 4))
    const clampedTop = Math.max(0, Math.min(y, window.innerHeight - rect.height - 4))
    setPos({ left: clampedLeft, top: clampedTop })
  }, [x, y])

  return (
    <div
      className="context-menu-overlay"
      onMouseDown={onClose}
      onContextMenu={e => { e.preventDefault(); onClose() }}
    >
      <div
        ref={menuRef}
        className="context-menu"
        role="menu"
        aria-label="Add node"
        style={{ left: pos.left, top: pos.top }}
        onMouseDown={e => e.stopPropagation()}
        onContextMenu={e => e.stopPropagation()}
      >
        <div className="context-menu__header">Add Node</div>
        {NODE_TYPES.map(t => (
          <button
            key={t.value}
            className="context-menu__item"
            role="menuitem"
            data-type={t.value}
            onClick={() => onSelect(t.value)}
          >
            <span className="node-badge" data-type={t.value}>{t.value}</span>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}
