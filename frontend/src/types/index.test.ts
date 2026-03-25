import { isEdgeType, edgeEndpointId, nodeDetailLabel, nodeDetailToGraphNode } from './index'
import { buildThinkerDetail } from '../test/factories'
import type { GraphNode, NodeDetail } from './index'

describe('isEdgeType', () => {
  it('returns true for valid edge types', () => {
    expect(isEdgeType('INFLUENCED')).toBe(true)
    expect(isEdgeType('RESPONDS_TO')).toBe(true)
  })

  it('returns false for invalid edge types', () => {
    expect(isEdgeType('FAKE_TYPE')).toBe(false)
    expect(isEdgeType('')).toBe(false)
  })
})

describe('edgeEndpointId', () => {
  it('returns string directly when endpoint is a string', () => {
    expect(edgeEndpointId('abc-123')).toBe('abc-123')
  })

  it('returns id when endpoint is a GraphNode object', () => {
    const node = { id: 'node-456', label: 'Plato', type: 'THINKER', year: -428 } as GraphNode
    expect(edgeEndpointId(node)).toBe('node-456')
  })
})

describe('nodeDetailLabel', () => {
  it('returns name for THINKER', () => {
    const detail: NodeDetail = {
      id: '1', type: 'THINKER',
      properties: { name: 'Aristotle', bornYear: -384, diedYear: -322, tradition: null, description: null },
      outgoing: [], incoming: [],
    }
    expect(nodeDetailLabel(detail)).toBe('Aristotle')
  })

  it('returns name for CONCEPT', () => {
    const detail: NodeDetail = {
      id: '2', type: 'CONCEPT',
      properties: { name: 'Eudaimonia', year: null, description: null },
      outgoing: [], incoming: [],
    }
    expect(nodeDetailLabel(detail)).toBe('Eudaimonia')
  })

  it('returns content for CLAIM', () => {
    const detail: NodeDetail = {
      id: '3', type: 'CLAIM',
      properties: { content: 'Virtue is knowledge', year: null, description: null },
      outgoing: [], incoming: [],
    }
    expect(nodeDetailLabel(detail)).toBe('Virtue is knowledge')
  })

  it('returns title for TEXT', () => {
    const detail: NodeDetail = {
      id: '4', type: 'TEXT',
      properties: { title: 'Nicomachean Ethics', publishedYear: -340, description: null },
      outgoing: [], incoming: [],
    }
    expect(nodeDetailLabel(detail)).toBe('Nicomachean Ethics')
  })
})

describe('nodeDetailToGraphNode', () => {
  it('maps THINKER using bornYear', () => {
    const detail = buildThinkerDetail()
    const node = nodeDetailToGraphNode(detail)
    expect(node).toEqual({
      id: detail.id,
      label: 'Plato',
      type: 'THINKER',
      year: -428,
    })
  })

  it('maps TEXT using publishedYear', () => {
    const detail: NodeDetail = {
      id: 'text-1', type: 'TEXT',
      properties: { title: 'Republic', publishedYear: -375, description: null },
      outgoing: [], incoming: [],
    }
    const node = nodeDetailToGraphNode(detail)
    expect(node.year).toBe(-375)
    expect(node.label).toBe('Republic')
  })

  it('maps CONCEPT using year', () => {
    const detail: NodeDetail = {
      id: 'concept-1', type: 'CONCEPT',
      properties: { name: 'Forms', year: -380, description: null },
      outgoing: [], incoming: [],
    }
    const node = nodeDetailToGraphNode(detail)
    expect(node.year).toBe(-380)
  })

  it('returns null year when property year is null', () => {
    const detail: NodeDetail = {
      id: 'claim-1', type: 'CLAIM',
      properties: { content: 'Some claim', year: null, description: null },
      outgoing: [], incoming: [],
    }
    const node = nodeDetailToGraphNode(detail)
    expect(node.year).toBeNull()
  })
})
