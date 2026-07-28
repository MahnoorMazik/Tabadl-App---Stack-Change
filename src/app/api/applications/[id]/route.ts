import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth/config'

// GET /api/applications/[id] - Get application by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { customRole: true }
  })

  if (!user || !user.isActive) {
    return NextResponse.json(
      { error: 'User not found or inactive' },
      { status: 401 }
    )
  }

  const { id } = await params

  try {
    const application = await db.application.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Check if user has permission to view this application
    if (user.role === 'CLIENT' && application.client.user.id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json({ application })
  } catch (error) {
    console.error('Error fetching application:', error)
    return NextResponse.json({ error: 'Failed to fetch application' }, { status: 500 })
  }
}

// PUT /api/applications/[id] - Update application
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { customRole: true }
  })

  if (!user || !user.isActive) {
    return NextResponse.json(
      { error: 'User not found or inactive' },
      { status: 401 }
    )
  }

  const { id } = await params

  try {
    const body = await request.json()
    const {
      status,
      assignedToId,
      rejectionReason,
      notes,
      companyName,
      licenseType,
      visaType,
      bankName,
      serviceDetails,
      description,
    } = body

    const application = await db.application.findUnique({
      where: { id },
      include: { 
        client: {
          include: { user: true }
        }
      },
    })

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Check permissions
    if (user.role === 'CLIENT' && application.client.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const updateData: any = {}

    // Only staff can update status and assignment
    if (user.role === 'STAFF') {
      if (status !== undefined) {
        updateData.status = status
        if (status === 'APPROVED') {
          updateData.approvedById = user.id
        } else if (status === 'REJECTED') {
          updateData.rejectionReason = rejectionReason || 'Not specified'
        }
      }
      if (assignedToId !== undefined) {
        updateData.assignedToId = assignedToId
      }
    }

    // Clients can update their application details if still pending
    if (user.role === 'CLIENT' && application.status === 'PENDING') {
      if (companyName !== undefined) updateData.companyName = companyName
      if (licenseType !== undefined) updateData.licenseType = licenseType
      if (visaType !== undefined) updateData.visaType = visaType
      if (bankName !== undefined) updateData.bankName = bankName
      if (serviceDetails !== undefined) updateData.serviceDetails = serviceDetails
      if (description !== undefined) updateData.description = description
    }

    if (notes !== undefined) updateData.notes = notes

    const updatedApplication = await db.application.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Create notification for user if status changed
    if (status && user.role === 'STAFF') {
      const message = `Your ${application.type.replace('_', ' ').toLowerCase()} application has been ${status.toLowerCase()}`
      await db.notification.create({
        data: {
          userId: application.client.user.id,
          title: `Application ${status}`,
          message,
        },
      })
      await sendWhatsAppNotificationToUser(application.client.user.id, message)
    }

    return NextResponse.json({ application: updatedApplication })
  } catch (error) {
    console.error('Error updating application:', error)
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 })
  }
}

// DELETE /api/applications/[id] - Delete application
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { 
      customRole: true,
      clientProfile: true
    }
  })

  if (!user || !user.isActive) {
    return NextResponse.json(
      { error: 'User not found or inactive' },
      { status: 401 }
    )
  }

  const { id } = await params

  try {
    const application = await db.application.findUnique({
      where: { id },
    })

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Only allow deletion by the owner or admin
    if (user.role === 'CLIENT' && application.clientId !== user.clientProfile?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Only allow deletion of pending applications
    if (application.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Can only delete pending applications' },
        { status: 400 }
      )
    }

    // Soft delete application (mark as deleted, keep ID and data)
    await db.application.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() }
    })
    
    // Also soft delete related documents and tasks
    await db.document.updateMany({
      where: { applicationId: id, isDeleted: false },
      data: { isDeleted: true, deletedAt: new Date() }
    })
    
    await db.task.updateMany({
      where: { applicationId: id, isDeleted: false },
      data: { isDeleted: true, deletedAt: new Date() }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting application:', error)
    return NextResponse.json({ error: 'Failed to delete application' }, { status: 500 })
  }
}
