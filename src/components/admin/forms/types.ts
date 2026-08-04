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
  | 'INSTRUCTION'

/** Static area-of-interest keys stored on FormTemplate */
export type AreaOfInterestKey = 'CR' | 'PR'

export const AREA_OF_INTEREST_OPTIONS: Array<{
  key: AreaOfInterestKey
  label: string
  description: string
}> = [
  {
    key: 'CR',
    label: 'Company Registration (CR)',
    description: 'Set up an LLC in Saudi Arabia',
  },
  {
    key: 'PR',
    label: 'Private Registration (PR)',
    description: 'Investor, talent, entrepreneur & more',
  },
]

/** Client-facing labels with area codes */
export const AREA_OF_INTEREST_DISPLAY_LABELS: Record<AreaOfInterestKey, string> = {
  CR: 'Company Registration (CR)',
  PR: 'Private Registration (PR)',
}

export function areaOfInterestDisplayLabel(key: string): string {
  return (
    AREA_OF_INTEREST_DISPLAY_LABELS[key as AreaOfInterestKey] ??
    AREA_OF_INTEREST_OPTIONS.find((o) => o.key === key)?.label ??
    key
  )
}

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
  /** Shown to applicants as a ? hover tooltip */
  helpText?: string | null
}

export interface FormTemplateListItem {
  id: string
  name: string
  description: string | null
  areaOfInterest: AreaOfInterestKey | null
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
  areaOfInterest: AreaOfInterestKey | null
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
  INSTRUCTION: 'Instruction',
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
  'INSTRUCTION',
]

/** Display-only field types that never collect answers. */
export function isDisplayOnlyFieldType(type: FormFieldType | string): boolean {
  return type === 'INSTRUCTION'
}

export function createEmptyFormTemplate(): FormTemplateDetail {
  return {
    id: '',
    name: '',
    description: null,
    areaOfInterest: null,
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
    helpText: field.helpText ?? null,
  }
}

export function mapApiTemplateDetail(template: {
  id: string
  name: string
  description: string | null
  areaOfInterest?: AreaOfInterestKey | null
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
      helpText?: string | null
    }
  }>
}): FormTemplateDetail {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    areaOfInterest: template.areaOfInterest ?? null,
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
      helpText: tf.field.helpText ?? null,
    })),
  }
}
