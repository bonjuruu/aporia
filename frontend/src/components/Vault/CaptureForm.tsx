import { useState, useEffect, useRef, useId } from 'react'
import { NodeSearchInput } from '../Curation/NodeSearchInput'
import type { SearchResult, CreateQuoteBody } from '../../types'

interface Props {
  onCapture: (data: CreateQuoteBody) => Promise<unknown>
  preselectedTextId?: string
  preselectedTextLabel?: string
}

export function CaptureForm({ onCapture, preselectedTextId, preselectedTextLabel }: Props) {
  const [content, setContent] = useState('')
  const [sourceText, setSourceText] = useState<SearchResult | null>(null)
  const [page, setPage] = useState('')
  const [reaction, setReaction] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fieldIdPrefix = useId()

  // Sync sourceText when preselected props change
  useEffect(() => {
    if (preselectedTextId && preselectedTextLabel) {
      setSourceText({ id: preselectedTextId, label: preselectedTextLabel, type: 'TEXT', year: null })
    } else {
      setSourceText(null)
    }
  }, [preselectedTextId, preselectedTextLabel])

  async function handleSubmit() {
    if (!content.trim() || !sourceText || submitting) return

    setSubmitting(true)
    setError(null)

    try {
      await onCapture({
        content: content.trim(),
        sourceTextId: sourceText.id,
        ...(page !== '' ? { page: Number(page) } : {}),
        ...(reaction.trim() ? { reaction: reaction.trim() } : {}),
      })
      setContent('')
      setPage('')
      setReaction('')
      if (!preselectedTextId) setSourceText(null)
      textareaRef.current?.focus()
    } catch (captureErr) {
      setError(captureErr instanceof Error ? captureErr.message : 'Failed to capture quote')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
      <div className="form-field">
        <label className="meta-label" htmlFor={`${fieldIdPrefix}-content`}>Quote</label>
        <textarea
          ref={textareaRef}
          className="input input--resizable input--serif"
          id={`${fieldIdPrefix}-content`}
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Paste or type a passage..."
          rows={4}
          required
        />
      </div>

      {!preselectedTextId && (
        <div className="form-field">
          <label className="meta-label">Source Text</label>
          <NodeSearchInput
            value={sourceText}
            onChange={setSourceText}
            filterType="TEXT"
            placeholder="Search texts..."
          />
        </div>
      )}

      <div className="form-field-pair">
        <div className="form-field">
          <label className="meta-label" htmlFor={`${fieldIdPrefix}-page`}>Page</label>
          <input
            className="input"
            id={`${fieldIdPrefix}-page`}
            type="number"
            value={page}
            onChange={e => setPage(e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div className="form-field">
          <label className="meta-label" htmlFor={`${fieldIdPrefix}-reaction`}>Reaction</label>
          <input
            className="input"
            id={`${fieldIdPrefix}-reaction`}
            value={reaction}
            onChange={e => setReaction(e.target.value)}
            placeholder="Optional"
          />
        </div>
      </div>

      {error && <div className="inline-error mb-3" role="alert">{error}</div>}

      <button
        className="btn btn--sm btn--accent"
        type="submit"
        disabled={submitting || !content.trim() || !sourceText}
      >
        {submitting ? 'CAPTURING...' : 'CAPTURE'}
      </button>
    </form>
  )
}
