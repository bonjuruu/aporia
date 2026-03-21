import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useVault } from '../../hooks/useVault'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { CaptureForm } from './CaptureForm'
import { QuoteCard } from './QuoteCard'
import { PromoteModal } from './PromoteModal'
import type { Quote, GraphNode } from '../../types'

interface Props {
  textId?: string
  textLabel?: string
  onClose: () => void
  onNodeCreated?: (node: GraphNode) => void
}

export function VaultPanel({ textId, textLabel, onClose, onNodeCreated }: Props) {
  const { quotes, loading, error, capture, promote, remove } = useVault(textId)
  const [filter, setFilter] = useState<'raw' | 'all'>('raw')
  const [promoteQuote, setPromoteQuote] = useState<Quote | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<Element | null>(null)

  // Focus management: capture trigger and focus panel on mount
  useEffect(() => {
    triggerRef.current = document.activeElement
    panelRef.current?.focus()
    return () => {
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus()
      }
    }
  }, [])

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  useEscapeKey(promoteQuote === null, handleClose)

  const { filteredQuotes, rawCount } = useMemo(() => {
    const rawQuoteList = quotes.filter(q => q.status === 'raw')
    return {
      filteredQuotes: filter === 'raw' ? rawQuoteList : quotes,
      rawCount: rawQuoteList.length,
    }
  }, [quotes, filter])

  const handlePromoteClick = useCallback((quoteId: string) => {
    const quote = quotes.find(q => q.id === quoteId)
    if (quote) setPromoteQuote(quote)
  }, [quotes])

  const handleDelete = useCallback(async (quoteId: string) => {
    try {
      await remove(quoteId)
    } catch (deleteErr) {
      console.error('Failed to delete quote:', deleteErr)
    }
  }, [remove])

  return (
    <div ref={panelRef} tabIndex={-1} className="vault-panel" role="complementary" aria-label="Quote vault">
      {/* Header */}
      <div className="vault-header">
        <div className="panel-header">
          <span className="meta-label">
            Quote Vault
            {textLabel && <span className="vault-text-label"> · {textLabel}</span>}
          </span>
          <button className="btn btn--sm" onClick={handleClose}>CLOSE</button>
        </div>

        <div className="btn-group">
          <button
            className={`btn btn--sm${filter === 'raw' ? ' btn--accent' : ''}`}
            onClick={() => setFilter('raw')}
          >
            RAW ({rawCount})
          </button>
          <button
            className={`btn btn--sm${filter === 'all' ? ' btn--accent' : ''}`}
            onClick={() => setFilter('all')}
          >
            ALL ({quotes.length})
          </button>
        </div>
      </div>

      {/* Capture form */}
      <div className="vault-capture">
        <CaptureForm
          onCapture={capture}
          preselectedTextId={textId}
          preselectedTextLabel={textLabel}
        />
      </div>

      {/* Quote list */}
      <div className="vault-list">
        {loading && (
          <div className="meta-label--status vault-status">LOADING...</div>
        )}

        {error && (
          <div className="inline-error vault-status" role="alert">{error}</div>
        )}

        {!loading && !error && filteredQuotes.length === 0 && (
          <div className="vault-empty">
            {filter === 'raw' ? 'No raw quotes. Capture one above.' : 'No quotes yet.'}
          </div>
        )}

        {filteredQuotes.map(quote => (
          <QuoteCard
            key={quote.id}
            quote={quote}
            onPromote={handlePromoteClick}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Promote modal */}
      <PromoteModal
        open={promoteQuote !== null}
        quote={promoteQuote}
        onClose={() => setPromoteQuote(null)}
        onPromote={promote}
        onNodeCreated={onNodeCreated}
      />
    </div>
  )
}
