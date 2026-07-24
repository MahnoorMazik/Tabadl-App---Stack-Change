export type FormFieldType =
  | 'text'
  | 'long_text'
  | 'number'
  | 'email'
  | 'phone'
  | 'date'
  | 'dropdown'
  | 'checkbox'
  | 'file'

export interface BusinessService {
  id: string
  name: string
  /** Informational badge, e.g. linked package name */
  linkedLabel?: string
}

export interface ReusableField {
  id: string
  label: string
  type: FormFieldType
  options?: string[]
}

export interface FormField {
  id: string
  label: string
  type: FormFieldType
  required: boolean
  /** Present when sourced from the reusable field library */
  reusableFieldId?: string
  options?: string[]
}

export interface FormTemplate {
  id: string
  name: string
  serviceIds: string[]
  fields: FormField[]
  isActive: boolean
  updatedAt: string
}

export const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: 'Text',
  long_text: 'Long Text',
  number: 'Number',
  email: 'Email',
  phone: 'Phone',
  date: 'Date',
  dropdown: 'Dropdown',
  checkbox: 'Checkbox',
  file: 'File',
}

export const FIELD_TYPES: FormFieldType[] = [
  'text',
  'long_text',
  'number',
  'email',
  'phone',
  'date',
  'dropdown',
  'checkbox',
  'file',
]

export const MOCK_BUSINESS_SERVICES: BusinessService[] = [
  { id: 'svc-1', name: 'Company Formation', linkedLabel: 'On "Starter Package"' },
  { id: 'svc-2', name: 'General Consultation', linkedLabel: 'On "General Consultation"' },
  { id: 'svc-3', name: 'MISA License' },
  { id: 'svc-4', name: 'Premium Residency', linkedLabel: 'On "Premium Bundle"' },
  { id: 'svc-5', name: 'Bank Account Opening' },
  { id: 'svc-6', name: 'VAT Registration' },
  { id: 'svc-7', name: 'Iqama / Visa Services' },
  { id: 'svc-8', name: 'Compliance Support' },
]

export const MOCK_REUSABLE_FIELDS: ReusableField[] = [
  { id: 'rf-1', label: 'Full Legal Name', type: 'text' },
  { id: 'rf-2', label: 'Email Address', type: 'email' },
  { id: 'rf-3', label: 'Mobile Number', type: 'phone' },
  { id: 'rf-4', label: 'Date of Birth', type: 'date' },
  { id: 'rf-5', label: 'Company Description', type: 'long_text' },
  { id: 'rf-6', label: 'Number of Employees', type: 'number' },
  {
    id: 'rf-7',
    label: 'Preferred Contact Method',
    type: 'dropdown',
    options: ['Email', 'Phone', 'WhatsApp'],
  },
  { id: 'rf-8', label: 'I agree to the terms', type: 'checkbox' },
  { id: 'rf-9', label: 'Passport Copy', type: 'file' },
  { id: 'rf-10', label: 'Nationality', type: 'text' },
]

export const MOCK_FORM_TEMPLATES: FormTemplate[] = [
  {
    id: 'form-1',
    name: 'Company Formation Intake',
    serviceIds: ['svc-1', 'svc-3'],
    isActive: true,
    updatedAt: '2026-07-10',
    fields: [
      { id: 'f-1', label: 'Company Name (EN)', type: 'text', required: true, reusableFieldId: 'rf-1' },
      { id: 'f-2', label: 'Company Name (AR)', type: 'text', required: true },
      { id: 'f-3', label: 'Business Activity', type: 'long_text', required: true },
      { id: 'f-4', label: 'Capital (SAR)', type: 'number', required: false },
      {
        id: 'f-5',
        label: 'License Type',
        type: 'dropdown',
        required: true,
        options: ['Commercial', 'Industrial', 'Professional'],
      },
      { id: 'f-6', label: 'CR Document', type: 'file', required: false },
    ],
  },
  {
    id: 'form-2',
    name: 'Consultation Request',
    serviceIds: ['svc-2'],
    isActive: true,
    updatedAt: '2026-07-08',
    fields: [
      { id: 'f-7', label: 'Full Name', type: 'text', required: true, reusableFieldId: 'rf-1' },
      { id: 'f-8', label: 'Email', type: 'email', required: true, reusableFieldId: 'rf-2' },
      { id: 'f-9', label: 'Phone', type: 'phone', required: true, reusableFieldId: 'rf-3' },
      { id: 'f-10', label: 'Preferred Date', type: 'date', required: false },
      { id: 'f-11', label: 'Topics to Discuss', type: 'long_text', required: true },
    ],
  },
  {
    id: 'form-3',
    name: 'Bank Account Checklist',
    serviceIds: ['svc-5'],
    isActive: false,
    updatedAt: '2026-06-22',
    fields: [
      { id: 'f-12', label: 'Preferred Bank', type: 'dropdown', required: true, options: ['Al Rajhi', 'SNB', 'Riyad Bank'] },
      { id: 'f-13', label: 'Passport Copy', type: 'file', required: true, reusableFieldId: 'rf-9' },
      { id: 'f-14', label: 'Confirm documents ready', type: 'checkbox', required: true },
    ],
  },
  {
    id: 'form-4',
    name: 'Unassigned Draft Form',
    serviceIds: [],
    isActive: false,
    updatedAt: '2026-07-01',
    fields: [
      { id: 'f-15', label: 'Notes', type: 'long_text', required: false },
    ],
  },
]

export function getMockFormTemplate(id: string): FormTemplate | undefined {
  return MOCK_FORM_TEMPLATES.find((t) => t.id === id)
}

export function createEmptyFormTemplate(): FormTemplate {
  return {
    id: `form-draft-${Date.now()}`,
    name: '',
    serviceIds: [],
    fields: [],
    isActive: true,
    updatedAt: new Date().toISOString().slice(0, 10),
  }
}

export function createFieldFromType(type: FormFieldType, label?: string): FormField {
  return {
    id: `field-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: label ?? FIELD_TYPE_LABELS[type],
    type,
    required: false,
    options: type === 'dropdown' ? ['Option 1', 'Option 2'] : undefined,
  }
}

export function createFieldFromReusable(field: ReusableField): FormField {
  return {
    id: `field-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: field.label,
    type: field.type,
    required: false,
    reusableFieldId: field.id,
    options: field.options ? [...field.options] : undefined,
  }
}
