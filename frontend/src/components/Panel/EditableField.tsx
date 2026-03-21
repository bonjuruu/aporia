import { useId } from 'react'

export function EditableField({ label, value, onChange, multiline, type }: {
  label: string
  value: string
  onChange: (value: string) => void
  multiline?: boolean
  type?: string
}) {
  const fieldId = useId()
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
