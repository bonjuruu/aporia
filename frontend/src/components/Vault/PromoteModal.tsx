import { useState, useEffect, useId, useCallback } from 'react'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { NODE_TYPES } from '../../types'
import type { NodeType, CreateNodeBody, Quote, GraphNode } from '../../types'

interface Props {
  open: boolean
  quote: Quote | null
  onClose: () => void
  onPromote: (quoteId: string, nodeData: CreateNodeBody) => Promise<GraphNode>
  onNodeCreated?: (node: GraphNode) => void
}

interface FormState {
  name: string
  title: string
  content: string
  description: string
  tradition: string
  bornYear: string
  diedYear: string
  year: string
  publishedYear: string
}

const EMPTY_FORM: FormState = {
  name: '',
  title: '',
  content: '',
  description: '',
  tradition: '',
  bornYear: '',
  diedYear: '',
  year: '',
  publishedYear: '',
}

function optionalYear(value: string): number | undefined {
  return value !== '' ? Number(value) : undefined
}

function buildRequestBody(type: NodeType, form: FormState): CreateNodeBody {
  switch (type) {
    case 'THINKER':
      return {
        type,
        name: form.name,
        ...(form.description ? { description: form.description } : {}),
        ...(form.tradition ? { tradition: form.tradition } : {}),
        ...(form.bornYear !== '' ? { bornYear: optionalYear(form.bornYear) } : {}),
        ...(form.diedYear !== '' ? { diedYear: optionalYear(form.diedYear) } : {}),
      }
    case 'CONCEPT':
      return {
        type,
        name: form.name,
        ...(form.description ? { description: form.description } : {}),
        ...(form.year !== '' ? { year: optionalYear(form.year) } : {}),
      }
    case 'CLAIM':
      return {
        type,
        content: form.content,
        ...(form.description ? { description: form.description } : {}),
        ...(form.year !== '' ? { year: optionalYear(form.year) } : {}),
      }
    case 'TEXT':
      return {
        type,
        title: form.title,
        ...(form.description ? { description: form.description } : {}),
        ...(form.publishedYear !== '' ? { publishedYear: optionalYear(form.publishedYear) } : {}),
      }
  }
}

export function PromoteModal({ open, quote, onClose, onPromote, onNodeCreated }: Props) {
  const [selectedType, setSelectedType] = useState<NodeType>('CLAIM')
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const trapRef = useFocusTrap(open)
  const fieldIdPrefix = useId()

  // Reset form and pre-fill content when quote changes
  useEffect(() => {
    if (!quote) return
    setForm({ ...EMPTY_FORM, content: quote.content })
    setSelectedType('CLAIM')
    setError(null)
  }, [quote])

  const handleClose = useCallback(() => {
    setError(null)
    setSubmitting(false)
    onClose()
  }, [onClose])

  useEscapeKey(open, handleClose)

  function setField(field: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit() {
    if (!quote || submitting) return
    setSubmitting(true)
    setError(null)

    try {
      const node = await onPromote(quote.id, buildRequestBody(selectedType, form))
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
              <div className="form-field">
                <label className="meta-label" htmlFor={`${fieldIdPrefix}-bornYear`}>Born Year</label>
                <input className="input" id={`${fieldIdPrefix}-bornYear`} type="number" value={form.bornYear} onChange={e => setField('bornYear', e.target.value)} />
              </div>
              <div className="form-field">
                <label className="meta-label" htmlFor={`${fieldIdPrefix}-diedYear`}>Died Year</label>
                <input className="input" id={`${fieldIdPrefix}-diedYear`} type="number" value={form.diedYear} onChange={e => setField('diedYear', e.target.value)} />
              </div>
            </div>
          )}

          {(selectedType === 'CONCEPT' || selectedType === 'CLAIM') && (
            <div className="form-field">
              <label className="meta-label" htmlFor={`${fieldIdPrefix}-year`}>Year</label>
              <input className="input" id={`${fieldIdPrefix}-year`} type="number" value={form.year} onChange={e => setField('year', e.target.value)} />
            </div>
          )}

          {selectedType === 'TEXT' && (
            <div className="form-field">
              <label className="meta-label" htmlFor={`${fieldIdPrefix}-publishedYear`}>Published Year</label>
              <input className="input" id={`${fieldIdPrefix}-publishedYear`} type="number" value={form.publishedYear} onChange={e => setField('publishedYear', e.target.value)} />
            </div>
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
