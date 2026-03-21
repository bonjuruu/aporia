import { useState } from 'react'
import { createNode, createEdge } from '../../api/client'
import { NodeSearchInput } from '../Curation/NodeSearchInput'
import { UpdateProgressForm } from '../Reading/UpdateProgressForm'
import { SessionLog } from '../Reading/SessionLog'
import { nodeDetailToGraphNode, isEdgeType } from '../../types'
import type { GraphNode, GraphEdge, NodeType, EdgeType, SearchResult, CreateNodeBody, ReadingProgress } from '../../types'

interface Props {
  textId: string
  textTitle: string
  textYear?: number | null
  textDescription?: string | null
  onNodeCreated: (node: GraphNode) => void
  onEdgeCreated: (edge: GraphEdge) => void
  progress?: ReadingProgress | null
  onProgressUpdated: (progress: ReadingProgress) => void
}

const QUICK_ADD_TYPES: { value: NodeType; label: string }[] = [
  { value: 'CONCEPT', label: 'Concept' },
  { value: 'CLAIM', label: 'Claim' },
  { value: 'THINKER', label: 'Thinker' },
]

// Exhaustive mapping: every EdgeType must be classified as 'into_text' or 'from_node'.
// Adding a new EdgeType to the EDGE_TYPES const without adding it here causes a compile error.
const EDGE_DIRECTION: Record<EdgeType, 'into_text' | 'from_node'> = {
  APPEARS_IN:   'into_text',
  ARGUES:       'into_text',
  COINED:       'into_text',
  WROTE:        'into_text',
  INFLUENCED:   'from_node',
  REFUTES:      'from_node',
  SUPPORTS:     'from_node',
  QUALIFIES:    'from_node',
  BUILDS_ON:    'from_node',
  DERIVES_FROM: 'from_node',
  RESPONDS_TO:  'from_node',
}
const EDGE_TYPES_INTO_TEXT = new Set(
  (Object.keys(EDGE_DIRECTION) as EdgeType[]).filter(k => EDGE_DIRECTION[k] === 'into_text')
)
const ALL_EDGE_TYPES = Object.keys(EDGE_DIRECTION) as EdgeType[]

