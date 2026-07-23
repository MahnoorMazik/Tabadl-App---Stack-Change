#!/bin/sh
# Baseline existing migrations so Prisma only runs the new one.
# Run this if you get P3005 (database schema is not empty).
# Then run: npx prisma migrate deploy

set -e
cd "$(dirname "$0")/.."

echo "Marking existing migrations as applied (baseline)..."
npx prisma migrate resolve --applied "20250120000000_add_token_version"
npx prisma migrate resolve --applied "20250130000000_add_followup_reminder_sent_at"
npx prisma migrate resolve --applied "20250131000000_add_notification_is_pinned"
npx prisma migrate resolve --applied "20251031111934_add_normalized_phone_to_leads"
npx prisma migrate resolve --applied "20251114120000_add_lead_notes"
npx prisma migrate resolve --applied "20251116153125_add_soft_delete_fields"
npx prisma migrate resolve --applied "20251116165000_add_user_avatar_phone"

echo "Deploying remaining migration (notification_preferences)..."
npx prisma migrate deploy

echo "Done."
