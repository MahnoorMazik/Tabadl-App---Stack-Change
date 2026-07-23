import { db } from '@/lib/db'
import { NextRequest } from 'next/server'

interface AuditLogData {
  entityType: string
  entityId: string
  entityName?: string
  userId: string
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  changes?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

export type AuditSession = { userId: string } | null

function getRequestMeta(request?: NextRequest) {
  return {
    ipAddress:
      request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request?.headers.get('x-real-ip') ||
      undefined,
    userAgent: request?.headers.get('user-agent') || undefined,
  }
}

function computeChanges(
  oldValues?: Record<string, unknown>,
  newValues?: Record<string, unknown>
): Record<string, { old: unknown; new: unknown }> | undefined {
  if (!oldValues || !newValues) return undefined
  const changes: Record<string, { old: unknown; new: unknown }> = {}
  for (const key of Object.keys(newValues)) {
    if (oldValues[key] !== newValues[key]) {
      changes[key] = { old: oldValues[key], new: newValues[key] }
    }
  }
  return Object.keys(changes).length > 0 ? changes : undefined
}

async function writeAuditLog(
  action: string,
  data: AuditLogData
): Promise<void> {
  await db.auditLog.create({
    data: {
      entityType: data.entityType,
      entityId: data.entityId,
      entityName: data.entityName,
      action,
      userId: data.userId,
      oldValues: data.oldValues ? JSON.stringify(data.oldValues) : null,
      newValues: data.newValues ? JSON.stringify(data.newValues) : null,
      changes: data.changes ? JSON.stringify(data.changes) : null,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    },
  })
}

export async function auditLog(
  session: AuditSession,
  action: 'create' | 'update' | 'delete',
  entityType: string,
  entityId: string,
  entityName?: string,
  oldValues?: Record<string, unknown>,
  newValues?: Record<string, unknown>,
  request?: NextRequest
): Promise<void> {
  const userId = session?.userId
  if (!userId) return

  const meta = getRequestMeta(request)
  const actionUpper = action.toUpperCase()
  const changes =
    action === 'update' ? computeChanges(oldValues, newValues) : undefined

  try {
    await writeAuditLog(actionUpper, {
      entityType,
      entityId,
      entityName,
      userId,
      oldValues: action === 'delete' || action === 'update' ? oldValues : undefined,
      newValues: action === 'create' || action === 'update' ? newValues : undefined,
      changes,
      ...meta,
    })
  } catch (error) {
    console.error(`[AuditLog] Failed to log ${action} ${entityType}/${entityId}:`, error)
  }
}

export async function logAuthEvent(
  action: 'LOGIN' | 'LOGOUT',
  userId: string,
  request?: NextRequest
): Promise<void> {
  const meta = getRequestMeta(request)
  try {
    await writeAuditLog(action, {
      entityType: 'Auth',
      entityId: userId,
      entityName: action === 'LOGIN' ? 'User Login' : 'User Logout',
      userId,
      ...meta,
    })
  } catch (error) {
    console.error('[AuditLog] Auth event failed:', error)
  }
}

export async function getAuditLogsForEntity(entityType: string, entityId: string) {
  return db.auditLog.findMany({
    where: { entityType, entityId },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

/** Strip sensitive fields before storing in audit logs. */
export function sanitizeForAudit<T extends Record<string, unknown>>(data: T): T {
  const copy = { ...data }
  for (const key of ['password', 'passwordHash', 'token', 'refresh_token']) {
    if (key in copy) delete copy[key]
  }
  return copy
}
