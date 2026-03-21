import { EditableField } from './EditableField'
import { PropertyRow } from './PropertyRow'
import type { ClaimProperties, ClaimEditForm } from '../../types'

interface Props {
  properties: ClaimProperties
  editing: boolean
  form: ClaimEditForm
  onFieldChange: (field: keyof ClaimEditForm, value: string) => void
}

export function ClaimDetail({ properties, editing, form, onFieldChange }: Props) {
  if (editing) {
    return (
      <>
        <EditableField label="Claim" value={form.content} onChange={v => onFieldChange('content', v)} multiline />
        <EditableField label="Year" value={form.year} onChange={v => onFieldChange('year', v)} type="number" />
        <EditableField label="Description" value={form.description} onChange={v => onFieldChange('description', v)} multiline />
      </>
    )
  }

  return (
    <>
      <PropertyRow label="Claim" value={properties.content} />
      <PropertyRow label="Year" value={properties.year} />
      <PropertyRow label="Description" value={properties.description} />
    </>
  )
}
