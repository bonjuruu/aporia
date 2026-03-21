import { useState, useEffect, useRef, useMemo } from 'react'
import { searchNodes } from '../../api/client'
import type { NodeType, SearchResult } from '../../types'

interface Props {
  id?: string
  value: SearchResult | null
  onChange: (result: SearchResult | null) => void
  placeholder?: string
  excludeId?: string
  filterType?: NodeType
}

export function NodeSearchInput({ id, value, onChange, placeholder = 'SEARCH...', excludeId, filterType }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const abortRef = useRef<AbortController | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const shouldSearch = query.length >= 2

  useEffect(() => {
    if (!shouldSearch) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      searchNodes(query, controller.signal)
        .then((searchResultList) => {
          let filtered = excludeId
            ? searchResultList.filter(r => r.id !== excludeId)
            : searchResultList
          if (filterType) {
            filtered = filtered.filter(r => r.type === filterType)
          }
          setResults(filtered)
          setOpen(filtered.length > 0)
        })
        .catch((searchErr) => {
          if (searchErr instanceof DOMException && searchErr.name === 'AbortError') return
          setResults([])
        })
    }, 250)
    return () => {
      clearTimeout(debounceRef.current)
      abortRef.current?.abort()
    }
  }, [query, shouldSearch, excludeId, filterType])

  // Derive visible results — hide stale results when query is too short
  const visibleResults = useMemo(
    () => shouldSearch ? results : [],
    [shouldSearch, results]
  )
  const isOpen = shouldSearch && open && visibleResults.length > 0

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (value) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="node-badge" data-type={value.type}>{value.type}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-primary)', flex: 1 }}>
          {value.label}
        </span>
        <button
          className="btn"
          type="button"
          onClick={() => onChange(null)}
          style={{ padding: '2px 8px', fontSize: 10 }}
        >
          ×
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        className="input"
        id={id}
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
      />
      {isOpen && (
        <div className="node-search-dropdown">
          {visibleResults.map(result => (
            <div
              key={result.id}
              className="node-search-dropdown-item"
              role="button"
              tabIndex={0}
              onClick={() => {
                onChange(result)
                setQuery('')
                setOpen(false)
                setResults([])
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onChange(result)
                  setQuery('')
                  setOpen(false)
                  setResults([])
                }
              }}
            >
              <span className="node-badge" data-type={result.type}>{result.type}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-primary)' }}>
                {result.label}
              </span>
              {result.year != null && (
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
