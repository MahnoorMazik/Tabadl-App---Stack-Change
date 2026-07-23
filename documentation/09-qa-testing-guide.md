# QA Testing Guide (November 2025)

## Test Environment Setup
1. Clone repository and install dependencies (`npm install`).
2. Copy `.env` from `env.production.example`; configure JWT secret, SMTP test creds.
3. Run `npm run dev:win` (Windows) or `npm run dev` (Unix) to start local server.
4. Ensure SQLite database seeded via `pnpm exec prisma migrate deploy` and `pnpm exec tsx prisma/seed.ts`.
5. For Docker verification, run `docker compose up -d --build` after initializing uploads permissions (`./init-uploads.sh`).
6. Confirm `.env` includes `NEXT_PUBLIC_APP_VERSION` (auto-set via `./setup-env.sh`) so the admin sidebar shows the correct release badge.

## Smoke Suite
| Area | Steps |
| --- | --- |
| Public Site | Load `/`, `/home-new`, `/about-us`, `/contact`; submit contact form and verify email log |
| Auth | Login as admin, staff, client; attempt invalid credentials to confirm rate limiting |
| RBAC | Confirm sidebar/menu visibility per role; restricted route access returns 403 |
| Dashboards | Validate metrics (applications, revenue, leads by country) match seed data |

## Functional Tests
1. **Leads → Clients**
   - Create lead, update status through pipeline, convert to client.
   - Verify deduplication warnings trigger on duplicate phone/email.
2. **Applications**
   - Create new application, assign case manager, add tasks and notes.
   - Transition status to approved, verify timeline and notifications.
3. **Documents**
   - Upload document, submit for review, approve/reject with notes.
   - Confirm file download works for authorized user and is blocked otherwise.
4. **Financial**
   - Issue invoice, log payment (partial + full), create expense, view reports.
5. **Messaging & Support**
   - Send message between staff and client, mark as read.
   - Initiate support conversation, confirm Socket.IO real-time updates.
6. **Notifications**
   - Trigger events (task assignment, application status change) and verify notification list/badges.

## Regression Checklist
- Run API cURL suite documented in `API_QA_REPORT.md`.
- Execute unit/integration tests (if enabled) with `npm test` (placeholder for future expansion).
- Validate WhatsApp document links when `WHATSAPP_DOCUMENT_BASE_URL` is set.

## Browser Coverage
- Chrome (latest)
- Firefox (latest)
- Edge (latest)
- Mobile Safari/Chrome for critical public flows

## Performance Spot Checks
- Lighthouse audit on `/` and `/dashboard`
- Verify bundle sizes after significant UI changes (`next build --analyze` optional)

## Reporting Bugs
1. Capture environment info, steps, expected vs actual results.
2. Attach screenshots/log snippets (`docker compose logs`, browser console).
3. File ticket with severity level and link to impacted module.
4. Update `08-api-issues.md` or relevant fix document upon closure.

---
**Last Updated:** 17 November 2025

