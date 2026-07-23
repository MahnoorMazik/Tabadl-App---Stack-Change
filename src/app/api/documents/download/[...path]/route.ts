import { NextRequest, NextResponse } from 'next/server'
import { withAuth, requireAuth } from '@/lib/rbac-middleware'
import { readFile, access } from 'fs/promises'
import path from 'path'
import { constants } from 'fs'

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads'

// GET /api/documents/download/[...path] - Download a document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const { path: pathParams } = await params
    console.log('Document download request:', { pathParams, cwd: process.cwd() })
    
    // Path params already include 'uploads' directory, so join from process.cwd()
    const resolvedUploadDir = path.resolve(process.cwd(), 'uploads')
    const filePath = path.resolve(process.cwd(), ...pathParams)
    
    console.log('Resolved paths:', { resolvedUploadDir, filePath })
    
    // Security: Prevent directory traversal
    // Use path.relative which is more reliable than string comparison
    const relativePath = path.relative(resolvedUploadDir, filePath)
    console.log('Relative path:', relativePath)
    
    // If relative path contains .. or is absolute, it means path traversal
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      console.error('Path validation failed - directory traversal detected:', {
        filePath,
        resolvedUploadDir,
        relativePath,
        pathParams
      })
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
    }
    
    // Additional validation: ensure the file path is actually a child of uploads directory
    // Normalize and compare with case-insensitive comparison for Windows
    const normalizedFilePath = filePath.toLowerCase().replace(/\\/g, '/')
    const normalizedUploadDir = resolvedUploadDir.toLowerCase().replace(/\\/g, '/') + '/'
    
    if (!normalizedFilePath.startsWith(normalizedUploadDir)) {
      console.error('Path validation failed - file outside upload directory:', {
        normalizedFilePath,
        normalizedUploadDir,
        originalFilePath: filePath,
        originalUploadDir: resolvedUploadDir,
        pathParams
      })
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
    }
    
    console.log('Path validation passed, checking if file exists:', filePath)

    // Check if file exists before reading
    try {
      await access(filePath, constants.F_OK)
    } catch (error) {
      console.error('File does not exist:', { filePath, error })
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const fileBuffer = await readFile(filePath)
    
    // Get filename from path
    const filename = pathParams[pathParams.length - 1]

    // Determine content type based on extension
    const ext = path.extname(filename).toLowerCase()
    const contentTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
    }

    const contentType = contentTypes[ext] || 'application/octet-stream'
    
    // Check if this is a view request (for displaying in browser) or download request
    const { searchParams } = new URL(request.url)
    const isView = searchParams.get('view') === 'true'
    
    // Use 'inline' for viewing (displays in browser), 'attachment' for downloading
    const contentDisposition = isView 
      ? `inline; filename="${filename}"`
      : `attachment; filename="${filename}"`

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition,
      },
    })
  } catch (error) {
    console.error('Error downloading document:', error)
    return NextResponse.json({ error: 'Failed to download document' }, { status: 500 })
  }
}

