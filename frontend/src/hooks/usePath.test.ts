import { renderHook, waitFor, act } from '@testing-library/react'
import { usePath } from './usePath'
import { fetchPath } from '../api/client'
import { buildSearchResult, buildGraphNode, buildGraphEdge } from '../test/factories'
import type { GraphData } from '../types'

vi.mock('../api/client')

const fetchPathMock = vi.mocked(fetchPath)

describe('usePath', () => {
  it('findPath calls API and sets pathData and fromId', async () => {
    const from = buildSearchResult({ label: 'Plato' })
    const to = buildSearchResult({ label: 'Aristotle' })
    const nodeA = buildGraphNode({ id: from.id })
    const nodeB = buildGraphNode({ id: to.id })
    const edge = buildGraphEdge({ source: from.id, target: to.id })
    const graphData = { nodes: [nodeA, nodeB], edges: [edge] }

    fetchPathMock.mockResolvedValueOnce(graphData)

    const { result } = renderHook(() => usePath())

    act(() => {
      result.current.findPath(from, to)
    })

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.pathData).toEqual(graphData)
    expect(result.current.fromId).toBe(from.id)
    expect(result.current.error).toBeNull()
    expect(fetchPathMock).toHaveBeenCalledWith(from.id, to.id, expect.any(AbortSignal))
  })

  it('findPath with empty nodes sets error "No path found between these nodes"', async () => {
    const from = buildSearchResult()
    const to = buildSearchResult()

    fetchPathMock.mockResolvedValueOnce({ nodes: [], edges: [] })

    const { result } = renderHook(() => usePath())

    act(() => {
      result.current.findPath(from, to)
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('No path found between these nodes')
    expect(result.current.pathData).toBeNull()
    expect(result.current.fromId).toBeNull()
  })

  it('findPath network error sets error state', async () => {
    const from = buildSearchResult()
    const to = buildSearchResult()

    fetchPathMock.mockRejectedValueOnce(new Error('Network failure'))

    const { result } = renderHook(() => usePath())

    act(() => {
      result.current.findPath(from, to)
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Network failure')
    expect(result.current.pathData).toBeNull()
    expect(result.current.fromId).toBeNull()
  })

  it('clearPath resets all state', async () => {
    const from = buildSearchResult()
    const to = buildSearchResult()
    const nodeA = buildGraphNode({ id: from.id })
    const nodeB = buildGraphNode({ id: to.id })
    const graphData = { nodes: [nodeA, nodeB], edges: [buildGraphEdge({ source: from.id, target: to.id })] }

    fetchPathMock.mockResolvedValueOnce(graphData)

    const { result } = renderHook(() => usePath())

    act(() => {
      result.current.findPath(from, to)
    })

    await waitFor(() => {
      expect(result.current.pathData).not.toBeNull()
    })

    act(() => {
      result.current.clearPath()
    })

    expect(result.current.pathData).toBeNull()
    expect(result.current.fromId).toBeNull()
    expect(result.current.error).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('loading transitions correctly during fetch', async () => {
    const from = buildSearchResult()
    const to = buildSearchResult()

    let resolvePromise: (value: GraphData) => void
    fetchPathMock.mockReturnValueOnce(new Promise(resolve => { resolvePromise = resolve }))

    const { result } = renderHook(() => usePath())

    expect(result.current.loading).toBe(false)

    act(() => {
      result.current.findPath(from, to)
    })

    expect(result.current.loading).toBe(true)

    await act(async () => {
      resolvePromise!({ nodes: [], edges: [] })
    })

    expect(result.current.loading).toBe(false)
  })
})
