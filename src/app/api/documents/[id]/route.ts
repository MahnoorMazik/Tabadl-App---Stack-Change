import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, withPermission, requireAuth } from '@/lib/rbac-middleware'
import { Module, Action } from '@/lib/rbac'
import { z } from 'zod'
import { DocumentStatus } from '@prisma/client'
import { notifyDocumentReview } from '@/lib/notifications'

const reviewSchema = z.object({
  status: z.nativeEnum(DocumentStatus),
  reviewNotes: z.string().optional(),
})

// GET /api/documents/[id] - Get a single document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const { id } = await params

  try {
    const document = await db.document.findUnique({
      where: { id },
      include: {
        application: {
          include: {
            client: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    return NextResponse.json({ document })
  } catch (error) {
    console.error('Error fetching document:', error)
    return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 })
  }
}

// PATCH /api/documents/[id] - Review a document (approve/reject)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { user } = authResult
  const { id } = await params

  if (!user.permissions?.includes('documents.view')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = reviewSchema.parse(body)

    const document = await db.document.update({
      where: { id },
      data: {
        status: data.status,
        reviewNotes: data.reviewNotes,
        reviewedById: user.userId,
      },
      include: {
        application: {
          include: {
            client: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Notify uploader about review
    await notifyDocumentReview(document.id, document.uploadedById, data.status)

    return NextResponse.json({ document })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('Error reviewing document:', error)
    return NextResponse.json({ error: 'Failed to review document' }, { status: 500 })
  }
}

// DELETE /api/documents/[id] - Delete a document
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { user } = authResult
  const { id } = await params

  try {
    const document = await db.document.findUnique({
      where: { id },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Only uploader or staff can delete
    if (document.uploadedById !== user.userId && !user.permissions?.includes('documents.view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Soft delete document (mark as deleted, keep ID and data)
    await db.document.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() }
    })

    // TODO: Consider deleting physical file if needed, or keep for recovery

    return NextResponse.json({ message: 'Document deleted successfully' })
  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
  }
}

