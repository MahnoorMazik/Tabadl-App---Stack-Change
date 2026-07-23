import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params
    const uploadsDir = join(process.cwd(), 'uploads')
    const filePath = join(uploadsDir, ...path)
    
    // Security: Prevent directory traversal - ensure file is within uploads directory
    const normalizedPath = join(uploadsDir, ...path)
    const resolvedUploadsDir = join(process.cwd(), 'uploads')
    if (!normalizedPath.startsWith(resolvedUploadsDir)) {
      console.error('[Static File] Security check failed: Path traversal attempt detected')
      return new NextResponse('Invalid path', { status: 400 })
    }
    
    // Check if file exists
    if (!existsSync(filePath)) {
      return new NextResponse('File not found', { status: 404 })
    }

    // Read the file
    const fileBuffer = await readFile(filePath)
    
    // Get file extension to determine content type
    const extension = path[path.length - 1].split('.').pop()?.toLowerCase()
    let contentType = 'application/octet-stream'
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg'
        break
      case 'png':
        contentType = 'image/png'
        break
      case 'gif':
        contentType = 'image/gif'
        break
      case 'webp':
        contentType = 'image/webp'
        break
      case 'svg':
        contentType = 'image/svg+xml'
        break
    }

    return new NextResponse(fileBuffer as any, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      },
    })
  } catch (error) {
    console.error('Error serving static file:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
