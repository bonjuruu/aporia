import { EditableField, PropertyRow } from './shared'
import type { TextProperties } from '../../types'

interface Props {
  properties: TextProperties
  editing: boolean
  form: Record<string, string>
  onFieldChange: (field: string, value: string) => void
}

export function TextDetail({ properties, editing, form, onFieldChange }: Props) {
  if (editing) {
    return (
      <>
        <EditableField label="Title" value={form.title ?? ''} onChange={v => onFieldChange('title', v)} />
        <EditableField label="Published" value={form.publishedYear ?? ''} onChange={v => onFieldChange('publishedYear', v)} type="number" />
        <EditableField label="Description" value={form.description ?? ''} onChange={v => onFieldChange('description', v)} multiline />
      </>
    )
  }

  return (
    <>
      <PropertyRow label="Published" value={properties.publishedYear} />
      <PropertyRow label="Description" value={properties.description} />
    </>
  )
}
