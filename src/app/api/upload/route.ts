import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac-middleware'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf'
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export const POST = withAuth(async (request) => {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const applicationId = formData.get('applicationId') as string | null
    const leadId = formData.get('leadId') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!applicationId && !leadId) {
      return NextResponse.json(
        { error: 'Application ID or Lead ID is required' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not allowed' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB' },
        { status: 400 }
      )
    }

    // Determine upload directory based on applicationId or leadId
    const uploadsDir = join(process.cwd(), 'uploads')
    const subDir = applicationId ? 'applications' : 'leads'
    const targetDir = join(uploadsDir, subDir, applicationId || leadId || '')
    
    // Create uploads directory structure if it doesn't exist
    // Handle volume mount permission issues gracefully with detailed error messages
    try {
      // Check if uploads directory exists and is writable
      if (!existsSync(uploadsDir)) {
        try {
          await mkdir(uploadsDir, { recursive: true, mode: 0o755 })
        } catch (err: any) {
          if (err.code === 'EACCES') {
            console.error('[Upload] Permission denied creating uploads directory:', uploadsDir)
            return NextResponse.json(
              { 
                error: 'Permission denied: Cannot create uploads directory',
                code: 'EACCES',
                details: 'This is a Docker volume mount permission issue. Run on host: mkdir -p uploads/applications uploads/leads && chmod -R 755 uploads'
              },
              { status: 500 }
            )
          }
          throw err
        }
      }
      
      // Create subdirectory (applications or leads)
      const subDirPath = join(uploadsDir, subDir)
      if (!existsSync(subDirPath)) {
        try {
          await mkdir(subDirPath, { recursive: true, mode: 0o755 })
        } catch (err: any) {
          if (err.code === 'EACCES') {
            console.error('[Upload] Permission denied creating subdirectory:', subDirPath)
            return NextResponse.json(
              { 
                error: `Permission denied: Cannot create ${subDir} directory`,
                code: 'EACCES',
                details: 'Volume mount permission issue. Create directories on host before starting container: mkdir -p uploads/applications uploads/leads && chmod -R 755 uploads'
              },
              { status: 500 }
            )
          }
          throw err
        }
      }
      
      // Create target directory (with applicationId or leadId)
      if (!existsSync(targetDir)) {
        try {
          await mkdir(targetDir, { recursive: true, mode: 0o755 })
        } catch (err: any) {
          if (err.code === 'EACCES') {
            console.error('[Upload] Permission denied creating target directory:', targetDir)
            return NextResponse.json(
              { 
                error: 'Permission denied: Cannot create upload target directory',
                code: 'EACCES',
                details: 'Ensure host directories exist with proper permissions: mkdir -p uploads/applications uploads/leads && chmod -R 755 uploads'
              },
              { status: 500 }
            )
          }
          throw err
        }
      }
    } catch (error: any) {
      console.error('[Upload] Unexpected error creating directories:', {
        error: error.message,
        code: error.code,
        uploadsDir,
        subDir,
        targetDir
      })
      
      // Return more helpful error message
      if (error.code === 'EACCES') {
        return NextResponse.json(
          { 
            error: 'Permission denied creating upload directory',
            code: 'EACCES',
            details: 'If using Docker volume mounts, create directories on host: mkdir -p uploads/applications uploads/leads && chmod -R 755 uploads'
          },
          { status: 500 }
        )
      }
      
      throw error
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.name.split('.').pop()
    const filename = `${timestamp}-${randomString}.${fileExtension}`
    const filepath = join(targetDir, filename)

    // Save file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    // Get additional fields
    const name = formData.get('name') as string | null
    const description = formData.get('description') as string | null

    // Save file record to database
    const { db } = await import('@/lib/db')
    const document = await db.document.create({
      data: {
        filename,
        originalName: file.name,
        path: filepath,
        size: file.size,
        mimeType: file.type,
        name: name || null,
        description: description || null,
        uploadedById: request.user!.userId,
        applicationId: applicationId || null,
        leadId: leadId || null,
        status: 'PENDING'
      }
    })

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        filename: document.filename,
        originalName: document.originalName,
        size: document.size,
        mimeType: document.mimeType,
        status: document.status,
        createdAt: document.createdAt
      }
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    )
  }
})

export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url)
    const applicationId = searchParams.get('applicationId')
    const leadId = searchParams.get('leadId')

    if (!applicationId && !leadId) {
      return NextResponse.json(
        { error: 'Application ID or Lead ID is required' },
        { status: 400 }
      )
    }

    const { db } = await import('@/lib/db')
    const where: any = {}
    if (applicationId) where.applicationId = applicationId
    if (leadId) where.leadId = leadId

    const documents = await db.document.findMany({
      where,
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        reviewedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ documents })

  } catch (error) {
    console.error('Get documents error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    )
  }
})
