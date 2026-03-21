import { useState, useEffect, useId } from 'react'
import { createNode } from '../../api/client'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { nodeDetailLabel } from '../../types'
import type { NodeType, GraphNode } from '../../types'

interface Props {
  open: boolean
  onClose: () => void
  onNodeCreated: (node: GraphNode) => void
  initialType?: NodeType | null
}

const NODE_TYPES: NodeType[] = ['THINKER', 'CONCEPT', 'CLAIM', 'TEXT']

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

function buildRequestBody(type: NodeType, form: FormState): Record<string, unknown> {
  const body: Record<string, unknown> = { type }

  if (type === 'THINKER' || type === 'CONCEPT') body.name = form.name
  if (type === 'TEXT') body.title = form.title
  if (type === 'CLAIM') body.content = form.content
  if (form.description) body.description = form.description

  if (type === 'THINKER') {
    if (form.tradition) body.tradition = form.tradition
    if (form.bornYear) body.bornYear = Number(form.bornYear)
    if (form.diedYear) body.diedYear = Number(form.diedYear)
  }
  if (type === 'CONCEPT' || type === 'CLAIM') {
    if (form.year) body.year = Number(form.year)
  }
  if (type === 'TEXT') {
    if (form.publishedYear) body.publishedYear = Number(form.publishedYear)
  }

  return body
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

  function reset() {
    setSelectedType(null)
    setForm(EMPTY_FORM)
    setError(null)
    setSubmitting(false)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function setField(field: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit() {
    if (!selectedType || submitting) return
    setSubmitting(true)
    setError(null)

    try {
      const detail = await createNode(buildRequestBody(selectedType, form))
      const label = nodeDetailLabel(detail)
      const yearByType = detail.type === 'THINKER' ? detail.properties.bornYear
        : detail.type === 'TEXT' ? detail.properties.publishedYear
        : detail.properties.year
      const year = yearByType ?? null
      const graphNode: GraphNode = {
        id: detail.id,
        label,
        type: detail.type,
        year: (year ?? null) as number | null,
      }
      onNodeCreated(graphNode)
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
        aria-label={selectedType ? `New ${selectedType}` : 'Create Node'}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span className="meta-label">{selectedType ? `New ${selectedType}` : 'Create Node'}</span>
          <button className="btn" onClick={handleClose} style={{ padding: '4px 10px', fontSize: 11 }}>
            CLOSE
          </button>
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
                  className="input"
                  id={fieldId('content')}
                  value={form.content}
                  onChange={e => setField('content', e.target.value)}
                  required
                  autoFocus
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>
            )}

            <div className="form-field">
              <label className="meta-label" htmlFor={fieldId('description')}>Description</label>
              <textarea
                className="input"
                id={fieldId('description')}
                value={form.description}
                onChange={e => setField('description', e.target.value)}
                rows={3}
                style={{ resize: 'vertical' }}
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
              <div style={{ display: 'flex', gap: 12 }}>
                <div className="form-field" style={{ flex: 1 }}>
                  <label className="meta-label" htmlFor={fieldId('bornYear')}>Born Year</label>
                  <input
                    className="input"
                    id={fieldId('bornYear')}
                    type="number"
                    value={form.bornYear}
                    onChange={e => setField('bornYear', e.target.value)}
                  />
                </div>
                <div className="form-field" style={{ flex: 1 }}>
                  <label className="meta-label" htmlFor={fieldId('diedYear')}>Died Year</label>
                  <input
                    className="input"
                    id={fieldId('diedYear')}
                    type="number"
                    value={form.diedYear}
                    onChange={e => setField('diedYear', e.target.value)}
                  />
                </div>
              </div>
            )}

            {(selectedType === 'CONCEPT' || selectedType === 'CLAIM') && (
              <div className="form-field">
                <label className="meta-label" htmlFor={fieldId('year')}>Year</label>
                <input
                  className="input"
                  id={fieldId('year')}
                  type="number"
                  value={form.year}
                  onChange={e => setField('year', e.target.value)}
                />
              </div>
            )}

            {selectedType === 'TEXT' && (
              <div className="form-field">
                <label className="meta-label" htmlFor={fieldId('publishedYear')}>Published Year</label>
                <input
                  className="input"
                  id={fieldId('publishedYear')}
                  type="number"
                  value={form.publishedYear}
                  onChange={e => setField('publishedYear', e.target.value)}
                />
              </div>
            )}

            {error && (
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--color-node-claim)',
                marginBottom: 12,
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                className="btn"
                type="button"
                onClick={() => { setSelectedType(null); setForm(EMPTY_FORM); setError(null) }}
                style={{ fontSize: 11 }}
              >
                BACK
              </button>
              <button
                className="btn"
                type="submit"
                disabled={submitting}
                style={{ fontSize: 11, marginLeft: 'auto', color: 'var(--color-text-accent)' }}
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
