import { fetchGraph, createNode, login, deleteNode, fetchQuotes, fetchMe, UnauthorizedError } from './client'

interface MockResponseInit {
  ok: boolean
  status: number
  json?: unknown
  headers?: Record<string, string>
}

function mockFetch(response: MockResponseInit) {
  const textValue = response.status === 204 ? '' : JSON.stringify(response.json ?? {})
  const res = {
    ok: response.ok,
    status: response.status,
    headers: new Headers(response.headers ?? (response.status === 204 ? {} : { 'content-length': String(textValue.length) })),
    text: vi.fn().mockResolvedValue(textValue),
  }
  const spy = vi.fn().mockResolvedValue(res)
  vi.stubGlobal('fetch', spy)
  return { fetchSpy: spy, response: res }
}

function setCSRFCookie(token: string) {
  Object.defineProperty(document, 'cookie', { writable: true, value: `aporia_csrf=${token}`, configurable: true })
}

afterEach(() => {
  vi.unstubAllGlobals()
  Object.defineProperty(document, 'cookie', { writable: true, value: '', configurable: true })
})

describe('client request()', () => {
  it('should include credentials on GET requests', async () => {
    const { fetchSpy } = mockFetch({ ok: true, status: 200, json: { nodes: [], edges: [] } })

    await fetchGraph()

    expect(fetchSpy).toHaveBeenCalledOnce()
    const [, options] = fetchSpy.mock.calls[0]
    expect(options.credentials).toBe('include')
  })

  it('should not include CSRF header on GET requests', async () => {
    setCSRFCookie('test-csrf-token')
    const { fetchSpy } = mockFetch({ ok: true, status: 200, json: { nodes: [], edges: [] } })

    await fetchGraph()

    const [, options] = fetchSpy.mock.calls[0]
    expect(options.headers['X-CSRF-Token']).toBeUndefined()
  })

  it('should include CSRF header on POST requests', async () => {
    setCSRFCookie('test-csrf-token')
    const { fetchSpy } = mockFetch({ ok: true, status: 200, json: { id: '1', label: 'Test', type: 'THINKER', year: null } })

    await createNode({ type: 'THINKER', name: 'Test' })

    const [, options] = fetchSpy.mock.calls[0]
    expect(options.headers['X-CSRF-Token']).toBe('test-csrf-token')
  })

  it('should include Content-Type on requests with a body', async () => {
    const { fetchSpy } = mockFetch({ ok: true, status: 200, json: { id: '1', label: 'Test', type: 'THINKER', year: null } })

    await createNode({ type: 'THINKER', name: 'Test' })

    const [, options] = fetchSpy.mock.calls[0]
    expect(options.headers['Content-Type']).toBe('application/json')
  })

  it('should dispatch aporia:unauthorized on 401 response', async () => {
    mockFetch({ ok: false, status: 401, json: { error: 'Unauthorized' } })
    const listener = vi.fn()
    window.addEventListener('aporia:unauthorized', listener)

    await expect(fetchMe()).rejects.toThrow(UnauthorizedError)
    expect(listener).toHaveBeenCalledOnce()

    window.removeEventListener('aporia:unauthorized', listener)
  })

  it('should not dispatch unauthorized event when skipAuth401 is set', async () => {
    mockFetch({ ok: false, status: 401, json: { error: 'Bad credentials' } })
    const listener = vi.fn()
    window.addEventListener('aporia:unauthorized', listener)

    await expect(login('test@test.com', 'wrong')).rejects.toThrow('Bad credentials')
    expect(listener).not.toHaveBeenCalled()

    window.removeEventListener('aporia:unauthorized', listener)
  })

  it('should throw network error on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(fetchGraph()).rejects.toThrow('Network error — check your connection and try again')
  })

  it('should resolve void for 204 responses on delete', async () => {
    mockFetch({ ok: true, status: 204, headers: { 'content-length': '0' } })

    await expect(deleteNode('some-id')).resolves.toBeUndefined()
  })

  it('should extract error message from JSON error body', async () => {
    mockFetch({ ok: false, status: 409, json: { error: 'Email already registered' } })

    await expect(createNode({ type: 'THINKER', name: 'Test' })).rejects.toThrow('Email already registered')
  })

  it('should pass AbortSignal to fetch', async () => {
    const controller = new AbortController()
    const { fetchSpy } = mockFetch({ ok: true, status: 200, json: { nodes: [], edges: [] } })

    await fetchGraph(controller.signal)

    const [, options] = fetchSpy.mock.calls[0]
    expect(options.signal).toBe(controller.signal)
  })

  it('should append textId query param when provided', async () => {
    const textId = 'text-123'
    const { fetchSpy } = mockFetch({ ok: true, status: 200, json: [] })

    await fetchQuotes(textId)

    const [url] = fetchSpy.mock.calls[0]
    expect(url).toBe(`/api/quotes?textId=${textId}`)
  })

  it('should not append query param when textId is undefined', async () => {
    const { fetchSpy } = mockFetch({ ok: true, status: 200, json: [] })

    await fetchQuotes()

    const [url] = fetchSpy.mock.calls[0]
    expect(url).toBe('/api/quotes')
  })
})
