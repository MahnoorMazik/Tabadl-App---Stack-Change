/** Client-safe wizard file helpers (no Node fs imports). */

export function isWizardFileUrl(value: string | null | undefined): boolean {
  if (!value) return false
  return (
    value.includes('/api/documents/download/') ||
    /^https?:\/\//i.test(value)
  )
}

export function wizardFileDisplayName(
  fileUrl: string | null | undefined,
  value: string | null | undefined
): string {
  if (value && !isWizardFileUrl(value)) return value
  if (!fileUrl) return value || 'Uploaded file'
  try {
    const pathPart = fileUrl.split('?')[0]
    const last = pathPart.split('/').filter(Boolean).pop() || 'Uploaded file'
    return decodeURIComponent(last)
  } catch {
    return 'Uploaded file'
  }
}

/** Build PATCH answer rows, mapping FILE fields to fileUrl. */
export function buildWizardAnswersPayload(
  answers: Record<string, string>,
  fields: Array<{
    fieldId: string
    type: string
    answer?: { value: string | null; fileUrl: string | null } | null
  }>,
  fileNames?: Record<string, string>
) {
  return fields.map((field) => {
    if (field.type === 'INSTRUCTION') {
      return {
        fieldId: field.fieldId,
        value: null,
        fileUrl: null as string | null,
      }
    }

    const raw =
      answers[field.fieldId] ??
      (field.type === 'FILE'
        ? field.answer?.fileUrl ?? field.answer?.value
        : field.answer?.value ?? field.answer?.fileUrl) ??
      ''
    const trimmed = String(raw).trim()

    if (field.type === 'FILE') {
      const url = isWizardFileUrl(trimmed)
        ? trimmed
        : isWizardFileUrl(field.answer?.fileUrl)
          ? field.answer!.fileUrl!
          : null
      const name =
        fileNames?.[field.fieldId] ||
        (field.answer?.value && !isWizardFileUrl(field.answer.value)
          ? field.answer.value
          : null) ||
        (url ? wizardFileDisplayName(url, null) : null)

      return {
        fieldId: field.fieldId,
        value: name,
        fileUrl: url,
      }
    }

    return {
      fieldId: field.fieldId,
      value: trimmed || null,
      fileUrl: null as string | null,
    }
  })
}
