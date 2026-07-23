import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { randomBytes } from 'crypto'

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads'
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB default

export async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true })
  }
}

export function generateFilename(originalName: string): string {
  const ext = path.extname(originalName)
  const nameWithoutExt = path.basename(originalName, ext)
  const randomId = randomBytes(8).toString('hex')
  const timestamp = Date.now()
  return `${nameWithoutExt}-${timestamp}-${randomId}${ext}`
}

export async function saveUploadedFile(
  file: File,
  subfolder?: string
): Promise<{ filename: string; path: string; size: number }> {
  await ensureUploadDir()

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum of ${MAX_FILE_SIZE} bytes`)
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const filename = generateFilename(file.name)
  const uploadPath = subfolder 
    ? path.join(UPLOAD_DIR, subfolder)
    : UPLOAD_DIR

  if (!existsSync(uploadPath)) {
    await mkdir(uploadPath, { recursive: true })
  }

  const filePath = path.join(uploadPath, filename)
  await writeFile(filePath, buffer)

  return {
    filename,
    path: filePath,
    size: file.size,
  }
}

export function getFileUrl(filePath: string): string {
  // Return API endpoint for file download
  const relativePath = filePath.replace(UPLOAD_DIR, '')
  return `/api/documents/download${relativePath}`
}

