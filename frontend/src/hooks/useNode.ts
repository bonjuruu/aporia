import { useState, useEffect, useTransition } from 'react'
import { fetchNode } from '../api/client'
import type { NodeDetail } from '../types'

export function useNode(nodeId: string | null) {
  const [data, setData] = useState<NodeDetail | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!nodeId) return
    let cancelled = false
    startTransition(async () => {
      try {
        const result = await fetchNode(nodeId)
        if (!cancelled) setData(result)
      } catch {
        if (!cancelled) setData(null)
      }
    })
    return () => { cancelled = true }
  }, [nodeId])

  const resolvedData = nodeId ? data : null
  return { data: resolvedData, loading: isPending }
}
