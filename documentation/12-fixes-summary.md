# Fixes Summary (Key Resolutions through November 2025)

| Date | Area | Summary | Release |
| --- | --- | --- | --- |
| 2024-10-28 | Messaging | Stabilized message delivery ordering and read receipts | v0.9 |
| 2024-10-28 | Clients Dashboard | Corrected KPI aggregates and stale cache invalidation | v0.9 |
| 2024-10-28 | Support Conversations | Added strict role checks and fixed socket namespace | v0.9 |
| 2025-01-28 | Messages API | Resolved pagination bug and improved status mutations | v1.0 |
| 2025-01-28 | Clients Dashboard | Added dynamic filters, normalized metrics | v1.0 |
| 2025-01-28 | Support Conversations | Improved typing indicators, ensured participant scoping | v1.0 |
| 2025-11-08 | Upload Permissions | Added startup guard + documentation for uid/gid 1001 ownership | v1.1 |
| 2025-11-10 | Documentation | Consolidated master guide and refreshed all markdown references | v1.1 |

## Pending Enhancements
- Automated job to backfill `normalizedPhone` for legacy leads.
- Self-service password reset flow (design underway).
- Analytics caching strategy for high-traffic dashboards.

## Process Notes
- Every fix now requires QA validation and updated documentation entry.
- Deployment ZIP regenerated after significant fixes using `create-deployment-zip.ps1`.
- Post-deploy checklist includes verifying `/api/health`, `/api/analytics/errors`, and log scan for warnings.

---
**Last Updated:** 10 November 2025

