import type { GraphNode, ApiEdge, NodeDetail, Quote, ReadingProgress, SearchResult, AuthUser } from '../types'

export function buildGraphNode(overrides?: Partial<GraphNode>): GraphNode {
  return {
    id: crypto.randomUUID(),
    label: 'Plato',
    type: 'THINKER',
    year: -428,
    ...overrides,
  }
}

export function buildGraphEdge(overrides?: Partial<ApiEdge>): ApiEdge {
  return {
    id: crypto.randomUUID(),
    source: crypto.randomUUID(),
    target: crypto.randomUUID(),
    type: 'INFLUENCED',
    ...overrides,
  }
}

export function buildThinkerDetail(overrides?: Partial<NodeDetail & { type: 'THINKER' }>): NodeDetail {
  return {
    id: crypto.randomUUID(),
    type: 'THINKER',
    properties: { name: 'Plato', bornYear: -428, diedYear: -348, tradition: 'Platonism', description: 'Greek philosopher' },
    outgoing: [],
    incoming: [],
    ...overrides,
  }
}

export function buildQuote(overrides?: Partial<Quote>): Quote {
  return {
    id: crypto.randomUUID(),
    content: 'The unexamined life is not worth living',
    sourceTextId: crypto.randomUUID(),
    sourceTextTitle: 'Apology',
    page: 38,
    reaction: '',
    status: 'raw',
    promotedNodeId: '',
    createdAt: '2026-03-20T10:00:00Z',
    ...overrides,
  }
}

export function buildReadingProgress(overrides?: Partial<ReadingProgress>): ReadingProgress {
  return {
    textId: crypto.randomUUID(),
    textTitle: 'The Republic',
    chapter: '5',
    totalChapters: 10,
    lastReadAt: '2026-03-20T10:00:00Z',
    sessionNotes: [],
    ...overrides,
  }
}

export function buildSearchResult(overrides?: Partial<SearchResult>): SearchResult {
  return {
    id: crypto.randomUUID(),
    label: 'Plato',
    type: 'THINKER',
    year: -428,
    ...overrides,
  }
}

export function buildAuthUser(overrides?: Partial<AuthUser>): AuthUser {
  return {
    id: crypto.randomUUID(),
    email: 'philosopher@academy.edu',
    ...overrides,
  }
}
