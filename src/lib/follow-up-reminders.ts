import { db } from '@/lib/db'
import { createNotification, shouldSendNotificationForEvent } from '@/lib/notifications'
import { getNow, formatDateTimeForNotification } from '@/lib/app-time'

const DEFAULT_REMINDER_MINUTES = 15
/** Minimum 15 min so reminder window is at least as large as cron interval (runs every 15 min). */
const MIN_REMINDER_MINUTES = 15

/**
 * Process due follow-up reminders: find follow-ups whose reminder time has passed,
 * create in-app + push notifications for relevant users, and mark reminderSentAt.
 * Safe to call repeatedly (idempotent via reminderSentAt).
 *
 * - Uses the maximum reminder window among users who have REMINDER enabled, so we
 *   send at the earliest time anyone wants (e.g. 60 min before). Everyone gets
 *   notified by or before their preferred time.
 * - Enforces at least 15 minutes so reminders align with cron granularity (every 15 min).
 * - Only sends to users who have REMINDER preference enabled.
 *
 * Call this from:
 * - GET /api/cron/follow-up-reminders (when cron is configured)
 */
export async function processFollowUpReminders(): Promise<{ checked: number; sent: number }> {
  const now = getNow()

  const followUps = await db.leadFollowUp.findMany({
    where: {
      reminderSentAt: null,
      scheduledAt: { gt: now },
    },
    include: {
      lead: {
        select: {
          id: true,
          fullName: true,
          leadNumber: true,
          assignedToId: true,
          createdById: true,
        },
      },
      createdBy: { select: { id: true } },
    },
  })

  const nowDate = getNow()
  let sent = 0
  for (const followUp of followUps) {
    const lead = followUp.lead
    const userIdsToNotify = new Set<string>()
    if (lead.assignedToId) userIdsToNotify.add(lead.assignedToId)
    if (lead.createdById) userIdsToNotify.add(lead.createdById)
    userIdsToNotify.add(followUp.createdById)

    // Only consider users who have REMINDER enabled. Use the maximum reminder window
    // so we send at the earliest time any of them wants (everyone gets notified by their preferred time).
    const userIdsWithReminderEnabled: string[] = []
    let maxMinutesBefore = MIN_REMINDER_MINUTES
    for (const userId of userIdsToNotify) {
      const reminderEnabled = await shouldSendNotificationForEvent(userId, 'REMINDER')
      if (!reminderEnabled) continue
      userIdsWithReminderEnabled.push(userId)
      const settings = await db.notificationSettings.findUnique({
        where: { userId },
        select: { reminderMinutesBefore: true },
      })
      const m = settings?.reminderMinutesBefore ?? DEFAULT_REMINDER_MINUTES
      if (m > maxMinutesBefore) maxMinutesBefore = m
    }
    const effectiveMinutes = Math.max(MIN_REMINDER_MINUTES, maxMinutesBefore)
    const reminderDueAt = new Date(
      followUp.scheduledAt.getTime() - effectiveMinutes * 60 * 1000
    )
    if (now < reminderDueAt) continue

    // If no one has REMINDER enabled, don't claim or send (so a future run can send if they enable it).
    if (userIdsWithReminderEnabled.length === 0) continue

    // Claim this follow-up atomically so concurrent runs don't both send.
    const claimed = await db.leadFollowUp.updateMany({
      where: { id: followUp.id, reminderSentAt: null },
      data: { reminderSentAt: nowDate },
    })
    if (claimed.count === 0) continue

    const title = 'Follow-up Soon'
    const body = `${followUp.title} – lead ${lead.fullName} (${lead.leadNumber}) at ${formatDateTimeForNotification(followUp.scheduledAt)}`
    const pushOverrides = {
      url: `/admin/leads`,
      tag: `followup-reminder-${followUp.id}`,
      data: {
        leadId: lead.id,
        followUpId: followUp.id,
        scheduledAt: followUp.scheduledAt.toISOString(),
        type: 'lead_followup_reminder',
      },
    }

    for (const userId of userIdsWithReminderEnabled) {
      try {
        await createNotification(userId, title, body, true, pushOverrides)
        sent++
      } catch (err) {
        console.error('[Follow-up reminders] Send failed:', followUp.id, userId, err)
      }
    }
  }

  return { checked: followUps.length, sent }
}
