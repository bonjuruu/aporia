export type NodeType = 'THINKER' | 'CONCEPT' | 'CLAIM' | 'TEXT'
export type EdgeType = 'INFLUENCED' | 'COINED' | 'WROTE' | 'ARGUES' |
  'APPEARS_IN' | 'REFUTES' | 'SUPPORTS' | 'QUALIFIES' |
  'BUILDS_ON' | 'DERIVES_FROM' | 'RESPONDS_TO'

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

export interface NodeDetail {
  id: string
  type: NodeType
  properties: Record<string, unknown>
  outgoing: ConnectionEntry[]
  incoming: ConnectionEntry[]
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
