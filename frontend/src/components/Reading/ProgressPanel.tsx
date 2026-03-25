import { useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { formatDate } from '../../utils/formatDate'
import type { ReadingProgress } from '../../types'

interface Props {
  progressList: ReadingProgress[]
  onClose: () => void
}

function computeProgress(progress: ReadingProgress): number | null {
  if (progress.totalChapters == null || progress.totalChapters <= 0) return null
  const chapterNum = parseInt(progress.chapter, 10)
  if (isNaN(chapterNum)) return null
  return Math.min(chapterNum / progress.totalChapters, 1)
}

export function ProgressPanel({ progressList, onClose }: Props) {
  const navigate = useNavigate()
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<Element | null>(null)

  useEffect(() => {
    triggerRef.current = document.activeElement
    panelRef.current?.focus()
    return () => {
      if (triggerRef.current instanceof HTMLElement) triggerRef.current.focus()
    }
  }, [])

  useEscapeKey(true, onClose)

  const handleContinue = useCallback((textId: string) => {
    onClose()
    navigate(`/reading/${textId}`)
  }, [navigate, onClose])

  return (
    <div ref={panelRef} tabIndex={-1} className="progress-panel open" role="complementary" aria-label="Reading progress">
      {/* Header */}
      <div className="progress-header">
        <div className="panel-header">
          <span className="meta-label">Reading Progress</span>
          <button className="btn btn--sm" onClick={onClose}>CLOSE</button>
        </div>
      </div>

      {/* Progress list */}
      <div className="progress-list">
        {progressList.length === 0 ? (
          <div className="progress-empty">
            No reading progress yet. Open a text in reading mode to start tracking.
          </div>
        ) : (
          progressList.map(progress => {
            const pct = computeProgress(progress)
            return (
              <div key={progress.textId} className="progress-entry">
                <div className="progress-entry__title">{progress.textTitle}</div>
                <div className="progress-entry__meta">
                  <span className="meta-label">Chapter {progress.chapter}</span>
                  {progress.totalChapters != null && (
                    <span className="meta-label"> / {progress.totalChapters}</span>
                  )}
                </div>
                {pct != null && (
                  <div className="progress-bar-track">
                    <div className="progress-bar-fill" style={{ width: `${pct * 100}%` }} />
                  </div>
                )}
                <div className="progress-entry__footer">
                  <span className="meta-label meta-label--status">
                    {formatDate(progress.lastReadAt, true)}
                  </span>
                  <button
                    className="btn btn--sm"
                    onClick={() => handleContinue(progress.textId)}
                  >
                    CONTINUE →
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
