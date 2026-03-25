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
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [pos, setPos] = useState({ left: x, top: y })
  const [focusIndex, setFocusIndex] = useState(0)

  useEffect(() => {
    itemRefs.current[focusIndex]?.focus()
  }, [focusIndex])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowDown':
          e.preventDefault()
          setFocusIndex(i => (i + 1) % NODE_TYPES.length)
          break
        case 'ArrowUp':
          e.preventDefault()
          setFocusIndex(i => (i - 1 + NODE_TYPES.length) % NODE_TYPES.length)
          break
        case 'Enter':
          e.preventDefault()
          onSelect(NODE_TYPES[focusIndex].value)
          break
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, onSelect, focusIndex])

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
        {NODE_TYPES.map((t, i) => (
          <button
            key={t.value}
            className={`context-menu__item${i === focusIndex ? ' context-menu__item--focused' : ''}`}
            role="menuitem"
            tabIndex={i === focusIndex ? 0 : -1}
            ref={el => { itemRefs.current[i] = el }}
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
