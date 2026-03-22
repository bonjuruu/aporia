import { useId } from 'react'

interface Props {
  label: string
  value: string
  onChange: (value: string) => void
}

export function YearInput({ label, value, onChange }: Props) {
  const fieldId = useId()
  const numericValue = value.startsWith('-') ? value.slice(1) : value
  const isBce = value.startsWith('-')

  function handleValueChange(raw: string) {
    const digits = raw.replace(/[^0-9]/g, '')
    onChange(isBce && digits !== '' ? `-${digits}` : digits)
  }

  function handleToggle() {
    if (numericValue === '') return
    onChange(isBce ? numericValue : `-${numericValue}`)
  }

  return (
    <div className="form-field">
      <label className="meta-label" htmlFor={fieldId}>{label}</label>
      <div className="year-input">
        <input
          className="input year-input__field"
          id={fieldId}
          type="text"
          inputMode="numeric"
          value={numericValue}
          onChange={e => handleValueChange(e.target.value)}
          style={{ marginTop: 2 }}
        />
        <button
          type="button"
          className={`year-input__era ${isBce ? 'year-input__era--bce' : ''}`}
          onClick={handleToggle}
          aria-label={`Toggle era, currently ${isBce ? 'BCE' : 'CE'}`}
        >
          {isBce ? 'BCE' : 'CE'}
        </button>
      </div>
    </div>
  )
}
