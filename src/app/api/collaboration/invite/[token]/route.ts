import { NextRequest, NextResponse } from 'next/server'
import { CollaborationInviteStatus, UserRole } from '@prisma/client'
import { z } from 'zod'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import {
  collaboratorAlreadyLinked,
  getPendingInviteByToken,
} from '@/lib/collaboration'

type RouteContext = { params: Promise<{ token: string }> }

/** GET /api/collaboration/invite/[token] — public invite preview */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params
    const invite = await getPendingInviteByToken(token)
    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    const existingUser = await db.user.findFirst({
      where: { email: invite.inviteEmail, isDeleted: false },
      select: { id: true, role: true, name: true, email: true },
    })

    return NextResponse.json({
      data: {
        status: invite.status,
        inviteEmail: invite.inviteEmail,
        invitedAt: invite.invitedAt,
        expiresAt: invite.expiresAt,
        client: invite.client,
        existingCollaborator:
          existingUser?.role === UserRole.COLLABORATOR
            ? { id: existingUser.id, name: existingUser.name, email: existingUser.email }
            : null,
        canAccept: invite.status === CollaborationInviteStatus.PENDING,
      },
    })
  } catch (error) {
    console.error('[CollaborationInvite GET]', error)
    return NextResponse.json({ error: 'Failed to load invite' }, { status: 500 })
  }
}

const acceptSchema = z.object({
  name: z.string().min(2).optional(),
  password: z.string().min(6).optional(),
})

/** POST /api/collaboration/invite/[token]/accept — accept invite (signup or link) */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params
    const invite = await getPendingInviteByToken(token)
    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }
    if (invite.status !== CollaborationInviteStatus.PENDING) {
      return NextResponse.json(
        { error: `This invite is ${invite.status.toLowerCase()} and cannot be accepted.` },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const parsed = acceptSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      )
    }

    const email = invite.inviteEmail.toLowerCase()
    let user = await db.user.findFirst({
      where: { email, isDeleted: false },
    })
    let createdNew = false
    if (user) {
      if (user.role !== UserRole.COLLABORATOR) {
        return NextResponse.json(
          {
            error:
              'This email already belongs to a non-collaborator account. Use a different email for collaboration.',
          },
          { status: 409 }
        )
      }
      if (await collaboratorAlreadyLinked(user.id)) {
        return NextResponse.json(
          {
            error:
              'You are already linked to another client. A collaborator can only work with one client.',
          },
          { status: 409 }
        )
      }
    } else {
      if (!parsed.data.password || !parsed.data.name) {
        return NextResponse.json(
          { error: 'Name and password are required to create your collaborator account' },
          { status: 400 }
        )
      }
      const passwordHash = await hashPassword(parsed.data.password)
      user = await db.user.create({
        data: {
          email,
          name: parsed.data.name.trim(),
          passwordHash,
          role: UserRole.COLLABORATOR,
          emailVerified: new Date(),
        },
      })
      createdNew = true
    }

    const accepted = await db.clientCollaborator.update({
      where: { id: invite.id },
      data: {
        status: CollaborationInviteStatus.ACCEPTED,
        collaboratorUserId: user.id,
        acceptedAt: new Date(),
      },
      include: {
        client: {
          select: { id: true, name: true, email: true, company: true, clientNumber: true },
        },
      },
    })

    return NextResponse.json({
      data: {
        message: 'Invite accepted. You can now sign in as a collaborator.',
        email: user.email,
        client: accepted.client,
        isNewUser: createdNew,
      },
    })
  } catch (error) {
    console.error('[CollaborationInvite POST]', error)
    return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 })
  }
}
