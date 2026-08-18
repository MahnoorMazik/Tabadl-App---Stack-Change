import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'
import { requireAuth } from '@/lib/rbac-middleware'
import { getMessages, sendMessage } from '@/lib/chatwoot'

async function requireStaff(request: NextRequest) {
  const authResult = await requireAuth(request)
  if ('error' in authResult) {
    return { error: authResult.error || 'Authentication required', status: authResult.status || 401 }
  }
  if (authResult.user.role !== UserRole.STAFF) {
    return { error: 'Staff access required', status: 403 }
  }
  return { user: authResult.user }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaff(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const { id } = await context.params
    const data = await getMessages(id)
    return NextResponse.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load messages'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaff(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const { id } = await context.params
    const { content } = await request.json()
    if (!content || !String(content).trim()) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
    }
    const data = await sendMessage(id, String(content).trim())
    return NextResponse.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to send message'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
