import { EditableField, PropertyRow } from './shared'
import type { ConceptProperties } from '../../types'

interface Props {
  properties: ConceptProperties
  editing: boolean
  form: Record<string, string>
  onFieldChange: (field: string, value: string) => void
}

export function ConceptDetail({ properties, editing, form, onFieldChange }: Props) {
  if (editing) {
    return (
      <>
        <EditableField label="Name" value={form.name ?? ''} onChange={v => onFieldChange('name', v)} />
        <EditableField label="Year" value={form.year ?? ''} onChange={v => onFieldChange('year', v)} type="number" />
        <EditableField label="Description" value={form.description ?? ''} onChange={v => onFieldChange('description', v)} multiline />
      </>
    )
  }

  return (
    <>
      <PropertyRow label="Year" value={properties.year} />
      <PropertyRow label="Description" value={properties.description} />
    </>
  )
}
