import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, withPermission, requireAuth } from '@/lib/rbac-middleware'
import { Module, Action } from '@/lib/rbac'
import { z } from 'zod'
import { InvoiceStatus, UserRole } from '@prisma/client'

const updateInvoiceSchema = z.object({
  status: z.nativeEnum(InvoiceStatus).optional(),
  notes: z.string().optional(),
})

// GET /api/invoices/[id] - Get a single invoice
export async function GET(
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
    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        client: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        payments: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Check access permissions
    if (user.role === UserRole.CLIENT) {
      const client = await db.client.findUnique({
        where: { userId: user.userId },
      })
      
      if (!client || invoice.clientId !== client.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    return NextResponse.json({ invoice })
  } catch (error) {
    console.error('Error fetching invoice:', error)
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 })
  }
}

// PATCH /api/invoices/[id] - Update an invoice
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

  if (!user.permissions?.includes('financial.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = updateInvoiceSchema.parse(body)

    const updateData: any = {}
    
    if (data.status) updateData.status = data.status
    if (data.notes !== undefined) updateData.notes = data.notes

    const invoice = await db.invoice.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        payments: true,
      },
    })

    return NextResponse.json({ invoice })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('Error updating invoice:', error)
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 })
  }
}

// DELETE /api/invoices/[id] - Delete an invoice
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

  if (!user.permissions?.includes('financial.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // Check if invoice has payments
    const invoice = await db.invoice.findUnique({
      where: { id },
      include: { payments: true },
    })

    if (invoice && invoice.payments.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete invoice with payments' },
        { status: 400 }
      )
    }

    // Soft delete invoice (mark as deleted, keep ID and data)
    await db.invoice.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() }
    })

    return NextResponse.json({ message: 'Invoice deleted successfully' })
  } catch (error) {
    console.error('Error deleting invoice:', error)
    return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 })
  }
}

