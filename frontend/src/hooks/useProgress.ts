import { useState, useEffect, useCallback, useMemo } from 'react'
import { fetchAllProgress, fetchProgressForText, updateProgress } from '../api/client'
import type { ReadingProgress, UpdateProgressBody } from '../types'

export function useProgress() {
  const [progressList, setProgressList] = useState<ReadingProgress[]>([])
  const [error, setError] = useState<string | null>(null)
  const [fetchCount, setFetchCount] = useState(0)
  const [settledCount, setSettledCount] = useState(-1)

  useEffect(() => {
    const controller = new AbortController()
    fetchAllProgress(controller.signal)
      .then(data => { if (!controller.signal.aborted) { setProgressList(data); setError(null) } })
      .catch(fetchErr => {
        if (controller.signal.aborted) return
        setError(fetchErr instanceof Error ? fetchErr.message : 'Failed to load progress')
      })
      .finally(() => { if (!controller.signal.aborted) setSettledCount(fetchCount) })
    return () => controller.abort()
  }, [fetchCount])

  const loading = settledCount !== fetchCount

  const progressMap = useMemo<Map<string, number>>(() =>
    new Map(
      progressList
        .filter(p => p.totalChapters != null && p.totalChapters > 0)
        .map(p => {
          const chapterNum = parseInt(p.chapter, 10)
          const pct = isNaN(chapterNum) || chapterNum <= 0 ? 0 : chapterNum / p.totalChapters!
          return [p.textId, Math.min(pct, 1)] as const
        })
        .filter(([, pct]) => pct > 0)
    ),
  [progressList])

  const update = useCallback(async (textId: string, body: UpdateProgressBody): Promise<ReadingProgress> => {
    const progress = await updateProgress(textId, body)
    setProgressList(prev => {
      const exists = prev.some(p => p.textId === textId)
      return exists
        ? prev.map(p => p.textId === textId ? progress : p)
        : [...prev, progress]
    })
    return progress
  }, [])

  const fetchForText = useCallback(async (textId: string): Promise<ReadingProgress | null> => {
    try {
      return await fetchProgressForText(textId)
    } catch {
      return null
    }
  }, [])

  const refetch = useCallback(() => setFetchCount(c => c + 1), [])

  return { progressList, loading, error, progressMap, update, fetchForText, refetch }
}
