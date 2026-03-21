import type { GraphData, NodeDetail, SearchResult, AuthUser } from '../types'

const BASE = 'http://localhost:8080/api'

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
    localStorage.removeItem('aporia_token')
    window.location.href = '/'
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed: ${res.status}`)
  }
  return res.json()
}

// Graph
export function fetchGraph(): Promise<GraphData> {
  return request(`${BASE}/graph`)
}

export function fetchSubgraph(textId: string): Promise<GraphData> {
  return request(`${BASE}/graph/subgraph/${textId}`)
}

export function fetchPath(fromId: string, toId: string): Promise<GraphData> {
  return request(`${BASE}/graph/path?from=${fromId}&to=${toId}`)
}

// Nodes
export function fetchNode(id: string): Promise<NodeDetail> {
  return request(`${BASE}/nodes/${id}`)
}

export function searchNodes(query: string): Promise<SearchResult[]> {
  return request(`${BASE}/search?q=${encodeURIComponent(query)}`)
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
