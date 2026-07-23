# API Validation & Known Issues (November 2025)

This log tracks outstanding considerations and recently resolved issues across the API surface.

## Resolved
- **Messaging Status Updates (Jan 2025):** Fixed inconsistent read receipts by normalizing status enums and debouncing Socket.IO events.
- **Clients Dashboard Totals (Jan 2025):** Adjusted analytics queries to respect role filters and cached responses.
- **Support Conversation Access (Jan 2025):** Corrected authorization checks for staff vs. client participants.
- **Upload Ownership Errors (Nov 2025):** Documented host permissions fix (ensure `uploads/` is owned by uid/gid 1001) and added startup checks.

## Current Watchlist
| Area | Notes | Mitigation |
| --- | --- | --- |
| File Upload Errors | Containers emit warnings when host permissions incorrect | Run `init-uploads.sh` prior to `docker compose up`; monitor health logs |
| Lead Deduplication | Normalized phone migration deployed; retroactive normalization pending for legacy records | Schedule maintenance job to backfill `normalizedPhone` |
| WhatsApp Document Links | External delivery depends on `WHATSAPP_DOCUMENT_BASE_URL` | Validate environment configuration; run `/api/whatsapp/test-staff` |
| Analytics Load | Long-running dashboards can spike CPU on low-memory hosts | Scale container resources; consider caching layer for `/api/analytics/*` |
| Legacy API Consumers | Deprecated endpoints removed post-Oct 2025 consolidation | Coordinate with integrators and direct them to latest REST surface |

## Testing Checklist
- Run regression scripts captured in `API_TEST_RESULTS_FINAL.md`
- Manually verify file uploads, document approval workflow, and messaging statuses after deployments
- Monitor `/api/analytics/errors` for real-time insights into failing requests

## Reporting
Use the following workflow for new findings:
1. Capture request/response payload with timestamps.
2. Note authenticated user and permissions.
3. File issue in project tracker referencing the module and endpoint.
4. Update this document upon resolution, linking to commit or release note.

---
**Last Updated:** 10 November 2025

