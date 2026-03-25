import { useState, useCallback, useRef, useEffect } from 'react'
import { NodeSearchInput } from '../Curation/NodeSearchInput'
import type { SearchResult } from '../../types'

interface Props {
  onSelect: (nodeId: string) => void
}

export function SearchBar({ onSelect }: Props) {
  const [flash, setFlash] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    return () => clearTimeout(timerRef.current)
  }, [])

  const handleChange = useCallback((result: SearchResult | null) => {
    if (result) {
      onSelect(result.id)
      clearTimeout(timerRef.current)
      setFlash(result.label)
      timerRef.current = setTimeout(() => setFlash(null), 800)
    }
  }, [onSelect])

  return (
    <div className="search-bar">
      {flash ? (
        <div className="input search-bar__flash">
          → {flash}
        </div>
      ) : (
        <NodeSearchInput
          value={null}
          onChange={handleChange}
          placeholder="SEARCH NODES..."
        />
      )}
    </div>
  )
}
