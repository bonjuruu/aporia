export function PropertyRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="property-row">
      <div className="meta-label">{label}</div>
      <div className="content-text property-row__value">{String(value)}</div>
    </div>
  )
}
