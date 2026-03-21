import { useState, useEffect } from 'react'
import { updateNode } from '../../api/client'
import { useNode } from '../../hooks/useNode'
import { ConnectionList } from './shared'
import { ThinkerDetail } from './ThinkerDetail'
import { ConceptDetail } from './ConceptDetail'
import { ClaimDetail } from './ClaimDetail'
import { TextDetail } from './TextDetail'
import type { NodeType, NodeDetail, ThinkerProperties, ConceptProperties, ClaimProperties, TextProperties } from '../../types'
import { nodeDetailLabel } from '../../types'

interface Props {
  nodeId: string | null
  onClose: () => void
  onNodeClick: (nodeId: string) => void
  onAddEdge?: (sourceNode: { id: string; label: string; type: string }) => void
  onNodeUpdated?: () => void
  onReadText?: (textId: string) => void
  escapeDisabled?: boolean
}

function yearToString(year: number | null | undefined): string {
  return year != null ? String(year) : ''
}

function buildEditForm(data: NodeDetail): Record<string, string> {
  switch (data.type) {
    case 'THINKER': {
      const p: ThinkerProperties = data.properties
      return {
        name: p.name,
        bornYear: yearToString(p.bornYear),
        diedYear: yearToString(p.diedYear),
        tradition: p.tradition ?? '',
        description: p.description ?? '',
      }
    }
    case 'CONCEPT': {
      const p: ConceptProperties = data.properties
      return {
        name: p.name,
        year: yearToString(p.year),
        description: p.description ?? '',
      }
    }
    case 'CLAIM': {
      const p: ClaimProperties = data.properties
      return {
        content: p.content,
        year: yearToString(p.year),
        description: p.description ?? '',
      }
    }
    case 'TEXT': {
      const p: TextProperties = data.properties
      return {
        title: p.title,
        publishedYear: yearToString(p.publishedYear),
        description: p.description ?? '',
      }
    }
  }
}

function buildUpdateBody(type: NodeType, form: Record<string, string>): Record<string, unknown> {
  const body: Record<string, unknown> = { type }

  if (form.name !== undefined) body.name = form.name
  if (form.title !== undefined) body.title = form.title
  if (form.content !== undefined) body.content = form.content

  for (const textField of ['description', 'tradition']) {
    if (form[textField] !== undefined) {
      body[textField] = form[textField] || null
    }
  }

  for (const yearField of ['bornYear', 'diedYear', 'year', 'publishedYear']) {
    if (form[yearField] !== undefined) {
      if (!form[yearField]) {
        body[yearField] = null
      } else {
        const num = Number(form[yearField])
        if (Number.isNaN(num)) throw new Error(`Invalid year: ${form[yearField]}`)
        body[yearField] = num
      }
    }
  }

  return body
}

function TypeDetailSwitch({ data, editing, form, onFieldChange }: {
  data: NodeDetail
  editing: boolean
  form: Record<string, string>
  onFieldChange: (field: string, value: string) => void
}) {
  switch (data.type) {
    case 'THINKER': return <ThinkerDetail properties={data.properties} editing={editing} form={form} onFieldChange={onFieldChange} />
    case 'CONCEPT': return <ConceptDetail properties={data.properties} editing={editing} form={form} onFieldChange={onFieldChange} />
    case 'CLAIM': return <ClaimDetail properties={data.properties} editing={editing} form={form} onFieldChange={onFieldChange} />
    case 'TEXT': return <TextDetail properties={data.properties} editing={editing} form={form} onFieldChange={onFieldChange} />
  }
}

function NodeContent({ data, onNodeClick, onAddEdge, onNodeUpdated, onReadText }: {
  data: NodeDetail
  onNodeClick: (nodeId: string) => void
  onAddEdge?: (sourceNode: { id: string; label: string; type: string }) => void
  onNodeUpdated?: () => void
  onReadText?: (textId: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
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
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      await updateNode(data.id, buildUpdateBody(data.type, form))
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <span className="node-badge" data-type={data.type}>{data.type}</span>
        {editing ? (
          <span className="meta-label" style={{ color: 'var(--color-text-accent)' }}>Editing</span>
        ) : (
          <h2 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 22,
            fontWeight: 400,
            color: 'var(--color-text-primary)',
          }}>
            {nodeLabel}
          </h2>
        )}
      </div>

      <TypeDetailSwitch
        data={data}
        editing={editing}
        form={form}
        onFieldChange={setField}
      />

      {editing ? (
        <>
          {saveError && (
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--color-node-claim)',
              marginBottom: 8,
            }}>
              {saveError}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn" onClick={cancelEdit} style={{ fontSize: 11 }}>CANCEL</button>
            <button
              className="btn"
              onClick={handleSave}
              disabled={saving}
              style={{ fontSize: 11, marginLeft: 'auto', color: 'var(--color-text-accent)' }}
            >
              {saving ? 'SAVING...' : 'SAVE'}
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="btn" onClick={startEdit} style={{ fontSize: 11 }}>EDIT</button>
            {onAddEdge && (
              <button className="btn" onClick={handleAddEdge} style={{ fontSize: 11 }}>ADD EDGE</button>
            )}
            {data.type === 'TEXT' && onReadText && (
              <button
                className="btn"
                onClick={() => onReadText(data.id)}
                style={{ fontSize: 11, color: 'var(--color-node-text)', marginLeft: 'auto' }}
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
      <div style={{
        height: 24,
        width: 120,
        background: 'var(--color-border)',
        marginBottom: 12,
      }} />
      <div style={{
        height: 14,
        width: 200,
        background: 'var(--color-border)',
        marginBottom: 8,
      }} />
      <div style={{
        height: 14,
        width: 160,
        background: 'var(--color-border)',
      }} />
    </div>
  )
}

export function DetailPanel({ nodeId, onClose, onNodeClick, onAddEdge, onNodeUpdated, onReadText, escapeDisabled }: Props) {
  const { data, loading, error, refetch } = useNode(nodeId)

  useEffect(() => {
    if (!nodeId || escapeDisabled) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [nodeId, onClose, escapeDisabled])

  function handleNodeUpdated() {
    refetch()
    onNodeUpdated?.()
  }

  return (
    <div className={`detail-panel ${nodeId ? 'open' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <span className="meta-label">Node Detail</span>
        <button
          className="btn"
          onClick={onClose}
          style={{ padding: '4px 10px', fontSize: 11 }}
        >
          CLOSE
        </button>
      </div>
      {loading ? <PanelSkeleton /> : error ? (
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--color-node-claim)',
        }}>
          {error}
        </div>
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
