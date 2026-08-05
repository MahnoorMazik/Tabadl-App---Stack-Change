import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/rbac-middleware'
import { getGeneralSettings, saveGeneralSettings } from '@/lib/settings/general'

const updateSchema = z.object({
  clientEmailNotifications: z.boolean().optional(),
  clientWhatsAppNotifications: z.boolean().optional(),
})

export const GET = withAuth(async (request) => {
  const user = request.user!

  if (user.role !== 'STAFF') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const settings = await getGeneralSettings()
    return NextResponse.json({ settings })
  } catch (error) {
    console.error('[GeneralSettings] GET failed:', error)
    return NextResponse.json({ error: 'Failed to load general settings' }, { status: 500 })
  }
})

export const PUT = withAuth(async (request) => {
  const user = request.user!

  if (user.role !== 'STAFF') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      )
    }

    if (
      typeof parsed.data.clientEmailNotifications !== 'boolean' &&
      typeof parsed.data.clientWhatsAppNotifications !== 'boolean'
    ) {
      return NextResponse.json(
        { error: 'At least one setting field is required' },
        { status: 400 }
      )
    }

    const saved = await saveGeneralSettings(parsed.data)
    return NextResponse.json({
      success: true,
      settings: {
        id: saved.id,
        clientEmailNotifications: saved.clientEmailNotifications,
        clientWhatsAppNotifications: saved.clientWhatsAppNotifications,
        updatedAt: saved.updatedAt,
      },
    })
  } catch (error) {
    console.error('[GeneralSettings] PUT failed:', error)
    return NextResponse.json({ error: 'Failed to save general settings' }, { status: 500 })
  }
})
