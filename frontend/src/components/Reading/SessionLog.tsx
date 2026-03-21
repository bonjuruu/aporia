import type { SessionNote } from '../../types'

interface Props {
  sessionNotes: SessionNote[]
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return iso
  }
}

export function SessionLog({ sessionNotes }: Props) {
  if (sessionNotes.length === 0) return null

  return (
    <details className="session-log">
      <summary className="meta-label">
        SESSION LOG ({sessionNotes.length})
      </summary>
      <div className="session-log__entries">
        {sessionNotes.map((entry, index) => (
          <div key={index} className="session-entry">
            <span className="session-entry__date">{formatDate(entry.date)}</span>
            <span className="session-entry__chapter">Ch. {entry.chapter}</span>
            {entry.note && <span className="session-entry__note">{entry.note}</span>}
          </div>
        ))}
      </div>
    </details>
  )
}
