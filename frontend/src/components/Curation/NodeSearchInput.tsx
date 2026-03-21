import { useState, useEffect, useRef, useMemo, useId, useCallback } from 'react'
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
  const [searched, setSearched] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const abortRef = useRef<AbortController | null>(null)
  const seqRef = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()

  const shouldSearch = query.length >= 2

  useEffect(() => {
    if (!shouldSearch) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      const seq = ++seqRef.current
      searchNodes(query, controller.signal)
        .then((searchResultList) => {
          if (seq !== seqRef.current) return
          let filtered = excludeId
            ? searchResultList.filter(r => r.id !== excludeId)
            : searchResultList
          if (filterType) {
            filtered = filtered.filter(r => r.type === filterType)
          }
          setResults(filtered)
          setSearched(true)
          setOpen(true)
          setActiveIndex(-1)
        })
        .catch((searchErr) => {
          if (searchErr instanceof DOMException && searchErr.name === 'AbortError') return
          if (seq !== seqRef.current) return
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
  const isOpen = shouldSearch && open && searched

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectResult = useCallback((result: SearchResult) => {
    onChange(result)
    setQuery('')
    setOpen(false)
    setSearched(false)
    setResults([])
    setActiveIndex(-1)
  }, [onChange])

  function handleInputKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex(i => i < visibleResults.length - 1 ? i + 1 : 0)
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex(i => i > 0 ? i - 1 : visibleResults.length - 1)
        break
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < visibleResults.length) {
          selectResult(visibleResults[activeIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        setActiveIndex(-1)
        break
    }
  }

  const activeDescendant = isOpen && activeIndex >= 0
    ? `${listboxId}-option-${activeIndex}`
    : undefined

  if (value) {
    return (
      <div id={id} className="node-search-selected">
        <span className="node-badge" data-type={value.type}>{value.type}</span>
        <span className="node-search-selected__label">{value.label}</span>
        <button
          className="btn btn--sm"
          type="button"
          onClick={() => onChange(null)}
          aria-label={`Clear selection: ${value.label}`}
        >
          ×
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="node-search-container">
      <input
        className="input"
        id={id}
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-activedescendant={activeDescendant}
        aria-autocomplete="list"
        placeholder={placeholder}
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); setSearched(false); setActiveIndex(-1) }}
        onKeyDown={handleInputKeyDown}
      />
      {isOpen && (
        <div
          className="node-search-dropdown"
          role="listbox"
          id={listboxId}
        >
          {visibleResults.length === 0 ? (
            <div className="node-search-info">NO RESULTS</div>
          ) : visibleResults.map((result, index) => (
            <div
              key={result.id}
              id={`${listboxId}-option-${index}`}
              className={`node-search-dropdown-item${index === activeIndex ? ' active' : ''}`}
              role="option"
              aria-selected={index === activeIndex}
              onClick={() => selectResult(result)}
            >
              <span className="node-badge" data-type={result.type}>{result.type}</span>
              <span className="node-search-result__label">{result.label}</span>
              {result.year != null && (
                <span className="node-search-result__type">{result.year}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
