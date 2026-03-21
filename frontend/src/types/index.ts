export const NODE_TYPES = ['THINKER', 'CONCEPT', 'CLAIM', 'TEXT'] as const
export type NodeType = typeof NODE_TYPES[number]

export const EDGE_TYPES = [
  'INFLUENCED', 'COINED', 'WROTE', 'ARGUES', 'APPEARS_IN',
  'REFUTES', 'SUPPORTS', 'QUALIFIES', 'BUILDS_ON', 'DERIVES_FROM', 'RESPONDS_TO',
] as const
export type EdgeType = typeof EDGE_TYPES[number]

export function isEdgeType(value: string): value is EdgeType {
  return (EDGE_TYPES as readonly string[]).includes(value)
}

export interface GraphNode {
  id: string
  label: string
  type: NodeType
  year: number | null
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

/** Extract the node ID from a GraphEdge source/target (string before d3 simulation, GraphNode after). */
export function edgeEndpointId(endpoint: string | GraphNode): string {
  return typeof endpoint === 'string' ? endpoint : endpoint.id
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

/** Edge shape as returned by the API (before d3 mutates source/target into objects). */
export type ApiEdge = Omit<GraphEdge, 'source' | 'target'> & { source: string; target: string }

export interface ConnectionEntry {
  edge: ApiEdge
  node: GraphNode
}

// Per-type property interfaces
export interface ThinkerProperties {
  name: string
  bornYear: number | null
  diedYear: number | null
  tradition: string | null
  description: string | null
}

export interface ConceptProperties {
  name: string
  year: number | null
  description: string | null
}

export interface ClaimProperties {
  content: string
  year: number | null
  description: string | null
}

export interface TextProperties {
  title: string
  publishedYear: number | null
  description: string | null
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
    default: { const _exhaustive: never = detail; return (_exhaustive as NodeDetail).type }
  }
}

/** Convert a NodeDetail (API response) to a GraphNode (graph state). */
export function nodeDetailToGraphNode(detail: NodeDetail): GraphNode {
  const year = detail.type === 'THINKER' ? detail.properties.bornYear
    : detail.type === 'TEXT' ? detail.properties.publishedYear
    : detail.properties.year
  return {
    id: detail.id,
    label: nodeDetailLabel(detail),
    type: detail.type,
    year: year ?? null,
  }
}

// Per-type edit form state (all fields as strings for controlled inputs)
export interface ThinkerEditForm {
  type: 'THINKER'
  name: string
  bornYear: string
  diedYear: string
  tradition: string
  description: string
}

export interface ConceptEditForm {
  type: 'CONCEPT'
  name: string
  year: string
  description: string
}

export interface ClaimEditForm {
  type: 'CLAIM'
  content: string
  year: string
  description: string
}

export interface TextEditForm {
  type: 'TEXT'
  title: string
  publishedYear: string
  description: string
}

export type EditForm = ThinkerEditForm | ConceptEditForm | ClaimEditForm | TextEditForm

export interface SearchResult {
  id: string
  label: string
  type: NodeType
  year: number | null
}

export interface AuthUser {
  id: string
  email: string
}

// Annotations (per-user stance + notes on nodes)
export const STANCES = ['agree', 'disagree', 'uncertain', 'unread'] as const
export type Stance = typeof STANCES[number]

export interface UserAnnotation {
  userId: string
  nodeId: string
  stance: Stance
  notes: string
}

export interface AnnotationRequest {
  stance: Stance
  notes: string
}

// Quote Vault types
export type QuoteStatus = 'raw' | 'promoted'

export interface Quote {
  id: string
  content: string
  sourceTextId: string
  sourceTextTitle: string
  page: number | null
  reaction: string
  status: QuoteStatus
  promotedNodeId: string
  createdAt: string
}

export interface CreateQuoteBody {
  content: string
  sourceTextId: string
  page?: number
  reaction?: string
}

export interface UpdateQuoteBody {
  reaction?: string
  page?: number
}

// Request body types for create/update node
export type CreateNodeBody =
  | { type: 'THINKER'; name: string; description?: string; tradition?: string; bornYear?: number; diedYear?: number }
  | { type: 'CONCEPT'; name: string; description?: string; year?: number }
  | { type: 'CLAIM'; content: string; description?: string; year?: number }
  | { type: 'TEXT'; title: string; description?: string; publishedYear?: number }

export type UpdateNodeBody =
  | { type: 'THINKER'; name: string; description?: string | null; tradition?: string | null; bornYear?: number | null; diedYear?: number | null }
  | { type: 'CONCEPT'; name: string; description?: string | null; year?: number | null }
  | { type: 'CLAIM'; content: string; description?: string | null; year?: number | null }
  | { type: 'TEXT'; title: string; description?: string | null; publishedYear?: number | null }
