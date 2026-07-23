# Fix Note: Matched Output Null (Historical)

## Background
Older reporting scripts returned `null` for matched output indices when filters produced no data, causing downstream consumers to crash.

## Resolution (October 2024)
- Guarded analytics pipelines against empty arrays.
- Provided default object `{ count: 0, value: 0 }` when matches absent.
- Added unit test coverage to ensure API never returns `null` where object expected.

## Current Status
- No occurrences since fix deployment.
- Analytics API returns consistent schema regardless of filter results.

## Action Items
- Retain regression test in analytics suite.
- Update documentation if analytics schema evolves.

---
**Verified:** 10 November 2025

