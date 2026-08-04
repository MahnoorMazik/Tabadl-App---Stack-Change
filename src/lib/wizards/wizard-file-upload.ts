import { saveUploadedFile } from '@/lib/file-upload'

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'application/pdf',
])

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function saveWizardApplicationFile(params: {
  applicationId: string
  file: File
}) {
  const { applicationId, file } = params

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return {
      ok: false as const,
      message: 'File type not allowed. Use PDF, PNG, or JPG.',
    }
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      ok: false as const,
      message: 'File too large. Maximum size is 10MB.',
    }
  }

  const saved = await saveUploadedFile(
    file,
    `wizard-applications/${applicationId}`
  )

  const url = `/api/documents/download/uploads/wizard-applications/${applicationId}/${saved.filename}`

  return {
    ok: true as const,
    data: {
      url,
      filename: saved.filename,
      originalName: file.name,
      size: saved.size,
      mimeType: file.type,
    },
  }
}
