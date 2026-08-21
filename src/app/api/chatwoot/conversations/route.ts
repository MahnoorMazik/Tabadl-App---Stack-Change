import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'
import { requireAuth } from '@/lib/rbac-middleware'
import { listConversations } from '@/lib/chatwoot'

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
  }
  if (authResult.user.role !== UserRole.STAFF) {
    return NextResponse.json({ error: 'Staff access required' }, { status: 403 })
  }

  try {
    const inboxId = process.env.CHATWOOT_INBOX_ID
    if (!inboxId) {
      return NextResponse.json(
        { error: 'CHATWOOT_INBOX_ID is not configured' },
        { status: 500 }
      )
    }
    const data = await listConversations(inboxId, 'open')
    return NextResponse.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load conversations'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
