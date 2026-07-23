/**
 * Single time source for the app.
 *
 * - Storage & comparison: always UTC (Date, ISO strings, DB).
 * - Server-rendered text (e.g. notification body, emails): use formatInAppTz() with APP_TIMEZONE.
 * - Client display: use browser local or date-fns format() so users see their own timezone.
 *
 * Set APP_TIMEZONE (or NOTIFICATION_TIMEZONE for backwards compatibility) in env, e.g. Asia/Karachi.
 */

const APP_TIMEZONE =
  process.env.APP_TIMEZONE ||
  process.env.NOTIFICATION_TIMEZONE ||
  'Asia/Karachi'

/** Current moment (UTC). Use this for "now" in reminder/cron logic so the project has one time source. */
export function getNow(): Date {
  return new Date()
}

/** App timezone used for server-side formatting (notifications, emails, etc.). */
export function getAppTimezone(): string {
  return APP_TIMEZONE
}

/**
 * Format a date for server-rendered user-facing text (notification body, email, etc.)
 * so all such text uses the same timezone (APP_TIMEZONE).
 */
export function formatInAppTz(
  date: Date,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: 'short',
    timeStyle: 'short',
    hour12: false,
  }
): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: APP_TIMEZONE,
    ...options,
  }).format(date)
}

/**
 * Format date + time for notification/reminder text (e.g. "05/02/2025, 14:20").
 */
export function formatDateTimeForNotification(date: Date): string {
  return formatInAppTz(date)
}
