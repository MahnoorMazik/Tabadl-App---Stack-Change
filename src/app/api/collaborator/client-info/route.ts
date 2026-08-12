import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'  // ✅ Import auth from your config
import { db } from '@/lib/db'
import { UserRole, CollaborationInviteStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    // ✅ Use auth() from your config
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is a collaborator
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (!user || user.role !== UserRole.COLLABORATOR) {
      return NextResponse.json(
        { error: 'Access denied. Collaborator role required.' },
        { status: 403 }
      )
    }

    // Find the ACCEPTED collaboration for this collaborator
    const collaboration = await db.clientCollaborator.findFirst({
      where: {
        collaboratorUserId: session.user.id,
        status: CollaborationInviteStatus.ACCEPTED,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            company: true,
            clientNumber: true,
          }
        }
      }
    })

    if (!collaboration) {
      // Also check if there's a PENDING collaboration
      const pendingCollaboration = await db.clientCollaborator.findFirst({
        where: {
          collaboratorUserId: session.user.id,
          status: CollaborationInviteStatus.PENDING,
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              company: true,
            }
          }
        }
      })

      if (pendingCollaboration) {
        return NextResponse.json({
          data: {
            client: pendingCollaboration.client,
            status: 'PENDING',
            message: 'Invite is pending. Please accept the invitation first.'
          }
        })
      }

      return NextResponse.json(
        { error: 'No client found for this collaborator' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      data: {
        client: collaboration.client,
        collaborationId: collaboration.id,
        invitedAt: collaboration.invitedAt,
        acceptedAt: collaboration.acceptedAt,
        status: 'ACCEPTED'
      }
    })

  } catch (error) {
    console.error('Failed to fetch client info:', error)
    return NextResponse.json(
      { error: 'Failed to fetch client information' },
      { status: 500 }
    )
  }
}