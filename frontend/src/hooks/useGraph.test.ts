import { renderHook, waitFor, act } from '@testing-library/react'
import { fetchGraph } from '../api/client'
import { buildGraphNode, buildGraphEdge } from '../test/factories'
import { useGraph } from './useGraph'
import type { GraphNode } from '../types'

vi.mock('../api/client')

const fetchGraphMock = vi.mocked(fetchGraph)

describe('useGraph', () => {
  it('should load graph data on mount', async () => {
    const nodeA = buildGraphNode({ label: 'Aristotle', type: 'THINKER' })
    const nodeB = buildGraphNode({ label: 'Forms', type: 'CONCEPT' })
    const edge = buildGraphEdge({ source: nodeA.id, target: nodeB.id, type: 'COINED' })
    fetchGraphMock.mockResolvedValue({ nodes: [nodeA, nodeB], edges: [edge] })

    const { result } = renderHook(() => useGraph())

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data.nodes).toEqual([nodeA, nodeB])
    expect(result.current.data.edges).toEqual([edge])
    expect(result.current.error).toBeNull()
  })

  it('should set error state on fetch failure', async () => {
    fetchGraphMock.mockRejectedValue(new Error('Connection refused'))

    const { result } = renderHook(() => useGraph())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Connection refused')
    expect(result.current.data.nodes).toEqual([])
    expect(result.current.data.edges).toEqual([])
  })

  it('should append a node via addNode and deduplicate by id', async () => {
    fetchGraphMock.mockResolvedValue({ nodes: [], edges: [] })

    const { result } = renderHook(() => useGraph())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const node = buildGraphNode({ label: 'Plato', type: 'THINKER' })

    act(() => {
      result.current.addNode(node)
    })

    expect(result.current.data.nodes).toEqual([node])

    act(() => {
      result.current.addNode(node)
    })

    expect(result.current.data.nodes).toHaveLength(1)
  })

  it('should append an edge via addEdge and deduplicate by id', async () => {
    fetchGraphMock.mockResolvedValue({ nodes: [], edges: [] })

    const { result } = renderHook(() => useGraph())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const edge = buildGraphEdge({ type: 'INFLUENCED' })

    act(() => {
      result.current.addEdge(edge)
    })

    expect(result.current.data.edges).toEqual([edge])

    act(() => {
      result.current.addEdge(edge)
    })

    expect(result.current.data.edges).toHaveLength(1)
  })

  it('should remove a node and its connected edges with string source/target', async () => {
    const nodeA = buildGraphNode({ label: 'Plato', type: 'THINKER' })
    const nodeB = buildGraphNode({ label: 'Forms', type: 'CONCEPT' })
    const nodeC = buildGraphNode({ label: 'Aristotle', type: 'THINKER' })
    const edgeAB = buildGraphEdge({ source: nodeA.id, target: nodeB.id, type: 'COINED' })
    const edgeBC = buildGraphEdge({ source: nodeB.id, target: nodeC.id, type: 'INFLUENCED' })
    const edgeAC = buildGraphEdge({ source: nodeA.id, target: nodeC.id, type: 'INFLUENCED' })
    fetchGraphMock.mockResolvedValue({
      nodes: [nodeA, nodeB, nodeC],
      edges: [edgeAB, edgeBC, edgeAC],
    })

    const { result } = renderHook(() => useGraph())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    act(() => {
      result.current.removeNode(nodeB.id)
    })

    expect(result.current.data.nodes).toEqual([nodeA, nodeC])
    expect(result.current.data.edges).toEqual([edgeAC])
  })

  it('should remove a node and its connected edges when source/target are d3-mutated GraphNode objects', async () => {
    const nodeA = buildGraphNode({ label: 'Plato', type: 'THINKER' })
    const nodeB = buildGraphNode({ label: 'Forms', type: 'CONCEPT' })
    const d3MutatedEdge = {
      id: crypto.randomUUID(),
      source: { ...nodeA } as GraphNode,
      target: { ...nodeB } as GraphNode,
      type: 'COINED' as const,
    }
    fetchGraphMock.mockResolvedValue({
      nodes: [nodeA, nodeB],
      edges: [d3MutatedEdge],
    })

    const { result } = renderHook(() => useGraph())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    act(() => {
      result.current.removeNode(nodeA.id)
    })

    expect(result.current.data.nodes).toEqual([nodeB])
    expect(result.current.data.edges).toEqual([])
  })

  it('should remove only the specified edge via removeEdge', async () => {
    const nodeA = buildGraphNode({ label: 'Plato', type: 'THINKER' })
    const nodeB = buildGraphNode({ label: 'Forms', type: 'CONCEPT' })
    const edgeA = buildGraphEdge({ source: nodeA.id, target: nodeB.id, type: 'COINED' })
    const edgeB = buildGraphEdge({ source: nodeA.id, target: nodeB.id, type: 'INFLUENCED' })
    fetchGraphMock.mockResolvedValue({
      nodes: [nodeA, nodeB],
      edges: [edgeA, edgeB],
    })

    const { result } = renderHook(() => useGraph())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    act(() => {
      result.current.removeEdge(edgeA.id)
    })

    expect(result.current.data.nodes).toEqual([nodeA, nodeB])
    expect(result.current.data.edges).toEqual([edgeB])
  })

  it('should trigger a new fetch on refetchGraph', async () => {
    const initialNode = buildGraphNode({ label: 'Plato', type: 'THINKER' })
    const updatedNode = buildGraphNode({ label: 'Aristotle', type: 'THINKER' })
    fetchGraphMock
      .mockResolvedValueOnce({ nodes: [initialNode], edges: [] })
      .mockResolvedValueOnce({ nodes: [updatedNode], edges: [] })

    const { result } = renderHook(() => useGraph())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data.nodes).toEqual([initialNode])
    fetchGraphMock.mockClear()

    act(() => {
      result.current.refetchGraph()
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(fetchGraphMock).toHaveBeenCalledTimes(1)
    expect(result.current.data.nodes).toEqual([updatedNode])
  })
})
