import { useState, useEffect, useId, useCallback } from 'react'
import { createNode } from '../../api/client'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { YearInput } from '../shared/YearInput'
import { NODE_TYPES } from '../../types'
import type { NodeType, CreateNodeBody, GraphNode } from '../../types'

interface Props {
  open: boolean
  onClose: () => void
  onNodeCreated: (node: GraphNode) => void
  initialType?: NodeType | null
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
  if (value === '') return undefined
  const n = Number(value)
  return Number.isNaN(n) ? undefined : n
}

function buildRequestBody(type: NodeType, form: FormState): CreateNodeBody {
  switch (type) {
    case 'THINKER':
      return {
        type,
        name: form.name,
        ...(form.description ? { description: form.description } : {}),
        ...(form.tradition ? { tradition: form.tradition } : {}),
        ...( form.bornYear !== '' ? { bornYear: optionalYear(form.bornYear) } : {}),
        ...( form.diedYear !== '' ? { diedYear: optionalYear(form.diedYear) } : {}),
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

export function AddNodeModal({ open, onClose, onNodeCreated, initialType }: Props) {
  const [selectedType, setSelectedType] = useState<NodeType | null>(initialType ?? null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const trapRef = useFocusTrap(open)

  // Sync initialType when modal opens
  useEffect(() => {
    if (open) setSelectedType(initialType ?? null)
  }, [open, initialType])
  const fieldIdPrefix = useId()

  function fieldId(name: string) {
    return `${fieldIdPrefix}-${name}`
  }

  const reset = useCallback(() => {
    setSelectedType(null)
    setForm(EMPTY_FORM)
    setError(null)
    setSubmitting(false)
  }, [])

  const handleClose = useCallback(() => {
    reset()
    onClose()
  }, [onClose, reset])
  useEscapeKey(open, handleClose)

  function setField(field: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit() {
    if (!selectedType || submitting) return
    setSubmitting(true)
    setError(null)

    try {
      const node = await createNode(buildRequestBody(selectedType, form))
      onNodeCreated(node)
      handleClose()
    } catch (submitErr) {
      setError(submitErr instanceof Error ? submitErr.message : 'Failed to create node')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        ref={trapRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-node-modal-title"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <span id="add-node-modal-title" className="meta-label">{selectedType ? `New ${selectedType}` : 'Create Node'}</span>
          <button className="btn btn--sm" onClick={handleClose}>CLOSE</button>
        </div>

        {!selectedType ? (
          <div className="type-picker">
            {NODE_TYPES.map(type => (
              <button
                key={type}
                className="type-picker-btn"
                data-type={type}
                onClick={() => setSelectedType(type)}
              >
                {type}
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
            {(selectedType === 'THINKER' || selectedType === 'CONCEPT') && (
              <div className="form-field">
                <label className="meta-label" htmlFor={fieldId('name')}>Name</label>
                <input
                  className="input"
                  id={fieldId('name')}
                  value={form.name}
                  onChange={e => setField('name', e.target.value)}
                  required
                  autoFocus
                />
              </div>
            )}

            {selectedType === 'TEXT' && (
              <div className="form-field">
                <label className="meta-label" htmlFor={fieldId('title')}>Title</label>
                <input
                  className="input"
                  id={fieldId('title')}
                  value={form.title}
                  onChange={e => setField('title', e.target.value)}
                  required
                  autoFocus
                />
              </div>
            )}

            {selectedType === 'CLAIM' && (
              <div className="form-field">
                <label className="meta-label" htmlFor={fieldId('content')}>Claim</label>
                <textarea
                  className="input input--resizable"
                  id={fieldId('content')}
                  value={form.content}
                  onChange={e => setField('content', e.target.value)}
                  required
                  autoFocus
                  rows={3}
                />
              </div>
            )}

            <div className="form-field">
              <label className="meta-label" htmlFor={fieldId('description')}>Description</label>
              <textarea
                className="input input--resizable"
                id={fieldId('description')}
                value={form.description}
                onChange={e => setField('description', e.target.value)}
                rows={3}
              />
            </div>

            {selectedType === 'THINKER' && (
              <div className="form-field">
                <label className="meta-label" htmlFor={fieldId('tradition')}>Tradition</label>
                <input
                  className="input"
                  id={fieldId('tradition')}
                  value={form.tradition}
                  onChange={e => setField('tradition', e.target.value)}
                />
              </div>
            )}

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

            {error && (
              <div className="inline-error mb-3" role="alert">{error}</div>
            )}

            <div className="form-actions">
              <button
                className="btn btn--sm"
                type="button"
                onClick={() => { setSelectedType(null); setForm(EMPTY_FORM); setError(null) }}
              >
                BACK
              </button>
              <button
                className="btn btn--sm btn--accent ml-auto"
                type="submit"
                disabled={submitting}
              >
                {submitting ? 'CREATING...' : 'CREATE'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
