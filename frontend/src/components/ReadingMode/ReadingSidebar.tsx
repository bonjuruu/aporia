import { useState, useMemo, useEffect } from 'react'
import { createNode, createEdge } from '../../api/client'
import { NodeSearchInput } from '../Curation/NodeSearchInput'
import { UpdateProgressForm } from '../Reading/UpdateProgressForm'
import { SessionLog } from '../Reading/SessionLog'
import { formatYear } from '../../utils/formatYear'
import { isEdgeType, EDGE_TYPES } from '../../types'
import { VALID_PAIRS, getValidEdgeTypesForPair, inferSourceTargetForText } from '../../types/edgePairs'
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

  // Filter edge types based on selected node type + TEXT
  const validEdgeTypes = useMemo(() => {
    if (!edgeTarget) {
      // Only TEXT known — show types where TEXT is on either side
      return EDGE_TYPES.filter(et =>
        VALID_PAIRS[et].some(([s, t]) => s === 'TEXT' || t === 'TEXT')
      )
    }
    return getValidEdgeTypesForPair('TEXT', edgeTarget.type)
  }, [edgeTarget])

  // Auto-select first valid type when list changes
  useEffect(() => {
    if (validEdgeTypes.length > 0 && !validEdgeTypes.includes(edgeType)) {
      setEdgeType(validEdgeTypes[0])
    }
  }, [validEdgeTypes, edgeType])

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
      const node = await createNode(body)
      onNodeCreated(node)
      // Auto-link the new node to the current text with a type-appropriate edge
      const autoEdgeType: EdgeType = addType === 'THINKER' ? 'WROTE' : 'APPEARS_IN'
      try {
        const { source, target } = inferSourceTargetForText(autoEdgeType, addType, textId, node.id)
        const edge = await createEdge({
          source,
          target,
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
    if (linkingEdge || !edgeTarget) return
    setEdgeError(null)
    setLinkingEdge(true)
    try {
      const { source, target } = inferSourceTargetForText(edgeType, edgeTarget.type, textId, edgeTarget.id)
      const edge = await createEdge({
        source,
        target,
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

  // Preview direction
  const preview = edgeTarget
    ? inferSourceTargetForText(edgeType, edgeTarget.type, textId, edgeTarget.id)
    : null
  const previewFromLabel = preview?.source === textId ? textTitle : edgeTarget?.label
  const previewToLabel = preview?.target === textId ? textTitle : edgeTarget?.label

  return (
    <div className="reading-sidebar">
      {/* Text metadata */}
      <div className="sidebar-section">
        <span className="node-badge" data-type="TEXT">TEXT</span>
        <h2 className="sidebar-text-title">
          {textTitle}
        </h2>
        {textYear != null && (
          <div className="meta-label mt-2">{formatYear(textYear)}</div>
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

      {/* Link edge to this text */}
      <div>
        <div className="meta-label sidebar-section__heading">Link to This Text</div>

        <label className="meta-label sidebar-field-label" htmlFor="sidebar-edge-target">
          Node
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
          Relationship
        </label>
        <select
          id="sidebar-edge-type"
          className="select sidebar-field-input"
          value={edgeType}
          onChange={e => { if (isEdgeType(e.target.value)) setEdgeType(e.target.value) }}
        >
          {validEdgeTypes.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {preview && previewFromLabel && previewToLabel && (
          <div className="edge-direction-preview">
            <span className="edge-direction-preview__label">{previewFromLabel}</span>
            <span className="edge-direction-preview__arrow">{edgeType} &rarr;</span>
            <span className="edge-direction-preview__label">{previewToLabel}</span>
          </div>
        )}

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
