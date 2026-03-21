import { useState, useCallback, useId } from 'react'
import { updateProgress } from '../../api/client'
import type { ReadingProgress, UpdateProgressBody } from '../../types'

interface Props {
  textId: string
  currentProgress?: ReadingProgress | null
  onUpdated: (progress: ReadingProgress) => void
}

export function UpdateProgressForm({ textId, currentProgress, onUpdated }: Props) {
  const [chapter, setChapter] = useState(currentProgress?.chapter ?? '')
  const [totalChapters, setTotalChapters] = useState(
    currentProgress?.totalChapters != null ? String(currentProgress.totalChapters) : ''
  )
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fieldIdPrefix = useId()

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chapter.trim()) return

    setSubmitting(true)
    setError(null)
    try {
      const body: UpdateProgressBody = { chapter: chapter.trim() }
      if (totalChapters.trim()) {
        const parsed = parseInt(totalChapters.trim(), 10)
        if (!isNaN(parsed) && parsed > 0) body.totalChapters = parsed
      }
      if (note.trim()) body.note = note.trim()

      const progress = await updateProgress(textId, body)
      onUpdated(progress)
      setNote('')
    } catch (submitErr) {
      setError(submitErr instanceof Error ? submitErr.message : 'Failed to update progress')
    } finally {
      setSubmitting(false)
    }
  }, [chapter, totalChapters, note, textId, onUpdated])

  return (
    <form className="sidebar-section" onSubmit={handleSubmit}>
      <div className="meta-label sidebar-section__heading">Update Progress</div>

      <div className="form-field-pair">
        <div className="form-field">
          <label className="meta-label" htmlFor={`${fieldIdPrefix}-chapter`}>Chapter</label>
          <input
            className="input"
            id={`${fieldIdPrefix}-chapter`}
            type="text"
            value={chapter}
            onChange={e => setChapter(e.target.value)}
            placeholder="e.g. 3"
          />
        </div>
        <div className="form-field">
          <label className="meta-label" htmlFor={`${fieldIdPrefix}-total`}>Total</label>
          <input
            className="input"
            id={`${fieldIdPrefix}-total`}
            type="number"
            min="1"
            value={totalChapters}
            onChange={e => setTotalChapters(e.target.value)}
            placeholder="e.g. 12"
          />
        </div>
      </div>

      <div className="form-field">
        <label className="meta-label" htmlFor={`${fieldIdPrefix}-note`}>Session Note</label>
        <input
          className="input"
          id={`${fieldIdPrefix}-note`}
          type="text"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Optional note..."
        />
      </div>

      {error && <div className="inline-error mb-3" role="alert">{error}</div>}

      <button className="btn btn--sm btn--full" type="submit" disabled={submitting || !chapter.trim()}>
        {submitting ? 'UPDATING...' : 'UPDATE PROGRESS'}
      </button>
    </form>
  )
}
