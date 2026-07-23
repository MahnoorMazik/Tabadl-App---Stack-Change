import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { withAuth } from '@/lib/rbac-middleware'
import { UserRole } from '@prisma/client'
import { db } from '@/lib/db'

export const POST = withAuth(async (request) => {
  const user = request.user!

  // Allow both STAFF and CLIENT users to upload profile pictures
  if (user.role !== UserRole.STAFF && user.role !== UserRole.CLIENT) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const data = await request.formData()
    const file: File | null = data.get('file') as unknown as File

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.name.split('.').pop()
    const filename = `profile-${timestamp}-${randomString}.${fileExtension}`

    // Save file to uploads directory
    const uploadsDir = join(process.cwd(), 'uploads')
    const filepath = join(uploadsDir, filename)
    
    await writeFile(filepath, buffer)

    // Also save to public directory for direct serving
    const publicDir = join(process.cwd(), 'public', 'uploads')
    const publicFilepath = join(publicDir, filename)
    
    // Ensure public/uploads directory exists
    const { mkdir } = await import('fs/promises')
    try {
      await mkdir(publicDir, { recursive: true })
      await writeFile(publicFilepath, buffer)
      console.log('File also saved to public directory:', publicFilepath)
    } catch (publicError) {
      console.error('Error saving to public directory:', publicError)
    }

    // Update user avatar in database
    try {
      console.log('Updating user avatar:', { userId: user.userId, filename })
      const updatedUser = await db.user.update({
        where: { id: user.userId },
        data: { avatar: filename }
      })
      console.log('Avatar updated successfully:', updatedUser.avatar)
    } catch (dbError) {
      console.error('Database update error:', dbError)
      // Continue with file upload even if database update fails
    }

    // Return the file path relative to the public directory
    const publicPath = `/uploads/${filename}`

    return NextResponse.json({ 
      success: true, 
      filePath: publicPath,
      filename: filename 
    })

  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
})
