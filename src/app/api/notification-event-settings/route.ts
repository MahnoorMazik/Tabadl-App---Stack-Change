import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { withPermission } from '@/lib/rbac-middleware'
import { Module, Action, type Permission } from '@/lib/rbac'
import {
  EVENT_REGISTRY,
  getEventsByModule,
  MODULES_ORDER,
  getEventDefault,
} from '@/lib/notifications/event-registry'

export const GET = withPermission(
  [`${Module.SETTINGS}.${Action.VIEW}` as Permission]
)(async () => {
  const dbRows = await db.notificationEventSetting.findMany()
  const dbMap = new Map(dbRows.map((r) => [r.eventType, r]))

  const grouped = MODULES_ORDER.map((module) => {
    const events = (getEventsByModule().get(module) ?? []).map((def) => {
      const row = dbMap.get(def.eventType)
      return {
        eventType: def.eventType,
        label: def.label,
        description: def.description,
        module: def.module,
        sendEmail: row ? row.sendEmail : def.defaultEmail,
        sendInApp: row ? row.sendInApp : def.defaultInApp,
        sendPush: row ? row.sendPush : def.defaultPush,
        recipients: row ? row.recipients : def.defaultRecipients,
        scheduleHour: row?.scheduleHour ?? null,
        scheduleMinute: row?.scheduleMinute ?? null,
        savedInDb: !!row,
      }
    })
    return { module, events }
  })

  return NextResponse.json(grouped)
})

const updateSchema = z.object({
  sendEmail: z.boolean().optional(),
  sendInApp: z.boolean().optional(),
  sendPush: z.boolean().optional(),
  recipients: z.enum(['assigned', 'all_admins', 'both']).optional(),
  scheduleHour: z.number().int().min(0).max(23).optional(),
  scheduleMinute: z.number().int().min(0).max(59).optional(),
})

export const PATCH = withPermission(
  [`${Module.SETTINGS}.${Action.MANAGE}` as Permission]
)(async (request) => {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = z
    .object({ eventType: z.string(), data: updateSchema })
    .safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error' }, { status: 400 })
  }

  const { eventType, data } = parsed.data
  const def = EVENT_REGISTRY.find((e) => e.eventType === eventType)
  if (!def) {
    return NextResponse.json({ error: `Unknown event type: ${eventType}` }, { status: 400 })
  }

  const createData = {
    eventType,
    sendEmail: data.sendEmail ?? def.defaultEmail,
    sendInApp: data.sendInApp ?? def.defaultInApp,
    sendPush: data.sendPush ?? def.defaultPush,
    recipients: data.recipients ?? def.defaultRecipients,
    scheduleHour: data.scheduleHour ?? null,
    scheduleMinute: data.scheduleMinute ?? null,
  }

  const setting = await db.notificationEventSetting.upsert({
    where: { eventType },
    create: createData,
    update: data,
  })

  return NextResponse.json({
    eventType: setting.eventType,
    label: def.label,
    description: def.description,
    module: def.module,
    sendEmail: setting.sendEmail,
    sendInApp: setting.sendInApp,
    sendPush: setting.sendPush,
    recipients: setting.recipients,
    scheduleHour: setting.scheduleHour,
    scheduleMinute: setting.scheduleMinute,
    savedInDb: true,
  })
})

export const PUT = withPermission(
  [`${Module.SETTINGS}.${Action.MANAGE}` as Permission]
)(async (request) => {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = z
    .array(
      z.object({
        eventType: z.string(),
        sendEmail: z.boolean(),
        sendInApp: z.boolean(),
        sendPush: z.boolean(),
        recipients: z.enum(['assigned', 'all_admins', 'both']),
      })
    )
    .safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error' }, { status: 400 })
  }

  const results = await Promise.all(
    parsed.data.map(async (item) => {
      if (!EVENT_REGISTRY.find((e) => e.eventType === item.eventType)) return null
      return db.notificationEventSetting.upsert({
        where: { eventType: item.eventType },
        create: { ...item },
        update: {
          sendEmail: item.sendEmail,
          sendInApp: item.sendInApp,
          sendPush: item.sendPush,
          recipients: item.recipients,
        },
      })
    })
  )

  return NextResponse.json({ updated: results.filter(Boolean).length })
})
