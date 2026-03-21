import { useState } from 'react'
import { createNode, createEdge } from '../../api/client'
import { NodeSearchInput } from '../Curation/NodeSearchInput'
import { nodeDetailLabel } from '../../types'
import type { GraphNode, GraphEdge, NodeType, EdgeType, SearchResult } from '../../types'

interface Props {
  textId: string
  textTitle: string
  textYear?: number | null
  textDescription?: string | null
  onNodeCreated: (node: GraphNode) => void
  onEdgeCreated: (edge: GraphEdge) => void
}

const QUICK_ADD_TYPES: { value: NodeType; label: string }[] = [
  { value: 'CONCEPT', label: 'Concept' },
  { value: 'CLAIM', label: 'Claim' },
  { value: 'THINKER', label: 'Thinker' },
]

// Edge types where the linked node points TO the text (node → text)
const EDGE_TYPES_INTO_TEXT: EdgeType[] = [
  'APPEARS_IN', 'ARGUES', 'COINED', 'WROTE',
]
// Edge types where direction is between the linked node and something else
const EDGE_TYPES_FROM_NODE: EdgeType[] = [
  'INFLUENCED', 'REFUTES', 'SUPPORTS', 'QUALIFIES', 'BUILDS_ON', 'DERIVES_FROM', 'RESPONDS_TO',
]
const ALL_EDGE_TYPES: EdgeType[] = [...EDGE_TYPES_INTO_TEXT, ...EDGE_TYPES_FROM_NODE]

export function ReadingSidebar({ textId, textTitle, textYear, textDescription, onNodeCreated, onEdgeCreated }: Props) {
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
    if (!addName.trim()) return
    setCreating(true)
    setCreateError(null)
    try {
      const body: Record<string, unknown> = {
        type: addType,
        ...(addType === 'CLAIM' ? { content: addName } : { name: addName }),
        ...(addDescription ? { description: addDescription } : {}),
      }
      const detail = await createNode(body)
      const node: GraphNode = {
        id: detail.id,
        label: nodeDetailLabel(detail),
        type: detail.type,
      }
      onNodeCreated(node)
      setAddName('')
      setAddDescription('')
    } catch (createNodeErr) {
      setCreateError(createNodeErr instanceof Error ? createNodeErr.message : 'Failed to create node')
    } finally {
      setCreating(false)
    }
  }

  async function handleLinkEdge() {
    if (!edgeTarget) return
    setLinkingEdge(true)
    setEdgeError(null)
    try {
      // For "into text" edge types, the linked node is the source and this text is the target.
      // For other types, the linked node is the target (e.g. this text INFLUENCED the node).
      const intoText = (EDGE_TYPES_INTO_TEXT as string[]).includes(edgeType)
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
      <div style={{ marginBottom: 24 }}>
        <span className="node-badge" data-type="TEXT" style={{ marginBottom: 8, display: 'inline-block' }}>TEXT</span>
        <h2 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 22,
          fontWeight: 400,
          color: 'var(--color-text-primary)',
          marginTop: 8,
        }}>
          {textTitle}
        </h2>
        {textYear != null && (
          <div className="meta-label" style={{ marginTop: 8 }}>{textYear}</div>
        )}
        {textDescription && (
          <div className="content-text" style={{ marginTop: 8 }}>{textDescription}</div>
        )}
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--color-border-strong)', marginBottom: 20 }} />

      {/* Quick add node */}
      <div style={{ marginBottom: 24 }}>
        <div className="meta-label" style={{ marginBottom: 10 }}>Quick Add Node</div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
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

        <input
          className="input"
          placeholder={addType === 'CLAIM' ? 'Claim content...' : 'Name...'}
          value={addName}
          onChange={e => setAddName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreateNode()}
          style={{ marginBottom: 8 }}
        />
        <input
          className="input"
          placeholder="Description (optional)"
          value={addDescription}
          onChange={e => setAddDescription(e.target.value)}
          style={{ marginBottom: 8 }}
        />
        {createError && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-node-claim)', marginBottom: 8 }}>
            {createError}
          </div>
        )}
        <button className="btn btn--full" onClick={handleCreateNode} disabled={creating || !addName.trim()}>
          {creating ? 'CREATING...' : 'CREATE NODE'}
        </button>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--color-border-strong)', marginBottom: 20 }} />

      {/* Quick link edge to this text */}
      <div>
        <div className="meta-label" style={{ marginBottom: 10 }}>Link Node to This Text</div>

        <div style={{ marginBottom: 8 }}>
          <NodeSearchInput
            value={edgeTarget}
            onChange={setEdgeTarget}
            placeholder="Search for node..."
          />
        </div>

        <select
          className="select"
          value={edgeType}
          onChange={e => setEdgeType(e.target.value as EdgeType)}
          style={{ marginBottom: 8 }}
        >
          {ALL_EDGE_TYPES.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {edgeError && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-node-claim)', marginBottom: 8 }}>
            {edgeError}
          </div>
        )}
        <button className="btn btn--full" onClick={handleLinkEdge} disabled={linkingEdge || !edgeTarget}>
          {linkingEdge ? 'LINKING...' : 'LINK EDGE'}
        </button>
      </div>
    </div>
  )
}
