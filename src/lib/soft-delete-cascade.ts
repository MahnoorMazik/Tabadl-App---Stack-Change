import { Prisma } from '@prisma/client'

type Tx = Prisma.TransactionClient

const now = () => new Date()

/**
 * Cascade soft delete for a user and related records.
 * Mirrors the existing inline logic in users/[id]/route.
 */
export async function softDeleteUserCascade(tx: Tx, userId: string) {
  // 1. Notifications
  await tx.notification.updateMany({
    where: { userId, isDeleted: false },
    data: { isDeleted: true, deletedAt: now() },
  })

  // 2. Tasks assigned to this user
  await tx.task.updateMany({
    where: { assignedToId: userId, isDeleted: false },
    data: { isDeleted: true, deletedAt: now() },
  })

  // 3. Messages sent by this user - Message model doesn't support soft delete
  // Messages are kept for historical purposes

  // 4. Applications belonging to any client of this user
  const clientIds = await tx.client
    .findMany({ where: { userId }, select: { id: true } })
    .then((clients) => clients.map((c) => c.id))

  if (clientIds.length > 0) {
    await tx.application.updateMany({
      where: { clientId: { in: clientIds }, isDeleted: false },
      data: { isDeleted: true, deletedAt: now() },
    })
  }

  // 5. Client profile(s)
  await tx.client.updateMany({
    where: { userId, isDeleted: false },
    data: { isDeleted: true, deletedAt: now() },
  })

  // 6. Documents uploaded by user
  await tx.document.updateMany({
    where: { uploadedById: userId, isDeleted: false },
    data: { isDeleted: true, deletedAt: now() },
  })

  // 7. Finally, the user itself
  await tx.user.update({
    where: { id: userId },
    data: { isDeleted: true, deletedAt: now() },
  })
}

/**
 * Cascade restore for a user and related records.
 * Restores only records that are currently soft-deleted.
 */
export async function restoreUserCascade(tx: Tx, userId: string) {
  // 1. Restore user
  await tx.user.updateMany({
    where: { id: userId, isDeleted: true },
    data: { isDeleted: false, deletedAt: null },
  })

  // 2. Restore client profile(s)
  await tx.client.updateMany({
    where: { userId, isDeleted: true },
    data: { isDeleted: false, deletedAt: null },
  })

  // 3. Restore applications for this user's clients
  const clientIds = await tx.client
    .findMany({ where: { userId }, select: { id: true } })
    .then((clients) => clients.map((c) => c.id))

  if (clientIds.length > 0) {
    await tx.application.updateMany({
      where: { clientId: { in: clientIds }, isDeleted: true },
      data: { isDeleted: false, deletedAt: null },
    })
  }

  // 4. Restore notifications
  await tx.notification.updateMany({
    where: { userId, isDeleted: true },
    data: { isDeleted: false, deletedAt: null },
  })

  // 5. Restore tasks
  await tx.task.updateMany({
    where: { assignedToId: userId, isDeleted: true },
    data: { isDeleted: false, deletedAt: null },
  })

  // 6. Restore documents uploaded by this user
  await tx.document.updateMany({
    where: { uploadedById: userId, isDeleted: true },
    data: { isDeleted: false, deletedAt: null },
  })
}

/**
 * Cascade soft delete for a client and its related records,
 * including the associated user.
 */
export async function softDeleteClientCascade(
  tx: Tx,
  clientId: string,
  userId: string
) {
  // Notifications for this user
  await tx.notification.updateMany({
    where: { userId, isDeleted: false },
    data: { isDeleted: true, deletedAt: now() },
  })

  // Support messages assigned to this user
  await tx.supportMessage.updateMany({
    where: { staffId: userId, isDeleted: false },
    data: { isDeleted: true, deletedAt: now() },
  })

  // Documents uploaded by this user
  await tx.document.updateMany({
    where: { uploadedById: userId, isDeleted: false },
    data: { isDeleted: true, deletedAt: now() },
  })

  // Applications for this client
  await tx.application.updateMany({
    where: { clientId, isDeleted: false },
    data: { isDeleted: true, deletedAt: now() },
  })

  // Invoices for this client
  await tx.invoice.updateMany({
    where: { clientId, isDeleted: false },
    data: { isDeleted: true, deletedAt: now() },
  })

  // Client itself
  await tx.client.update({
    where: { id: clientId },
    data: { isDeleted: true, deletedAt: now() },
  })

  // Finally, the user
  await tx.user.update({
    where: { id: userId },
    data: { isDeleted: true, deletedAt: now() },
  })
}

/**
 * Cascade restore for a client and its related records,
 * including the associated user.
 */
export async function restoreClientCascade(
  tx: Tx,
  clientId: string,
  userId: string
) {
  // Restore user
  await tx.user.updateMany({
    where: { id: userId, isDeleted: true },
    data: { isDeleted: false, deletedAt: null },
  })

  // Restore client
  await tx.client.updateMany({
    where: { id: clientId, isDeleted: true },
    data: { isDeleted: false, deletedAt: null },
  })

  // Restore client applications
  await tx.application.updateMany({
    where: { clientId, isDeleted: true },
    data: { isDeleted: false, deletedAt: null },
  })

  // Restore client invoices
  await tx.invoice.updateMany({
    where: { clientId, isDeleted: true },
    data: { isDeleted: false, deletedAt: null },
  })

  // Restore documents uploaded by this user
  await tx.document.updateMany({
    where: { uploadedById: userId, isDeleted: true },
    data: { isDeleted: false, deletedAt: null },
  })

  // Restore notifications
  await tx.notification.updateMany({
    where: { userId, isDeleted: true },
    data: { isDeleted: false, deletedAt: null },
  })

  // Restore support messages
  await tx.supportMessage.updateMany({
    where: { staffId: userId, isDeleted: true },
    data: { isDeleted: false, deletedAt: null },
  })
}

/**
 * Soft delete a lead and its related documents.
 */
export async function softDeleteLeadCascade(tx: Tx, leadId: string) {
  await tx.document.updateMany({
    where: { leadId, isDeleted: false },
    data: { isDeleted: true, deletedAt: now() },
  })

  await tx.lead.update({
    where: { id: leadId },
    data: { isDeleted: true, deletedAt: now() },
  })
}

/**
 * Restore a lead and its related documents.
 */
export async function restoreLeadCascade(tx: Tx, leadId: string) {
  await tx.lead.updateMany({
    where: { id: leadId, isDeleted: true },
    data: { isDeleted: false, deletedAt: null },
  })

  await tx.document.updateMany({
    where: { leadId, isDeleted: true },
    data: { isDeleted: false, deletedAt: null },
  })
}


