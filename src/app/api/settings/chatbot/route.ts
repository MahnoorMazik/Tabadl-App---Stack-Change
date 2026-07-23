import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac-middleware'
import { getChatbotSettingsForAdmin, saveChatbotSettings, chatbotSettingsSchema } from '@/lib/chatbot/settings'
import { z } from 'zod'

export const GET = withAuth(async (request) => {
  const user = request.user!
  if (user.role !== 'STAFF') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const settings = await getChatbotSettingsForAdmin()
  return NextResponse.json(settings)
})

export const PUT = withAuth(async (request) => {
  const user = request.user!
  if (user.role !== 'STAFF' || !user.permissions?.includes('settings.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = chatbotSettingsSchema.parse(body)
    const saved = await saveChatbotSettings(data)
    return NextResponse.json({ success: true, ...saved })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('[ChatbotSettings] Save failed:', error)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
})
