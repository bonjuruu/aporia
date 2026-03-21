import { EditableField, PropertyRow } from './shared'
import type { ClaimProperties } from '../../types'

interface Props {
  properties: ClaimProperties
  editing: boolean
  form: Record<string, string>
  onFieldChange: (field: string, value: string) => void
}

export function ClaimDetail({ properties, editing, form, onFieldChange }: Props) {
  if (editing) {
    return (
      <>
        <EditableField label="Claim" value={form.content ?? ''} onChange={v => onFieldChange('content', v)} multiline />
        <EditableField label="Year" value={form.year ?? ''} onChange={v => onFieldChange('year', v)} type="number" />
        <EditableField label="Description" value={form.description ?? ''} onChange={v => onFieldChange('description', v)} multiline />
      </>
    )
  }

  return (
    <>
      <PropertyRow label="Year" value={properties.year} />
      <PropertyRow label="Claim" value={properties.content} />
      <PropertyRow label="Description" value={properties.description} />
    </>
  )
}
