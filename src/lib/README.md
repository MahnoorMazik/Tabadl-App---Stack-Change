# Support module export (from Zypher ERP)

Standalone copy of the **internal Support Tickets** feature for sharing / porting.
Not a runnable app by itself — it depends on shared Zypher ERP helpers (auth, RBAC, UI, Prisma, email).

**Exported:** 2026-07-31 from Zypher ERP

---

## What’s included

| Area | Path |
|------|------|
| Admin list | `src/app/admin/(authenticated)/support/page.tsx` |
| New ticket | `src/app/admin/(authenticated)/support/new/` |
| Ticket detail | `src/app/admin/(authenticated)/support/[id]/page.tsx` |
| UI components | `src/components/support/` |
| Lib helpers | `src/lib/support/` |
| REST APIs | `src/app/api/support/` |
| Attachment download | `src/app/api/documents/download/support/` |
| Schema / wiring notes | `docs/` (this folder) |

**Not included** (app “About / Changelog” under Support nav): `support/about/` — those are product About pages, not the ticket module.

---

## Features (summary)

- Create / edit / view / delete support tickets
- Statuses: `NEW`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`
- File attachments (upload, list, download, delete)
- Filters + search on list
- Permissions: `support.view`, `support.manage` (see `docs/permissions.md`)
- Optional email/in-app notifications on create and status change (via app notification registry)

---

## Wire-up checklist for another Next.js + Prisma app

1. Copy folders under `src/` into your project (same relative paths, or adjust imports).
2. Add Prisma models from `docs/schema.prisma` (and User relation `supportTicketsCreated`).
3. Run a migration creating `support_tickets` + `support_ticket_attachments` + enum.
4. Register permissions (`support.view`, `support.manage`) and route guards for `/admin/support`.
5. Add sidebar link → `/admin/support` (see `docs/sidebar-snippet.tsx`).
6. Ensure shared deps exist or replace imports (table below).
7. Optionally register notification events from `docs/notification-events.ts`.

---

## Hard dependencies (must exist or be stubbed)

Imports you’ll need to resolve in the target app:

- `@/lib/db` — Prisma client
- `@/lib/auth` — session (`auth()`)
- `@/lib/rbac` — `authorize` / permission checks
- `@/lib/api` — `apiError`, `requireSession`, `parseBody`, etc.
- `@/lib/serialize` — decimal/JSON helpers if used
- `@/components/layout/PageShell`, Adaptive form shells
- `@/components/ui/*` (button, input, dialog, table, …)
- `@/components/shared/*` (TableActionsDropdown, DataTablePagination, …)
- `@/hooks/useMediaQuery`, `useFormDirty`
- Notification dispatch used by `notifySupportTicketEmails.ts`
- Upload / file validation helpers referenced by attachment routes

Exact imports vary by file — grep for `@/` inside the export after copying.

---

## Suggested zip

Zip this whole `support-module` folder and share:

```text
exports/support-module/
```

On Windows (from repo root):

```powershell
Compress-Archive -Path "exports/support-module\*" -DestinationPath "exports/support-module.zip" -Force
```
