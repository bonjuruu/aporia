import type { EdgeType, GraphData, GraphEdge, NodeDetail, SearchResult, AuthUser } from '../types'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api'

if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
  console.warn('VITE_API_URL is not set — API calls will use localhost fallback')
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('aporia_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { ...authHeaders(), ...options?.headers },
  })
  if (res.status === 401) {
    const token = localStorage.getItem('aporia_token')
    if (token) {
      localStorage.removeItem('aporia_token')
      window.location.href = '/'
    }
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed: ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  const text = await res.text()
  return text ? JSON.parse(text) : (undefined as T)
}

// Graph
export function fetchGraph(): Promise<GraphData> {
  return request(`${BASE}/graph`)
}

export function fetchSubgraph(textId: string): Promise<GraphData> {
  return request(`${BASE}/graph/subgraph/${textId}`)
}

export function fetchPath(fromId: string, toId: string): Promise<GraphData> {
  return request(`${BASE}/graph/path?from=${encodeURIComponent(fromId)}&to=${encodeURIComponent(toId)}`)
}

// Nodes
export function fetchNode(id: string): Promise<NodeDetail> {
  return request(`${BASE}/nodes/${id}`)
}

export function searchNodes(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  return request(`${BASE}/search?q=${encodeURIComponent(query)}`, { signal })
}

// Nodes — mutations
export function createNode(body: Record<string, unknown>): Promise<NodeDetail> {
  return request(`${BASE}/nodes`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateNode(id: string, body: Record<string, unknown>): Promise<{ status: string }> {
  return request(`${BASE}/nodes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

// Edges — mutations
export function createEdge(body: {
  source: string
  target: string
  type: EdgeType
  description?: string
  sourceTextId?: string
}): Promise<GraphEdge> {
  return request(`${BASE}/edges`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

// Auth
export function login(email: string, password: string): Promise<{ token: string }> {
  return request(`${BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function register(email: string, password: string): Promise<{ token: string }> {
  return request(`${BASE}/auth/register`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function fetchMe(): Promise<AuthUser> {
  return request(`${BASE}/auth/me`)
}
