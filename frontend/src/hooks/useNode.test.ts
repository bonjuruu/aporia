import { renderHook, waitFor, act } from '@testing-library/react'
import { fetchNode } from '../api/client'
import { useNode } from './useNode'
import { buildThinkerDetail } from '../test/factories'

vi.mock('../api/client')

const fetchNodeMock = vi.mocked(fetchNode)

describe('useNode', () => {
  beforeEach(() => {
    fetchNodeMock.mockReset()
  })

  it('should fetch node detail when nodeId is non-null', async () => {
    const detail = buildThinkerDetail()
    fetchNodeMock.mockResolvedValueOnce(detail)

    const { result } = renderHook(() => useNode(detail.id))

    expect(fetchNodeMock).toHaveBeenCalledWith(detail.id, expect.any(AbortSignal))
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.data).toEqual(detail)
    expect(result.current.error).toBeNull()
  })

  it('should return null data when nodeId is null', () => {
    const { result } = renderHook(() => useNode(null))

    expect(fetchNodeMock).not.toHaveBeenCalled()
    expect(result.current.data).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should clear stale data on nodeId change', async () => {
    const firstDetail = buildThinkerDetail()
    const secondDetail = buildThinkerDetail()
    fetchNodeMock.mockResolvedValueOnce(firstDetail)

    const { result, rerender } = renderHook(
      ({ nodeId }) => useNode(nodeId),
      { initialProps: { nodeId: firstDetail.id } as { nodeId: string | null } },
    )

    await waitFor(() => {
      expect(result.current.data).toEqual(firstDetail)
    })

    fetchNodeMock.mockResolvedValueOnce(secondDetail)
    rerender({ nodeId: secondDetail.id })

    // resolvedData should be null while the new fetch is in-flight
    // because data?.id !== nodeId for the new nodeId
    expect(result.current.data).toBeNull()

    await waitFor(() => {
      expect(result.current.data).toEqual(secondDetail)
    })
  })

  it('should refetch when refetch is called', async () => {
    const detail = buildThinkerDetail()
    fetchNodeMock.mockResolvedValue(detail)

    const { result } = renderHook(() => useNode(detail.id))

    await waitFor(() => {
      expect(result.current.data).toEqual(detail)
    })
    const callCountAfterMount = fetchNodeMock.mock.calls.length

    await act(async () => {
      result.current.refetch()
    })

    await waitFor(() => {
      expect(fetchNodeMock.mock.calls.length).toBeGreaterThan(callCountAfterMount)
    })
    expect(fetchNodeMock).toHaveBeenLastCalledWith(detail.id, expect.any(AbortSignal))
  })

  it('should set error state on fetch failure', async () => {
    fetchNodeMock.mockRejectedValueOnce(new Error('Network error'))
    const nodeId = crypto.randomUUID()

    const { result } = renderHook(() => useNode(nodeId))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.error).toBe('Network error')
    expect(result.current.data).toBeNull()
  })

  it('should have loading false when nodeId is null', () => {
    const { result } = renderHook(() => useNode(null))

    expect(result.current.loading).toBe(false)
  })
})
