import { useState, useEffect, useRef, useMemo } from 'react'
import { searchNodes } from '../../api/client'
import type { SearchResult } from '../../types'

interface Props {
  onSelect: (nodeId: string) => void
}

export function SearchBar({ onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)

  const shouldSearch = useMemo(() => query.length >= 2, [query])

  useEffect(() => {
    if (!shouldSearch) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      searchNodes(query)
        .then((searchResult) => {
          setResults(searchResult)
          setOpen(searchResult.length > 0)
        })
        .catch(() => setResults([]))
    }, 250)

    return () => clearTimeout(debounceRef.current)
  }, [query, shouldSearch])

  const visibleResults = shouldSearch ? results : []
  const isOpen = shouldSearch && open

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        className="input"
        type="text"
        placeholder="SEARCH NODES..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ width: 240 }}
      />
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'var(--color-bg-panel)',
          border: '1px solid var(--color-border-strong)',
          borderTop: 'none',
          maxHeight: 240,
          overflowY: 'auto',
          zIndex: 200,
        }}>
          {visibleResults.map(result => (
            <div
              key={result.id}
              onClick={() => {
                onSelect(result.id)
                setQuery('')
                setOpen(false)
              }}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                borderBottom: '1px solid var(--color-border)',
                transition: 'background 150ms',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-secondary)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span className="node-badge" data-type={result.type}>{result.type}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-primary)' }}>
                {result.label}
              </span>
              {result.year && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
                  {result.year}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
