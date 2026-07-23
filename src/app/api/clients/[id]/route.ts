import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, requireAuth } from '@/lib/rbac-middleware'
import { UserRole } from '@prisma/client'
import { z } from 'zod'
import { softDeleteClientCascade } from '@/lib/soft-delete-cascade'

const updateClientSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  companyName: z.string().min(2).optional(),
  groupId: z.string().optional().nullable(),
  // Address fields
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  // Profile picture
  profilePicture: z.string().optional(),
})

// GET /api/clients/[id] - Get single client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { user } = authResult

  if (user.role !== UserRole.STAFF) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await params
    console.log('Fetching client with ID:', id)

    const client = await db.client.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            isActive: true,
          },
        },
        group: true,
        applications: {
          include: {
            assignedTo: {
              select: {
                name: true,
              },
            },
          },
        },
        invoices: true,
        _count: {
          select: {
            applications: true,
            invoices: true,
          },
        },
      },
    })

    if (!client) {
      console.log('Client not found for ID:', id)
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    console.log('Client found:', { id: client.id, name: client.name })
    return NextResponse.json({ client })
  } catch (error) {
    console.error('Error fetching client:', error)
    return NextResponse.json(
      { error: 'Failed to fetch client' },
      { status: 500 }
    )
  }
}

// PUT /api/clients/[id] - Update client
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { user } = authResult

  if (user.role !== UserRole.STAFF) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const data = updateClientSchema.parse(body)

    const client = await db.client.findUnique({
      where: { id },
      include: { user: true },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Update in transaction
    const updated = await db.$transaction(async (tx) => {
      // Update user data
      if (data.name || data.phone !== undefined) {
        await tx.user.update({
          where: { id: client.userId },
          data: {
            ...(data.name && { name: data.name }),
            ...(data.phone !== undefined && { phone: data.phone }),
          },
        })
      }

      // Update client data
      const updatedClient = await tx.client.update({
        where: { id },
        data: {
          ...(data.companyName && { companyName: data.companyName }),
          ...(data.groupId !== undefined && { 
            groupId: data.groupId && typeof data.groupId === 'string' && data.groupId.trim() !== '' 
              ? data.groupId 
              : null 
          }),
          // Address fields
          ...(data.street !== undefined && { street: data.street }),
          ...(data.city !== undefined && { city: data.city }),
          ...(data.state !== undefined && { state: data.state }),
          ...(data.country !== undefined && { country: data.country }),
          ...(data.postalCode !== undefined && { postalCode: data.postalCode }),
          // Profile picture
          ...(data.profilePicture !== undefined && { profilePicture: data.profilePicture }),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatar: true,
            },
          },
          group: true,
        },
      })

      return updatedClient
    })

    return NextResponse.json({ client: updated })
  } catch (error) {
    console.error('Error updating client:', error)
    return NextResponse.json(
      { error: 'Failed to update client' },
      { status: 500 }
    )
  }
}

// DELETE /api/clients/[id] - Delete client
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { user } = authResult

  if (user.role !== UserRole.STAFF) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await params

    const client = await db.client.findUnique({
      where: { id },
      include: {
        applications: true,
        invoices: true,
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Check if client has active applications
    if (client.applications.some(a => a.status !== 'COMPLETED')) {
      return NextResponse.json(
        { error: 'Cannot delete client with active applications' },
        { status: 400 }
      )
    }

    // Soft delete client and user in transaction
    await db.$transaction(async (tx) => {
      await softDeleteClientCascade(tx, id, client.userId)
    })

    return NextResponse.json({ message: 'Client deleted successfully' })
  } catch (error) {
    console.error('Error deleting client:', error)
    return NextResponse.json(
      { error: 'Failed to delete client' },
      { status: 500 }
    )
  }
}

