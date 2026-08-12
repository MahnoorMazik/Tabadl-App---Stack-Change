import crypto from 'crypto'
import { CollaborationInviteStatus, UserRole } from '@prisma/client'
import { db } from '@/lib/db'

export const COLLABORATOR_INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000

export function createCollaboratorInviteToken() {
  return crypto.randomBytes(32).toString('hex')
}

export function collaboratorInviteUrl(token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${baseUrl}/invite/collaborator/${token}`
}

export async function getAcceptedCollaborationForUser(userId: string) {
  return db.clientCollaborator.findFirst({
    where: {
      collaboratorUserId: userId,
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
          userId: true,
        },
      },
    },
  })
}

/** Collaborators may only be linked to one client (accepted). */
export async function collaboratorAlreadyLinked(userId: string) {
  const existing = await getAcceptedCollaborationForUser(userId)
  return Boolean(existing)
}

export async function getPendingInviteByToken(token: string) {
  const invite = await db.clientCollaborator.findUnique({
    where: { inviteToken: token },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          company: true,
          clientNumber: true,
        },
      },
    },
  })
  if (!invite) return null

  if (
    invite.status === CollaborationInviteStatus.PENDING &&
    invite.expiresAt &&
    invite.expiresAt < new Date()
  ) {
    await db.clientCollaborator.update({
      where: { id: invite.id },
      data: { status: CollaborationInviteStatus.EXPIRED },
    })
    return { ...invite, status: CollaborationInviteStatus.EXPIRED }
  }

  return invite
}

export function isClientOrCollaboratorRole(role: string | UserRole | undefined | null) {
  const r = String(role || '').toUpperCase()
  return r === UserRole.CLIENT || r === UserRole.COLLABORATOR
}
