import { useState, useEffect, useRef, useCallback } from 'react'
import { updateNode } from '../../api/client'
import { useNode } from '../../hooks/useNode'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { ConnectionList } from './ConnectionList'
import { ThinkerDetail } from './ThinkerDetail'
import { ConceptDetail } from './ConceptDetail'
import { ClaimDetail } from './ClaimDetail'
import { TextDetail } from './TextDetail'
import type { NodeType, NodeDetail, ThinkerProperties, ConceptProperties, ClaimProperties, TextProperties, EditForm, ThinkerEditForm, ConceptEditForm, ClaimEditForm, TextEditForm, UpdateNodeBody } from '../../types'
import { nodeDetailLabel } from '../../types'

interface Props {
  nodeId: string | null
  onClose: () => void
  onNodeClick: (nodeId: string) => void
  onAddEdge?: (sourceNode: { id: string; label: string; type: NodeType }) => void
  onNodeUpdated?: () => void
  onReadText?: (textId: string) => void
  escapeDisabled?: boolean
}

function yearToString(year: number | null | undefined): string {
  return year != null ? String(year) : ''
}

function buildEditForm(data: NodeDetail): EditForm {
  switch (data.type) {
    case 'THINKER': {
      const p: ThinkerProperties = data.properties
      return {
        type: 'THINKER',
        name: p.name,
        bornYear: yearToString(p.bornYear),
        diedYear: yearToString(p.diedYear),
        tradition: p.tradition ?? '',
        description: p.description ?? '',
      } satisfies ThinkerEditForm
    }
    case 'CONCEPT': {
      const p: ConceptProperties = data.properties
      return {
        type: 'CONCEPT',
        name: p.name,
        year: yearToString(p.year),
        description: p.description ?? '',
      } satisfies ConceptEditForm
    }
    case 'CLAIM': {
      const p: ClaimProperties = data.properties
      return {
        type: 'CLAIM',
        content: p.content,
        year: yearToString(p.year),
        description: p.description ?? '',
      } satisfies ClaimEditForm
    }
    case 'TEXT': {
      const p: TextProperties = data.properties
      return {
        type: 'TEXT',
        title: p.title,
        publishedYear: yearToString(p.publishedYear),
        description: p.description ?? '',
      } satisfies TextEditForm
    }
  }
}

function parseOptionalYear(value: string): number | null {
  if (!value) return null
  const num = Number(value)
  if (Number.isNaN(num)) throw new Error(`Invalid year: ${value}`)
  return num
}

function validateRequiredFields(form: EditForm): string | null {
  switch (form.type) {
    case 'THINKER':
    case 'CONCEPT':
      if (!form.name.trim()) return 'Name is required'
      break
    case 'CLAIM':
      if (!form.content.trim()) return 'Content is required'
      break
    case 'TEXT':
      if (!form.title.trim()) return 'Title is required'
      break
  }
  return null
}

function buildUpdateBody(form: EditForm): UpdateNodeBody {
  switch (form.type) {
    case 'THINKER':
      return {
        type: form.type,
        name: form.name,
        bornYear: parseOptionalYear(form.bornYear),
        diedYear: parseOptionalYear(form.diedYear),
        tradition: form.tradition || null,
        description: form.description || null,
      }
    case 'CONCEPT':
      return {
        type: form.type,
        name: form.name,
        year: parseOptionalYear(form.year),
        description: form.description || null,
      }
    case 'CLAIM':
      return {
        type: form.type,
        content: form.content,
        year: parseOptionalYear(form.year),
        description: form.description || null,
      }
    case 'TEXT':
      return {
        type: form.type,
        title: form.title,
        publishedYear: parseOptionalYear(form.publishedYear),
        description: form.description || null,
      }
  }
}

function TypeDetailSwitch({ data, editing, form, onFieldChange }: {
  data: NodeDetail
  editing: boolean
  form: EditForm
  onFieldChange: (field: string, value: string) => void
}) {
  switch (data.type) {
    case 'THINKER': return <ThinkerDetail properties={data.properties} editing={editing} form={form as ThinkerEditForm} onFieldChange={onFieldChange} />
    case 'CONCEPT': return <ConceptDetail properties={data.properties} editing={editing} form={form as ConceptEditForm} onFieldChange={onFieldChange} />
    case 'CLAIM': return <ClaimDetail properties={data.properties} editing={editing} form={form as ClaimEditForm} onFieldChange={onFieldChange} />
    case 'TEXT': return <TextDetail properties={data.properties} editing={editing} form={form as TextEditForm} onFieldChange={onFieldChange} />
  }
}

