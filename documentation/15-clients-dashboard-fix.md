# Clients Dashboard Fix Log (January 2025)

## Issues Observed
- Dashboard KPIs (total clients, active applications, revenue) displayed inconsistent values.
- Cached responses persisted after role or filter changes, causing stale data.
- Country filter failed when lead records lacked normalized phone numbers.

## Fix Implementation
1. **Query Alignment** – Rebuilt Prisma aggregations to share a single data source with reports APIs.
2. **Cache Busting** – Added role- and filter-specific cache keys with 5-minute TTL; immediate invalidation on data mutation.
3. **Normalization** – Introduced normalized phone migration and fallback logic to avoid filter failures.
4. **UI Feedback** – Added loading states and tooltips to clarify data freshness and applied filters.

## QA Verification
- Regression run 28 January 2025; metrics matched manual calculations.
- November 2025 smoke test reconfirmed totals after additional features added.

## Ongoing Actions
- Implement scheduled job to backfill `normalizedPhone` for older records.
- Monitor analytics endpoint latency; consider pre-computed dashboards for high traffic.

---
**Status:** Resolved (v1.0) — Accurate as of 10 November 2025.

