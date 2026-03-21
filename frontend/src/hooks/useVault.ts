import { useState, useEffect, useCallback } from 'react'
import { fetchQuotes, createQuote, deleteQuote, promoteQuote } from '../api/client'
import type { Quote, CreateQuoteBody, CreateNodeBody, GraphNode } from '../types'

export function useVault(textId?: string) {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [error, setError] = useState<string | null>(null)
  const [fetchCount, setFetchCount] = useState(0)
  const [settledCount, setSettledCount] = useState(-1)

  useEffect(() => {
    const controller = new AbortController()
    fetchQuotes(textId, controller.signal)
      .then(data => { if (!controller.signal.aborted) { setQuotes(data); setError(null) } })
      .catch(fetchErr => {
        if (controller.signal.aborted) return
        setError(fetchErr instanceof Error ? fetchErr.message : 'Failed to load quotes')
      })
      .finally(() => { if (!controller.signal.aborted) setSettledCount(fetchCount) })
    return () => controller.abort()
  }, [fetchCount, textId])

  const loading = settledCount !== fetchCount

  const capture = useCallback(async (data: CreateQuoteBody): Promise<Quote> => {
    const quote = await createQuote(data)
    setQuotes(prev => [quote, ...prev])
    return quote
  }, [])

  const promote = useCallback(async (quoteId: string, nodeData: CreateNodeBody): Promise<GraphNode> => {
    const node = await promoteQuote(quoteId, nodeData)
    setQuotes(prev => prev.map(q =>
      q.id === quoteId ? { ...q, status: 'promoted' as const, promotedNodeId: node.id } : q
    ))
    return node
  }, [])

  const remove = useCallback(async (id: string): Promise<void> => {
    await deleteQuote(id)
    setQuotes(prev => prev.filter(q => q.id !== id))
  }, [])

  const refetch = useCallback(() => setFetchCount(c => c + 1), [])

  return { quotes, loading, error, capture, promote, remove, refetch }
}