function NodeContent({ data, onNodeClick, onAddEdge, onNodeUpdated, onReadText }: {
  data: NodeDetail
  onNodeClick: (nodeId: string) => void
  onAddEdge?: (sourceNode: { id: string; label: string; type: NodeType }) => void
  onNodeUpdated?: () => void
  onReadText?: (textId: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<EditForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const nodeLabel = nodeDetailLabel(data)

  function startEdit() {
    setForm(buildEditForm(data))
    setSaveError(null)
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setSaveError(null)
  }

  function setField(field: string, value: string) {
    setForm(prev => {
      if (!prev) return prev
      if (!(field in prev)) return prev
      return { ...prev, [field]: value } as EditForm
    })
  }

  async function handleSave() {
    if (!form) return
    // Client-side required field validation
    const requiredFieldErr = validateRequiredFields(form)
    if (requiredFieldErr) {
      setSaveError(requiredFieldErr)
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      await updateNode(data.id, buildUpdateBody(form))
      setEditing(false)
      onNodeUpdated?.()
    } catch (saveErr) {
      setSaveError(saveErr instanceof Error ? saveErr.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  function handleAddEdge() {
    onAddEdge?.({ id: data.id, label: nodeLabel, type: data.type })
  }

  return (
    <div>
      <div className="panel-node-header">
        <span className="node-badge" data-type={data.type}>{data.type}</span>
        {editing ? (
          <span className="meta-label" style={{ color: 'var(--color-text-accent)' }}>Editing</span>
        ) : (
          <h2 className="panel-node-title">{nodeLabel}</h2>
        )}
      </div>

      {(!editing || form) && (
        <TypeDetailSwitch
          data={data}
          editing={editing}
          form={form ?? buildEditForm(data)}
          onFieldChange={setField}
        />
      )}

      {editing ? (
        <>
          {saveError && (
            <div className="inline-error" role="alert">{saveError}</div>
          )}
          <div className="panel-actions">
            <button className="btn btn--sm" onClick={cancelEdit}>CANCEL</button>
            <button
              className="btn btn--sm"
              onClick={handleSave}
              disabled={saving}
              style={{ marginLeft: 'auto', color: 'var(--color-text-accent)' }}
            >
              {saving ? 'SAVING...' : 'SAVE'}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="panel-actions panel-actions--view">
            <button className="btn btn--sm" onClick={startEdit}>EDIT</button>
            {onAddEdge && (
              <button className="btn btn--sm" onClick={handleAddEdge}>ADD EDGE</button>
            )}
            {data.type === 'TEXT' && onReadText && (
              <button
                className="btn btn--sm"
                onClick={() => onReadText(data.id)}
                style={{ marginLeft: 'auto', color: 'var(--color-node-text)' }}
              >
                READ
              </button>
            )}
          </div>
          <ConnectionList label="Outgoing" connections={data.outgoing} onNodeClick={onNodeClick} />
          <ConnectionList label="Incoming" connections={data.incoming} onNodeClick={onNodeClick} />
        </>
      )}
    </div>
  )
}

function PanelSkeleton() {
  return (
    <div>
      <div className="panel-skeleton-block" style={{ height: 24, width: 120, marginBottom: 12 }} />
      <div className="panel-skeleton-block" style={{ height: 14, width: 200, marginBottom: 8 }} />
      <div className="panel-skeleton-block" style={{ height: 14, width: 160 }} />
    </div>
  )
}

export function DetailPanel({ nodeId, onClose, onNodeClick, onAddEdge, onNodeUpdated, onReadText, escapeDisabled }: Props) {
  const { data, loading, error, refetch } = useNode(nodeId)
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<Element | null>(null)

  useEffect(() => {
    if (nodeId && panelRef.current) {
      // Remember what had focus before the panel opened
      triggerRef.current = document.activeElement
      panelRef.current.focus()
    }
  }, [nodeId])

  const handleClose = useCallback(() => {
    const trigger = triggerRef.current
    onClose()
    // Return focus to the element that was focused before the panel opened
    if (trigger instanceof HTMLElement) {
      trigger.focus()
    }
  }, [onClose])

  useEscapeKey(!!nodeId && !escapeDisabled, handleClose)

  function handleNodeUpdated() {
    refetch()
    onNodeUpdated?.()
  }

  return (
    <div ref={panelRef} tabIndex={-1} className={`detail-panel ${nodeId ? 'open' : ''}`} role="complementary" aria-label="Node detail">
      <div className="panel-header">
        <span className="meta-label">Node Detail</span>
        <button className="btn btn--sm" onClick={handleClose}>CLOSE</button>
      </div>
      {loading ? <PanelSkeleton /> : error ? (
        <div className="inline-error" role="alert">{error}</div>
      ) : data ? (
        <NodeContent
          key={data.id}
          data={data}
          onNodeClick={onNodeClick}
          onAddEdge={onAddEdge}
          onNodeUpdated={handleNodeUpdated}
          onReadText={onReadText}
        />
      ) : null}
    </div>
  )
}
