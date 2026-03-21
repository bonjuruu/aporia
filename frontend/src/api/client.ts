import type { EdgeType, GraphData, GraphNode, GraphEdge, NodeDetail, SearchResult, AuthUser, CreateNodeBody, UpdateNodeBody, Quote, CreateQuoteBody, UpdateQuoteBody } from '../types'

const BASE = '/api'

function getCSRFToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)aporia_csrf=([^;]+)/)
  return match ? match[1] : ''
}

function requestHeaders(method: string, hasBody: boolean): HeadersInit {
  const headers: Record<string, string> = {}
  if (hasBody) headers['Content-Type'] = 'application/json'
  if (method !== 'GET' && method !== 'HEAD') {
    const csrfToken = getCSRFToken()
    if (csrfToken) headers['X-CSRF-Token'] = csrfToken
  }
  return headers
}

class UnauthorizedError extends Error {
  constructor() { super('Unauthorized') }
}

function handle401(): never {
  window.dispatchEvent(new Event('aporia:unauthorized'))
  throw new UnauthorizedError()
}

export { UnauthorizedError }

async function parseErrorBody(res: Response): Promise<string> {
  const text = await res.text().catch(() => '')
  if (!text) return `Request failed: ${res.status}`
  try {
    const json = JSON.parse(text)
    if (json.error) return json.error
  } catch { /* not JSON */ }
  return `Request failed: ${res.status} — ${text.slice(0, 200)}`
}

interface RequestOptions extends RequestInit {
  skipAuth401?: boolean
  allow204?: boolean
}

const DEFAULT_TIMEOUT_MS = 30_000

async function request<T>(url: string, options?: RequestOptions): Promise<T> {
  const method = options?.method ?? 'GET'
  const hasBody = options?.body != null
  const skipAuth401 = options?.skipAuth401
  const timeoutController = new AbortController()
  const timeoutId = options?.signal ? undefined : setTimeout(() => timeoutController.abort(), DEFAULT_TIMEOUT_MS)
  const signal = options?.signal ?? timeoutController.signal
  let res: Response
  try {
    res = await fetch(url, {
      ...options,
      signal,
      credentials: 'include',
      headers: { ...requestHeaders(method, hasBody), ...options?.headers },
    })
  } catch (fetchErr) {
    clearTimeout(timeoutId)
    if (fetchErr instanceof DOMException && fetchErr.name === 'AbortError') {
      if (!options?.signal?.aborted && timeoutController.signal.aborted) {
        throw new Error('Request timed out')
      }
      throw fetchErr
    }
    throw new Error('Network error — check your connection and try again')
  }
  clearTimeout(timeoutId)
  if (res.status === 401 && !skipAuth401) handle401()
  if (!res.ok) {
    const message = await parseErrorBody(res)
    throw new Error(message)
  }
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    if (options?.allow204) return undefined as unknown as T
    throw new Error(`Unexpected empty response (${res.status}) from ${url}`)
  }
  const text = await res.text()
  if (!text) {
    if (options?.allow204) return undefined as unknown as T
    throw new Error(`Unexpected empty body from ${url}`)
  }
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`Invalid JSON response from ${url}`)
  }
}

async function requestVoid(url: string, options?: RequestOptions): Promise<void> {
  await request<unknown>(url, { ...options, allow204: true })
}

// Graph
export function fetchGraph(signal?: AbortSignal): Promise<GraphData> {
  return request(`${BASE}/graph`, signal ? { signal } : undefined)
}

export function fetchSubgraph(textId: string, signal?: AbortSignal): Promise<GraphData> {
  return request(`${BASE}/graph/subgraph/${encodeURIComponent(textId)}`, signal ? { signal } : undefined)
}

export function fetchPath(fromId: string, toId: string, signal?: AbortSignal): Promise<GraphData> {
  return request(`${BASE}/graph/path?from=${encodeURIComponent(fromId)}&to=${encodeURIComponent(toId)}`, signal ? { signal } : undefined)
}

// Nodes
export function fetchNodes(signal?: AbortSignal): Promise<GraphNode[]> {
  return request(`${BASE}/nodes`, signal ? { signal } : undefined)
}

export async function fetchNodesByType(type: string, signal?: AbortSignal): Promise<GraphNode[]> {
  const nodeList = await fetchNodes(signal)
  return nodeList.filter(n => n.type === type)
}

export function fetchNode(id: string, signal?: AbortSignal): Promise<NodeDetail> {
  return request(`${BASE}/nodes/${encodeURIComponent(id)}`, signal ? { signal } : undefined)
}

export function searchNodes(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  return request(`${BASE}/search?q=${encodeURIComponent(query)}`, { signal })
}

// Nodes — mutations
export function createNode(body: CreateNodeBody): Promise<NodeDetail> {
  return request(`${BASE}/nodes`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateNode(id: string, body: UpdateNodeBody): Promise<void> {
  return requestVoid(`${BASE}/nodes/${encodeURIComponent(id)}`, {
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
export async function login(email: string, password: string): Promise<void> {
  await request(`${BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    skipAuth401: true,
  })
}

export async function register(email: string, password: string): Promise<void> {
  await request(`${BASE}/auth/register`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    skipAuth401: true,
  })
}

export async function logout(): Promise<void> {
  await requestVoid(`${BASE}/auth/logout`, {
    method: 'POST',
  })
}

export function fetchMe(signal?: AbortSignal): Promise<AuthUser> {
  return request(`${BASE}/auth/me`, signal ? { signal } : undefined)
}

// Quotes
export function fetchQuotes(textId?: string, signal?: AbortSignal): Promise<Quote[]> {
  const params = textId ? `?textId=${encodeURIComponent(textId)}` : ''
  return request(`${BASE}/quotes${params}`, signal ? { signal } : undefined)
}

export function createQuote(body: CreateQuoteBody): Promise<Quote> {
  return request(`${BASE}/quotes`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateQuote(id: string, body: UpdateQuoteBody): Promise<void> {
  return requestVoid(`${BASE}/quotes/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function deleteQuote(id: string): Promise<void> {
  return requestVoid(`${BASE}/quotes/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export function promoteQuote(quoteId: string, nodeBody: CreateNodeBody): Promise<GraphNode> {
  return request(`${BASE}/quotes/${encodeURIComponent(quoteId)}/promote`, {
    method: 'POST',
    body: JSON.stringify(nodeBody),
  })
}
