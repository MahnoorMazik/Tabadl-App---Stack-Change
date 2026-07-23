import { auditLog, sanitizeForAudit, type AuditSession } from '@/lib/audit'
import { NextRequest } from 'next/server'

export async function logCreateActivity(
  session: AuditSession,
  entityType: string,
  entityId: string,
  entityName: string | undefined,
  newValues: Record<string, unknown>,
  request?: NextRequest
) {
  await auditLog(
    session,
    'create',
    entityType,
    entityId,
    entityName,
    undefined,
    sanitizeForAudit(newValues),
    request
  )
}

export async function logUpdateActivity(
  session: AuditSession,
  entityType: string,
  entityId: string,
  entityName: string | undefined,
  oldValues: Record<string, unknown>,
  newValues: Record<string, unknown>,
  request?: NextRequest
) {
  await auditLog(
    session,
    'update',
    entityType,
    entityId,
    entityName,
    sanitizeForAudit(oldValues),
    sanitizeForAudit(newValues),
    request
  )
}

export async function logDeleteActivity(
  session: AuditSession,
  entityType: string,
  entityId: string,
  entityName: string | undefined,
  oldValues: Record<string, unknown>,
  request?: NextRequest
) {
  await auditLog(
    session,
    'delete',
    entityType,
    entityId,
    entityName,
    sanitizeForAudit(oldValues),
    undefined,
    request
  )
}
