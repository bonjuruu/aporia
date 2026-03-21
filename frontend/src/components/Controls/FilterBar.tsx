import { useState, useRef, useCallback } from 'react'
import { NODE_TYPES } from '../../types'
import type { NodeType } from '../../types'

interface Props {
  activeTypes: Set<NodeType>
  onToggle: (type: NodeType) => void
}

export function FilterBar({ activeTypes, onToggle }: Props) {
  const [focusedIndex, setFocusedIndex] = useState(0)
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    let nextIndex: number | null = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      nextIndex = (focusedIndex + 1) % NODE_TYPES.length
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      nextIndex = (focusedIndex - 1 + NODE_TYPES.length) % NODE_TYPES.length
    } else if (e.key === 'Home') {
      e.preventDefault()
      nextIndex = 0
    } else if (e.key === 'End') {
      e.preventDefault()
      nextIndex = NODE_TYPES.length - 1
    }
    if (nextIndex !== null) {
      setFocusedIndex(nextIndex)
      buttonRefs.current[nextIndex]?.focus()
    }
  }, [focusedIndex])

  return (
    <div role="toolbar" aria-label="Filter node types" className="filter-bar" onKeyDown={handleKeyDown}>
      {NODE_TYPES.map((type, index) => (
        <button
          key={type}
          ref={el => { buttonRefs.current[index] = el }}
          className="filter-btn"
          data-type={type}
          tabIndex={index === focusedIndex ? 0 : -1}
          aria-pressed={activeTypes.has(type)}
          onClick={() => onToggle(type)}
          onFocus={() => setFocusedIndex(index)}
        >
          {type}
        </button>
      ))}
    </div>
  )
}
