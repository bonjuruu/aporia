import { renderHook, waitFor, act } from '@testing-library/react'
import { fetchQuotes, createQuote, deleteQuote, promoteQuote } from '../api/client'
import { useVault } from './useVault'
import { buildQuote, buildGraphNode } from '../test/factories'
import type { CreateQuoteBody, CreateNodeBody } from '../types'

vi.mock('../api/client')

const fetchQuotesMock = vi.mocked(fetchQuotes)
const createQuoteMock = vi.mocked(createQuote)
const deleteQuoteMock = vi.mocked(deleteQuote)
const promoteQuoteMock = vi.mocked(promoteQuote)

describe('useVault', () => {
  beforeEach(() => {
    fetchQuotesMock.mockReset()
    createQuoteMock.mockReset()
    deleteQuoteMock.mockReset()
    promoteQuoteMock.mockReset()
  })

  it('should load quotes on mount', async () => {
    const quoteList = [buildQuote(), buildQuote()]
    fetchQuotesMock.mockResolvedValueOnce(quoteList)

    const { result } = renderHook(() => useVault())

    expect(fetchQuotesMock).toHaveBeenCalledWith(undefined, expect.any(AbortSignal))
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.quotes).toEqual(quoteList)
    expect(result.current.error).toBeNull()
  })

  it('should prepend quote on capture', async () => {
    const existingQuote = buildQuote()
    fetchQuotesMock.mockResolvedValueOnce([existingQuote])

    const { result } = renderHook(() => useVault())

    await waitFor(() => {
      expect(result.current.quotes).toHaveLength(1)
    })

    const newQuote = buildQuote()
    createQuoteMock.mockResolvedValueOnce(newQuote)

    const captureBody: CreateQuoteBody = {
      content: newQuote.content,
      sourceTextId: newQuote.sourceTextId,
      page: 42,
    }

    await act(async () => {
      await result.current.capture(captureBody)
    })

    expect(result.current.quotes[0]).toEqual(newQuote)
    expect(result.current.quotes[1]).toEqual(existingQuote)
  })

  it('should update quote in-place on promote', async () => {
    const quote = buildQuote({ status: 'raw', promotedNodeId: '' })
    fetchQuotesMock.mockResolvedValueOnce([quote])

    const { result } = renderHook(() => useVault())

    await waitFor(() => {
      expect(result.current.quotes).toHaveLength(1)
    })

    const promotedNode = buildGraphNode({ type: 'CLAIM' })
    promoteQuoteMock.mockResolvedValueOnce(promotedNode)

    const nodeBody: CreateNodeBody = {
      type: 'CLAIM',
      content: quote.content,
    }

    await act(async () => {
      await result.current.promote(quote.id, nodeBody)
    })

    expect(result.current.quotes[0].status).toBe('promoted')
    expect(result.current.quotes[0].promotedNodeId).toBe(promotedNode.id)
  })

  it('should filter quote out on remove', async () => {
    const quoteToKeep = buildQuote()
    const quoteToRemove = buildQuote()
    fetchQuotesMock.mockResolvedValueOnce([quoteToKeep, quoteToRemove])

    const { result } = renderHook(() => useVault())

    await waitFor(() => {
      expect(result.current.quotes).toHaveLength(2)
    })

    deleteQuoteMock.mockResolvedValueOnce()

    await act(async () => {
      await result.current.remove(quoteToRemove.id)
    })

    expect(result.current.quotes).toHaveLength(1)
    expect(result.current.quotes[0]).toEqual(quoteToKeep)
  })

  it('should refetch when textId changes', async () => {
    const firstTextId = crypto.randomUUID()
    const secondTextId = crypto.randomUUID()
    const firstQuoteList = [buildQuote({ sourceTextId: firstTextId })]
    const secondQuoteList = [buildQuote({ sourceTextId: secondTextId })]

    fetchQuotesMock.mockResolvedValueOnce(firstQuoteList)

    const { result, rerender } = renderHook(
      ({ textId }) => useVault(textId),
      { initialProps: { textId: firstTextId } },
    )

    await waitFor(() => {
      expect(result.current.quotes).toEqual(firstQuoteList)
    })
    expect(fetchQuotesMock).toHaveBeenCalledWith(firstTextId, expect.any(AbortSignal))

    fetchQuotesMock.mockResolvedValueOnce(secondQuoteList)
    rerender({ textId: secondTextId })

    await waitFor(() => {
      expect(result.current.quotes).toEqual(secondQuoteList)
    })
    expect(fetchQuotesMock).toHaveBeenCalledWith(secondTextId, expect.any(AbortSignal))
  })

  it('should set error state on fetch failure', async () => {
    fetchQuotesMock.mockRejectedValueOnce(new Error('Failed to fetch'))

    const { result } = renderHook(() => useVault())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.error).toBe('Failed to fetch')
    expect(result.current.quotes).toEqual([])
  })
})
