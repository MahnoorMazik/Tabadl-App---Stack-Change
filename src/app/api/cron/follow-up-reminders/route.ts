import { NextRequest } from 'next/server'
import { processFollowUpReminders } from '@/lib/follow-up-reminders'

const CRON_SECRET = process.env.CRON_SECRET

/**
 * GET /api/cron/follow-up-reminders
 * Call from a cron every 5–15 min with Authorization: Bearer <CRON_SECRET>
 * or ?secret=<CRON_SECRET> (e.g. Vercel Cron or external cron).
 *
 * This is the only trigger for follow-up reminders. Do not run from GET /api/notifications
 * (it caused duplicate notifications when multiple users/tabs fetched at once).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const tokenFromQuery = request.nextUrl.searchParams.get('secret')
  const token = tokenFromHeader ?? tokenFromQuery
  if (!CRON_SECRET || token !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const { checked, sent } = await processFollowUpReminders()
  return new Response(
    JSON.stringify({ ok: true, checked, sent }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
}
