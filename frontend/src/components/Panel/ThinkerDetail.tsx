import { EditableField, PropertyRow } from './shared'
import type { ThinkerProperties, ThinkerEditForm } from '../../types'

interface Props {
  properties: ThinkerProperties
  editing: boolean
  form: ThinkerEditForm
  onFieldChange: (field: keyof ThinkerEditForm, value: string) => void
}

export function ThinkerDetail({ properties, editing, form, onFieldChange }: Props) {
  if (editing) {
    return (
      <>
        <EditableField label="Name" value={form.name} onChange={v => onFieldChange('name', v)} />
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <EditableField label="Born" value={form.bornYear} onChange={v => onFieldChange('bornYear', v)} type="number" />
          </div>
          <div style={{ flex: 1 }}>
            <EditableField label="Died" value={form.diedYear} onChange={v => onFieldChange('diedYear', v)} type="number" />
          </div>
        </div>
        <EditableField label="Tradition" value={form.tradition} onChange={v => onFieldChange('tradition', v)} />
        <EditableField label="Description" value={form.description} onChange={v => onFieldChange('description', v)} multiline />
      </>
    )
  }

  return (
    <>
      <PropertyRow label="Born" value={properties.bornYear} />
      <PropertyRow label="Died" value={properties.diedYear} />
      <PropertyRow label="Tradition" value={properties.tradition} />
      <PropertyRow label="Description" value={properties.description} />
    </>
  )
}
