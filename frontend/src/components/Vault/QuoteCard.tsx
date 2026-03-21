import { useState } from 'react'
import type { Quote } from '../../types'

interface Props {
  quote: Quote
  onPromote: (quoteId: string) => void
  onDelete: (quoteId: string) => void
}

export function QuoteCard({ quote, onPromote, onDelete }: Props) {
  const [confirming, setConfirming] = useState(false)

  const dateStr = quote.createdAt
    ? new Date(quote.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : ''

  return (
    <div className="quote-card">
      <p className="quote-card__content">{quote.content}</p>

      <div className="quote-card__meta">
        <span className="vault-text-label">{quote.sourceTextTitle}</span>
        {quote.page != null && <span>p. {quote.page}</span>}
        {dateStr && <span>{dateStr}</span>}
        {quote.status === 'promoted' && (
          <span style={{ color: 'var(--color-text-accent)' }}>PROMOTED</span>
        )}
      </div>

      {quote.reaction && (
        <p className="quote-card__reaction">{quote.reaction}</p>
      )}

      {quote.status === 'raw' && (
        <div className="quote-card__actions">
          <button className="btn btn--sm btn--accent" onClick={() => onPromote(quote.id)}>
            PROMOTE
          </button>
          {confirming ? (
            <>
              <button className="btn btn--sm" onClick={() => onDelete(quote.id)}>
                CONFIRM DELETE
              </button>
              <button className="btn btn--sm" onClick={() => setConfirming(false)}>
                CANCEL
              </button>
            </>
          ) : (
            <button className="btn btn--sm" onClick={() => setConfirming(true)}>
              DELETE
            </button>
          )}
        </div>
      )}
    </div>
  )
}
