import { useState, useEffect, useId, useCallback } from 'react'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { YearInput } from '../shared/YearInput'
import { NODE_TYPES } from '../../types'
import { EMPTY_NODE_FORM, buildNodeRequestBody } from '../../utils/nodeForm'
import type { NodeType, CreateNodeBody, Quote, GraphNode } from '../../types'
import type { NodeFormState } from '../../utils/nodeForm'

interface Props {
  open: boolean
  quote: Quote | null
  onClose: () => void
  onPromote: (quoteId: string, nodeData: CreateNodeBody) => Promise<GraphNode>
  onNodeCreated?: (node: GraphNode) => void
}

export function PromoteModal({ open, quote, onClose, onPromote, onNodeCreated }: Props) {
  const [selectedType, setSelectedType] = useState<NodeType>('CLAIM')
  const [form, setForm] = useState<NodeFormState>(EMPTY_NODE_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const trapRef = useFocusTrap(open)
  const fieldIdPrefix = useId()

  // Reset form and pre-fill content when quote changes
  useEffect(() => {
    if (!quote) return
    setForm({ ...EMPTY_NODE_FORM, content: quote.content })
    setSelectedType('CLAIM')
    setError(null)
  }, [quote])

  const handleClose = useCallback(() => {
    setError(null)
    setSubmitting(false)
    onClose()
  }, [onClose])

  useEscapeKey(open, handleClose)

  function setField(field: keyof NodeFormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit() {
    if (!quote || submitting) return
    setSubmitting(true)
    setError(null)

    try {
      const node = await onPromote(quote.id, buildNodeRequestBody(selectedType, form))
      onNodeCreated?.(node)
      handleClose()
    } catch (promoteErr) {
      setError(promoteErr instanceof Error ? promoteErr.message : 'Failed to promote quote')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open || !quote) return null

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        ref={trapRef}
        className="modal modal--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="promote-modal-title"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <span id="promote-modal-title" className="meta-label">Promote to Node</span>
          <button className="btn btn--sm" onClick={handleClose}>CLOSE</button>
        </div>

        {/* Original quote */}
        <div className="promote-quote-preview">
          <span className="meta-label sidebar-field-label">Original Quote</span>
          <p className="quote-card__content">{quote.content}</p>
          <div className="promote-quote-source">
            {quote.sourceTextTitle}
            {quote.page != null && ` · p. ${quote.page}`}
          </div>
        </div>

        {/* Type picker */}
        <div className="form-field">
          <span className="meta-label sidebar-field-label">Node Type</span>
          <div className="btn-group">
            {NODE_TYPES.map(type => (
              <button
                key={type}
                className={`btn btn--sm${selectedType === type ? ' btn--accent' : ''}`}
                type="button"
                onClick={() => setSelectedType(type)}
                data-type={type}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Node creation form */}
        <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
          {(selectedType === 'THINKER' || selectedType === 'CONCEPT') && (
            <div className="form-field">
              <label className="meta-label" htmlFor={`${fieldIdPrefix}-name`}>Name</label>
              <input
                className="input"
                id={`${fieldIdPrefix}-name`}
                value={form.name}
                onChange={e => setField('name', e.target.value)}
                required
              />
            </div>
          )}

          {selectedType === 'TEXT' && (
            <div className="form-field">
              <label className="meta-label" htmlFor={`${fieldIdPrefix}-title`}>Title</label>
              <input
                className="input"
                id={`${fieldIdPrefix}-title`}
                value={form.title}
                onChange={e => setField('title', e.target.value)}
                required
              />
            </div>
          )}

          {selectedType === 'CLAIM' && (
            <div className="form-field">
              <label className="meta-label" htmlFor={`${fieldIdPrefix}-content`}>Claim</label>
              <textarea
                className="input input--resizable input--serif"
                id={`${fieldIdPrefix}-content`}
                value={form.content}
                onChange={e => setField('content', e.target.value)}
                required
                rows={3}
              />
            </div>
          )}

          <div className="form-field">
            <label className="meta-label" htmlFor={`${fieldIdPrefix}-description`}>Description</label>
            <textarea
              className="input input--resizable"
              id={`${fieldIdPrefix}-description`}
              value={form.description}
              onChange={e => setField('description', e.target.value)}
              rows={2}
            />
          </div>

          {selectedType === 'THINKER' && (
            <div className="form-field-pair">
              <YearInput label="Born Year" value={form.bornYear} onChange={v => setField('bornYear', v)} />
              <YearInput label="Died Year" value={form.diedYear} onChange={v => setField('diedYear', v)} />
            </div>
          )}

          {(selectedType === 'CONCEPT' || selectedType === 'CLAIM') && (
            <YearInput label="Year" value={form.year} onChange={v => setField('year', v)} />
          )}

          {selectedType === 'TEXT' && (
            <YearInput label="Published Year" value={form.publishedYear} onChange={v => setField('publishedYear', v)} />
          )}

          {error && <div className="inline-error mb-3" role="alert">{error}</div>}

          <div className="form-actions">
            <button className="btn btn--sm" type="button" onClick={handleClose}>CANCEL</button>
            <button className="btn btn--sm btn--accent ml-auto" type="submit" disabled={submitting}>
              {submitting ? 'PROMOTING...' : 'PROMOTE'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