export function ReadingSidebar({ textId, textTitle, textYear, textDescription, onNodeCreated, onEdgeCreated, progress, onProgressUpdated }: Props) {
  const [addType, setAddType] = useState<NodeType>('CONCEPT')
  const [addName, setAddName] = useState('')
  const [addDescription, setAddDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [edgeTarget, setEdgeTarget] = useState<SearchResult | null>(null)
  const [edgeType, setEdgeType] = useState<EdgeType>('APPEARS_IN')
  const [linkingEdge, setLinkingEdge] = useState(false)
  const [edgeError, setEdgeError] = useState<string | null>(null)

  async function handleCreateNode() {
    if (!addName.trim() || creating) return
    setCreating(true)
    setCreateError(null)
    try {
      const base = addDescription ? { description: addDescription } : {}
      const body: CreateNodeBody = addType === 'CLAIM'
        ? { type: 'CLAIM', content: addName, ...base }
        : addType === 'CONCEPT'
          ? { type: 'CONCEPT', name: addName, ...base }
          : { type: 'THINKER', name: addName, ...base }
      const detail = await createNode(body)
      onNodeCreated(nodeDetailToGraphNode(detail))
      // Auto-link the new node to the current text with a type-appropriate edge
      const autoEdgeType: EdgeType = addType === 'THINKER' ? 'WROTE' : 'APPEARS_IN'
      try {
        const edge = await createEdge({
          source: detail.id,
          target: textId,
          type: autoEdgeType,
          sourceTextId: textId,
        })
        onEdgeCreated(edge)
      } catch (linkErr) {
        setCreateError(`Node created, but failed to link: ${linkErr instanceof Error ? linkErr.message : 'Unknown error'}`)
      }
      setAddName('')
      setAddDescription('')
    } catch (createNodeErr) {
      setCreateError(createNodeErr instanceof Error ? createNodeErr.message : 'Failed to create node')
    } finally {
      setCreating(false)
    }
  }

  async function handleLinkEdge() {
    if (linkingEdge) return
    setEdgeError(null)
    if (!edgeTarget) return
    setLinkingEdge(true)
    try {
      // For "into text" edge types, the linked node is the source and this text is the target.
      // For other types, the linked node is the target (e.g. this text INFLUENCED the node).
      const intoText = EDGE_TYPES_INTO_TEXT.has(edgeType)
      const edge = await createEdge({
        source: intoText ? edgeTarget.id : textId,
        target: intoText ? textId : edgeTarget.id,
        type: edgeType,
        sourceTextId: textId,
      })
      onEdgeCreated(edge)
      setEdgeTarget(null)
    } catch (createEdgeErr) {
      setEdgeError(createEdgeErr instanceof Error ? createEdgeErr.message : 'Failed to create edge')
    } finally {
      setLinkingEdge(false)
    }
  }

  return (
    <div className="reading-sidebar">
      {/* Text metadata */}
      <div className="sidebar-section">
        <span className="node-badge" data-type="TEXT">TEXT</span>
        <h2 className="sidebar-text-title">
          {textTitle}
        </h2>
        {textYear != null && (
          <div className="meta-label mt-2">{textYear}</div>
        )}
        {textDescription && (
          <div className="content-text mt-2">{textDescription}</div>
        )}
      </div>

      {/* Divider */}
      <div className="sidebar-divider" />

      {/* Reading progress */}
      <UpdateProgressForm
        key={progress?.lastReadAt ?? 'new'}
        textId={textId}
        currentProgress={progress}
        onUpdated={onProgressUpdated}
      />

      {/* Divider */}
      <div className="sidebar-divider" />

      {/* Quick add node */}
      <div className="sidebar-section">
        <div className="meta-label sidebar-section__heading">Quick Add Node</div>

        <div className="btn-group">
          {QUICK_ADD_TYPES.map(t => (
            <button
              key={t.value}
              className="btn btn--sm"
              onClick={() => setAddType(t.value)}
              style={{
                color: addType === t.value ? `var(--color-node-${t.value.toLowerCase()})` : undefined,
                borderColor: addType === t.value ? `var(--color-node-${t.value.toLowerCase()})` : undefined,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <label className="meta-label sidebar-field-label" htmlFor="sidebar-add-name">
          {addType === 'CLAIM' ? 'Content' : 'Name'}
        </label>
        <input
          id="sidebar-add-name"
          className="input sidebar-field-input"
          placeholder={addType === 'CLAIM' ? 'Claim content...' : 'Name...'}
          value={addName}
          onChange={e => setAddName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreateNode()}
        />
        <label className="meta-label sidebar-field-label" htmlFor="sidebar-add-desc">
          Description
        </label>
        <input
          id="sidebar-add-desc"
          className="input sidebar-field-input"
          placeholder="Description (optional)"
          value={addDescription}
          onChange={e => setAddDescription(e.target.value)}
        />
        {createError && (
          <div className="inline-error" role="alert">{createError}</div>
        )}
        <button className="btn btn--full" onClick={handleCreateNode} disabled={creating || !addName.trim()}>
          {creating ? 'CREATING...' : 'CREATE NODE'}
        </button>
      </div>

      {/* Divider */}
      <div className="sidebar-divider" />

      {/* Quick link edge to this text */}
      <div>
        <div className="meta-label sidebar-section__heading">Link Node to This Text</div>

        <label className="meta-label sidebar-field-label" htmlFor="sidebar-edge-target">
          Target Node
        </label>
        <div className="sidebar-field-input">
          <NodeSearchInput
            id="sidebar-edge-target"
            value={edgeTarget}
            onChange={setEdgeTarget}
            placeholder="Search for node..."
          />
        </div>

        <label className="meta-label sidebar-field-label" htmlFor="sidebar-edge-type">
          Edge Type
        </label>
        <select
          id="sidebar-edge-type"
          className="select sidebar-field-input"
          value={edgeType}
          onChange={e => { if (isEdgeType(e.target.value)) setEdgeType(e.target.value) }}
        >
          {ALL_EDGE_TYPES.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {edgeError && (
          <div className="inline-error" role="alert">{edgeError}</div>
        )}
        <button className="btn btn--full" onClick={handleLinkEdge} disabled={linkingEdge || !edgeTarget}>
          {linkingEdge ? 'LINKING...' : 'LINK EDGE'}
        </button>
      </div>

      {/* Session log */}
      {progress && progress.sessionNotes.length > 0 && (
        <>
          <div className="sidebar-divider" />
          <div className="sidebar-section">
            <SessionLog sessionNotes={progress.sessionNotes} />
          </div>
        </>
      )}
    </div>
  )
}
