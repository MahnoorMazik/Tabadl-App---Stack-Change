/** API FormFieldType enum values */
export type FormFieldType =
  | 'TEXT'
  | 'TEXTAREA'
  | 'NUMBER'
  | 'EMAIL'
  | 'PHONE'
  | 'DATE'
  | 'SELECT'
  | 'CHECKBOX'
  | 'RADIO'
  | 'FILE'

export interface BusinessServiceOption {
  id: string
  name: string
  slug?: string
  alreadyAssigned?: boolean
  assignedTemplateId?: string | null
  assignedTemplateName?: string | null
  /** Informational badge text */
  linkedLabel?: string
}

export interface ReusableField {
  id: string
  label: string
  type: FormFieldType
  options?: string[] | null
  helpText?: string | null
  placeholder?: string | null
  isActive?: boolean
}

/** Field instance on the form canvas (linked to a reusable FormField) */
export interface CanvasField {
  /** Same as fieldId — unique per template */
  id: string
  fieldId: string
  label: string
  type: FormFieldType
  required: boolean
  labelOverride?: string | null
  options?: string[] | null
}

export interface FormTemplateListItem {
  id: string
  name: string
  description: string | null
  isActive: boolean
  fieldCount: number
  updatedAt: string
  createdAt?: string
  services: Array<{ id: string; name: string; slug?: string }>
}

export interface FormTemplateDetail {
  id: string
  name: string
  description: string | null
  isActive: boolean
  serviceIds: string[]
  fields: CanvasField[]
  updatedAt: string
}

export const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  TEXT: 'Text',
  TEXTAREA: 'Multi line text',
  NUMBER: 'Number',
  EMAIL: 'Email',
  PHONE: 'Phone',
  DATE: 'Date',
  SELECT: 'Dropdown',
  CHECKBOX: 'Checkbox',
  RADIO: 'Radio',
  FILE: 'File',
}

export const FIELD_TYPES: FormFieldType[] = [
  'TEXT',
  'TEXTAREA',
  'NUMBER',
  'EMAIL',
  'PHONE',
  'DATE',
  'SELECT',
  'CHECKBOX',
  'RADIO',
  'FILE',
]

export function createEmptyFormTemplate(): FormTemplateDetail {
  return {
    id: '',
    name: '',
    description: null,
    serviceIds: [],
    fields: [],
    isActive: true,
    updatedAt: new Date().toISOString(),
  }
}

export function canvasFieldFromReusable(
  field: ReusableField,
  required = false,
  labelOverride?: string | null
): CanvasField {
  return {
    id: field.id,
    fieldId: field.id,
    label: labelOverride?.trim() || field.label,
    type: field.type,
    required,
    labelOverride: labelOverride ?? null,
    options: field.options ?? null,
  }
}

export function mapApiTemplateDetail(template: {
  id: string
  name: string
  description: string | null
  isActive: boolean
  updatedAt: string
  services: Array<{ id: string; name: string; slug?: string }>
  fields: Array<{
    fieldId: string
    sortOrder: number
    isRequired: boolean
    labelOverride: string | null
    field: {
      id: string
      label: string
      type: FormFieldType
      options: string[] | null
    }
  }>
}): FormTemplateDetail {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    isActive: template.isActive,
    updatedAt: template.updatedAt,
    serviceIds: template.services.map((s) => s.id),
    fields: template.fields.map((tf) => ({
      id: tf.fieldId,
      fieldId: tf.fieldId,
      label: tf.labelOverride?.trim() || tf.field.label,
      type: tf.field.type,
      required: tf.isRequired,
      labelOverride: tf.labelOverride,
      options: tf.field.options,
    })),
  }
}
