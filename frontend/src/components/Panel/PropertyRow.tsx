import { formatYear } from '../../utils/formatYear'

export function PropertyRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === '') return null
  const display = typeof value === 'number' ? (formatYear(value) ?? String(value)) : value
  return (
    <div className="property-row">
      <div className="meta-label">{label}</div>
      <div className="content-text property-row__value">{display}</div>
    </div>
  )
}
