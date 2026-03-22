import { useId } from 'react'
import { YearInput } from '../shared/YearInput'

export function EditableField({ label, value, onChange, multiline, type }: {
  label: string
  value: string
  onChange: (value: string) => void
  multiline?: boolean
  type?: string
}) {
  const fieldId = useId()

  if (type === 'year' || type === 'number') {
    return <YearInput label={label} value={value} onChange={onChange} />
  }

  return (
    <div className="form-field">
      <label className="meta-label" htmlFor={fieldId}>{label}</label>
      {multiline ? (
        <textarea
          className="input"
          id={fieldId}
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={3}
          style={{ resize: 'vertical', marginTop: 2 }}
        />
      ) : (
        <input
          className="input"
          id={fieldId}
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ marginTop: 2 }}
        />
      )}
    </div>
  )
}
