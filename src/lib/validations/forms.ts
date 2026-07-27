import { z } from 'zod'
import { FormFieldType } from '@prisma/client'

export const FORM_FIELD_TYPES = [
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
] as const satisfies readonly FormFieldType[]

const optionListSchema = z.array(z.string().trim().min(1)).min(1, 'At least one option is required')

/** Base object without refinements — needed so PATCH can use .partial() (Zod 4) */
const formFieldObjectSchema = z.object({
  label: z.string().trim().min(1, 'Label is required').max(200),
  type: z.enum(FORM_FIELD_TYPES),
  options: z.array(z.string().trim().min(1)).optional().nullable(),
  helpText: z.string().trim().max(500).optional().nullable(),
  placeholder: z.string().trim().max(200).optional().nullable(),
  isActive: z.boolean().optional(),
})

function refineSelectRadioOptions(
  data: { type?: FormFieldType; options?: string[] | null },
  ctx: z.RefinementCtx
) {
  if (data.type === 'SELECT' || data.type === 'RADIO') {
    const result = optionListSchema.safeParse(data.options ?? [])
    if (!result.success) {
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: `${data.type} fields must contain at least one option`,
      })
    }
  }
}

export const formFieldSchema = formFieldObjectSchema.superRefine(refineSelectRadioOptions)

export const formFieldUpdateSchema = formFieldObjectSchema
  .partial()
  .superRefine((data, ctx) => {
    if (Object.keys(data).length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'At least one field must be provided',
      })
    }
    refineSelectRadioOptions(data, ctx)
  })


const templateFieldItemSchema = z.object({
  fieldId: z.string().min(1, 'fieldId is required'),
  sortOrder: z.number().int().min(0).optional(),
  isRequired: z.boolean().optional().default(false),
  labelOverride: z.string().trim().max(200).optional().nullable(),
})

export const AREA_OF_INTEREST_KEYS = ['CR', 'PR', 'GR'] as const

export const formTemplateSchema = z.object({
  name: z.string().trim().min(1, 'Form name is required').max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  areaOfInterest: z.enum(AREA_OF_INTEREST_KEYS, {
    message: 'Area of interest is required',
  }),
  isActive: z.boolean().optional(),
  fieldIds: z
    .array(templateFieldItemSchema)
    .min(1, 'Template must contain at least one field'),
  serviceIds: z.array(z.string().min(1)).default([]),
})

export const formTemplateUpdateSchema = z.object({
  name: z.string().trim().min(1, 'Form name is required').max(200).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  areaOfInterest: z.enum(AREA_OF_INTEREST_KEYS).optional().nullable(),
  isActive: z.boolean().optional(),
  fieldIds: z
    .array(templateFieldItemSchema)
    .min(1, 'Template must contain at least one field')
    .optional(),
  serviceIds: z.array(z.string().min(1)).optional(),
})

export type FormFieldInput = z.infer<typeof formFieldSchema>
export type FormTemplateInput = z.infer<typeof formTemplateSchema>
export type FormTemplateFieldInput = z.infer<typeof templateFieldItemSchema>

/** Normalize sortOrder to contiguous 0..n-1 based on provided order */
export function normalizeTemplateFields(
  fields: FormTemplateFieldInput[]
): Array<{
  fieldId: string
  sortOrder: number
  isRequired: boolean
  labelOverride: string | null
}> {
  const seen = new Set<string>()
  const duplicates: string[] = []

  for (const field of fields) {
    if (seen.has(field.fieldId)) {
      duplicates.push(field.fieldId)
    }
    seen.add(field.fieldId)
  }

  if (duplicates.length > 0) {
    throw new DuplicateFieldIdsError(duplicates)
  }

  return [...fields]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((field, index) => ({
      fieldId: field.fieldId,
      sortOrder: index,
      isRequired: field.isRequired ?? false,
      labelOverride: field.labelOverride ?? null,
    }))
}

export class DuplicateFieldIdsError extends Error {
  fieldIds: string[]

  constructor(fieldIds: string[]) {
    super('Duplicate fieldIds are not allowed')
    this.name = 'DuplicateFieldIdsError'
    this.fieldIds = [...new Set(fieldIds)]
  }
}

/** Persist options only for SELECT/RADIO; ignore for other types */
export function serializeFieldOptions(
  type: FormFieldType,
  options?: string[] | null
): string | null {
  if (type !== 'SELECT' && type !== 'RADIO') {
    return null
  }
  return JSON.stringify(options ?? [])
}

export function parseFieldOptions(options: string | null | undefined): string[] | null {
  if (!options) return null
  try {
    const parsed = JSON.parse(options)
    return Array.isArray(parsed) ? parsed.map(String) : null
  } catch {
    return null
  }
}

export function mapFormField(field: {
  id: string
  label: string
  type: FormFieldType
  options: string | null
  helpText: string | null
  placeholder: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: field.id,
    label: field.label,
    type: field.type,
    options: parseFieldOptions(field.options),
    helpText: field.helpText,
    placeholder: field.placeholder,
    isActive: field.isActive,
    createdAt: field.createdAt,
    updatedAt: field.updatedAt,
  }
}
