import { renderHook, waitFor, act } from '@testing-library/react'
import { useProgress } from './useProgress'
import { fetchAllProgress, fetchProgressForText, updateProgress } from '../api/client'
import { buildReadingProgress } from '../test/factories'

vi.mock('../api/client')

const fetchAllProgressMock = vi.mocked(fetchAllProgress)
const fetchProgressForTextMock = vi.mocked(fetchProgressForText)
const updateProgressMock = vi.mocked(updateProgress)

describe('useProgress', () => {
  it('loads all progress on mount', async () => {
    const progressA = buildReadingProgress({ chapter: '3', totalChapters: 12 })
    const progressB = buildReadingProgress({ chapter: '7', totalChapters: 20 })
    fetchAllProgressMock.mockResolvedValueOnce([progressA, progressB])

    const { result } = renderHook(() => useProgress())

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.progressList).toEqual([progressA, progressB])
    expect(result.current.error).toBeNull()
    expect(fetchAllProgressMock).toHaveBeenCalledOnce()
  })

  it('progressMap computes correctly', async () => {
    const textId = crypto.randomUUID()
    const progress = buildReadingProgress({ textId, chapter: '5', totalChapters: 10 })
    fetchAllProgressMock.mockResolvedValueOnce([progress])

    const { result } = renderHook(() => useProgress())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.progressMap.get(textId)).toBe(0.5)
  })

  it('progressMap filters out entries with null totalChapters', async () => {
    const progress = buildReadingProgress({ chapter: '5', totalChapters: null })
    fetchAllProgressMock.mockResolvedValueOnce([progress])

    const { result } = renderHook(() => useProgress())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.progressMap.size).toBe(0)
  })

  it('progressMap filters out non-numeric chapter', async () => {
    const progress = buildReadingProgress({ chapter: 'Introduction', totalChapters: 10 })
    fetchAllProgressMock.mockResolvedValueOnce([progress])

    const { result } = renderHook(() => useProgress())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.progressMap.size).toBe(0)
  })

  it('progressMap caps at 1.0 when chapter exceeds totalChapters', async () => {
    const textId = crypto.randomUUID()
    const progress = buildReadingProgress({ textId, chapter: '15', totalChapters: 10 })
    fetchAllProgressMock.mockResolvedValueOnce([progress])

    const { result } = renderHook(() => useProgress())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.progressMap.get(textId)).toBe(1.0)
  })

  it('update replaces existing textId in progressList', async () => {
    const textId = crypto.randomUUID()
    const existing = buildReadingProgress({ textId, chapter: '3', totalChapters: 10 })
    fetchAllProgressMock.mockResolvedValueOnce([existing])

    const { result } = renderHook(() => useProgress())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const updated = buildReadingProgress({ textId, chapter: '7', totalChapters: 10 })
    updateProgressMock.mockResolvedValueOnce(updated)

    await act(async () => {
      await result.current.update(textId, { chapter: '7' })
    })

    expect(result.current.progressList).toHaveLength(1)
    expect(result.current.progressList[0].chapter).toBe('7')
  })

  it('update appends new textId to progressList', async () => {
    const existingProgress = buildReadingProgress()
    fetchAllProgressMock.mockResolvedValueOnce([existingProgress])

    const { result } = renderHook(() => useProgress())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const newTextId = crypto.randomUUID()
    const newProgress = buildReadingProgress({ textId: newTextId, chapter: '1', totalChapters: 8 })
    updateProgressMock.mockResolvedValueOnce(newProgress)

    await act(async () => {
      await result.current.update(newTextId, { chapter: '1', totalChapters: 8 })
    })

    expect(result.current.progressList).toHaveLength(2)
    expect(result.current.progressList[1].textId).toBe(newTextId)
  })

  it('fetchForText returns null on error', async () => {
    fetchAllProgressMock.mockResolvedValueOnce([])
    fetchProgressForTextMock.mockRejectedValueOnce(new Error('Not found'))

    const { result } = renderHook(() => useProgress())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    let fetchResult: unknown
    await act(async () => {
      fetchResult = await result.current.fetchForText(crypto.randomUUID())
    })

    expect(fetchResult).toBeNull()
  })
})
