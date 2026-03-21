export type NodeType = 'THINKER' | 'CONCEPT' | 'CLAIM' | 'TEXT'
export type EdgeType = 'INFLUENCED' | 'COINED' | 'WROTE' | 'ARGUES' |
  'APPEARS_IN' | 'REFUTES' | 'SUPPORTS' | 'QUALIFIES' |
  'BUILDS_ON' | 'DERIVES_FROM' | 'RESPONDS_TO'

export function isEdgeType(value: string): value is EdgeType {
  return [
    'INFLUENCED', 'COINED', 'WROTE', 'ARGUES', 'APPEARS_IN',
    'REFUTES', 'SUPPORTS', 'QUALIFIES', 'BUILDS_ON', 'DERIVES_FROM', 'RESPONDS_TO',
  ].includes(value)
}

export interface GraphNode {
  id: string
  label: string
  type: NodeType
  year?: number | null
  // d3-force mutates these directly at runtime
  x?: number
  y?: number
  vx?: number
  vy?: number
  fx?: number | null
  fy?: number | null
}

export interface GraphEdge {
  id: string
  source: string | GraphNode
  target: string | GraphNode
  type: EdgeType
  description?: string
  sourceTextId?: string
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface ConnectionEntry {
  edge: {
    id: string
    source: string
    target: string
    type: EdgeType
    description: string
    sourceTextId: string
  }
  node: GraphNode
}

// Per-type property interfaces
export interface ThinkerProperties {
  name: string
  bornYear?: number | null
  diedYear?: number | null
  tradition?: string | null
  description?: string | null
}

export interface ConceptProperties {
  name: string
  year?: number | null
  description?: string | null
}

export interface ClaimProperties {
  content: string
  year?: number | null
  description?: string | null
}

export interface TextProperties {
  title: string
  publishedYear?: number | null
  description?: string | null
}

// Discriminated union for NodeDetail
export type NodeDetail =
  | { id: string; type: 'THINKER'; properties: ThinkerProperties; outgoing: ConnectionEntry[]; incoming: ConnectionEntry[] }
  | { id: string; type: 'CONCEPT'; properties: ConceptProperties; outgoing: ConnectionEntry[]; incoming: ConnectionEntry[] }
  | { id: string; type: 'CLAIM'; properties: ClaimProperties; outgoing: ConnectionEntry[]; incoming: ConnectionEntry[] }
  | { id: string; type: 'TEXT'; properties: TextProperties; outgoing: ConnectionEntry[]; incoming: ConnectionEntry[] }

// Helper to extract the label from any NodeDetail variant
export function nodeDetailLabel(detail: NodeDetail): string {
  switch (detail.type) {
    case 'THINKER': return detail.properties.name
    case 'CONCEPT': return detail.properties.name
    case 'CLAIM': return detail.properties.content
    case 'TEXT': return detail.properties.title
  }
}

export interface SearchResult {
  id: string
  label: string
  type: NodeType
  year?: number | null
}

export interface AuthUser {
  id: string
  email: string
}
