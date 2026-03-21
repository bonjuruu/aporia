import { useState, useCallback } from 'react'
import { NodeSearchInput } from '../Curation/NodeSearchInput'
import type { SearchResult } from '../../types'

interface Props {
  onSelect: (nodeId: string) => void
}

export function SearchBar({ onSelect }: Props) {
  const [value, setValue] = useState<SearchResult | null>(null)

  const handleChange = useCallback((result: SearchResult | null) => {
    if (result) {
      onSelect(result.id)
    }
    setValue(null)
  }, [onSelect])

  return (
    <div style={{ width: 240 }}>
      <NodeSearchInput
        value={value}
        onChange={handleChange}
        placeholder="SEARCH NODES..."
      />
    </div>
  )
}
