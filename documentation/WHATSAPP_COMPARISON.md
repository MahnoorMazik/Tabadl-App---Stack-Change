# WhatsApp Integration Comparison (November 2025)

## Current Approach (In-App Links)
- Generates document links using `WHATSAPP_DOCUMENT_BASE_URL`.
- Staff copy/paste link into WhatsApp Business or campaign tool.
- Pros: Simple, no additional provider fees.
- Cons: Manual process, relies on public accessibility of asset URL.

## Potential Enhancements
| Option | Pros | Cons |
| --- | --- | --- |
| WhatsApp Cloud API | Automated messaging, templated notifications, delivery receipts | Requires Meta Business approval, hosting webhook |
| Twilio WhatsApp | Managed API, fallback SMS, analytics | Per-message cost, vendor lock-in |
| Sinch/MessageBird | Regional routing options, built-in templates | Additional setup complexity |

## Decision Summary
- Continue with manual link sharing for MVP.
- Revisit automated provider integration when message volume justifies cost.
- Ensure `public/tk-media` resources remain optimized for external sharing.

## Next Steps
- Document SOP for staff to send WhatsApp updates (see `WHATSAPP_SETUP.md`).
- Monitor client feedback; if automation requested, evaluate Cloud API pilot.

---
**Maintainer:** Product Team — Updated 10 November 2025

