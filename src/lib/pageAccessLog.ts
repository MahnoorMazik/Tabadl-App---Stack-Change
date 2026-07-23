import { db } from '@/lib/db'
import { resolveAdminPageTitle, shouldTrackAdminPageAccess } from '@/lib/adminPageTitles'

export interface LogPageAccessInput {
  userId: string
  path: string
  pageTitle?: string
  ipAddress?: string
  userAgent?: string
  referer?: string
}

export async function logPageAccess(input: LogPageAccessInput): Promise<void> {
  if (!shouldTrackAdminPageAccess(input.path)) return

  const pageTitle = input.pageTitle?.trim() || resolveAdminPageTitle(input.path)

  await db.pageAccessLog.create({
    data: {
      userId: input.userId,
      path: input.path,
      pageTitle,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      referer: input.referer ?? null,
    },
  })
}

export function getClientIp(request: Request): string | undefined {
  const headers = request.headers
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    undefined
  )
}
