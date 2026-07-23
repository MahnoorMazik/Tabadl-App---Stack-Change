# Realtime QA Findings (November 2025)

## Context
Live verification performed during 08–10 November after swapping landing pages and consolidating documentation. Focused on WebSocket behaviour, notifications, and long-running tasks.

## Observations
1. **Socket.IO Connectivity**
   - Staff ↔ Client messaging delivers in under 200ms on local network.
   - Connection fallback (polling) works when WebSocket blocked; logs emit warning but recover automatically.
2. **Notification Badges**
   - Badge counters refresh instantly on task assignment and document approval.
   - When multiple browser tabs open, deduplication ensures a single toast per event.
3. **Uploads Permission Guard**
   - Application startup halts with explicit error when host ownership incorrect. Resolved by running `init-uploads.sh` or manual `chown` as documented.
4. **Analytics Dashboard**
   - Initial load < 1.5s with seeded data. Query spikes observed after repeated filter toggles; consider caching layer in future.
5. **WhatsApp Preview**
   - `/api/whatsapp/test-staff` returns success when `WHATSAPP_DOCUMENT_BASE_URL` set; otherwise warning instructs configuration.

## Regression Checks
- Replayed historical issues (messages stuck in pending, dashboard totals incorrect) — all fixed.
- Verified support conversation typing indicator and read receipts under varying latency; no anomalies detected.

## Recommendations
- Add automated test covering uploads permission failure to ensure warning remains visible.
- Monitor analytics performance in staging with production-like dataset.
- Schedule quarterly realtime QA sessions aligned with major feature releases.

---
**Recorded:** 10 November 2025

