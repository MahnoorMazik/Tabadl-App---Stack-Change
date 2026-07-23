# API Overview (November 2025)

Tabadl Alkon CRM exposes RESTful endpoints under the Next.js App Router (`src/app/api/**`). All routes respond with JSON, require HTTPS in production, and return RFC 7807-style error payloads.

## Authentication & Headers
- **Auth:** Bearer JWT in `Authorization` header
- **Content-Type:** `application/json` unless noted
- **Rate Limits:** Applied to login/register endpoints (configurable in `lib/rate-limit.ts`)

## Auth Routes
| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/auth/register` | Create new client account (public) |
| POST | `/api/auth/login` | Issue JWT for clients/staff |
| POST | `/api/auth/logout` | Invalidate session |
| GET | `/api/auth/me` | Retrieve current user context |

## Users & Roles
- `/api/users` (GET/POST) — list & invite users
- `/api/users/[id]` (GET/PATCH/DELETE)
- `/api/users/[id]/role` (POST) — assign roles
- `/api/roles` & `/api/roles/[id]` — manage roles, permissions
- `/api/roles/permissions` — available permission catalogue

## Clients & Leads
- `/api/clients` CRUD plus `/api/clients/[id]`
- `/api/clients/groups`, `/groups/[id]`, `/groups/[id]/users`
- `/api/clients/categories`
- `/api/leads` CRUD; `/api/leads/[id]/convert` to client
- `/api/leads/import` — CSV ingestion
- `/api/leads/consultation` — public consultation form capture
- `/api/leads/duplicates` — duplicate detection & resolution

## Applications & Tasks
- `/api/applications` CRUD; filters via query params (`status`, `assignedTo`, `clientId`)
- `/api/applications/[id]` — detail & status updates
- `/api/applications/[id]/route.ts` nested endpoints for notes, history
- `/api/tasks` & `/api/tasks/[id]` — application tasks, assignment, completion
- `/api/tasks/assigned` — tasks for current user

## Documents
- `/api/documents` CRUD (metadata)
- `/api/documents/[id]` — detail, status, review notes
- `/api/documents/download/[...path]` — secure download proxy
- `/api/documents/templates` — template management
- `/api/upload` & `/api/upload/profile-picture` — file uploads (multipart)

## Financial
- `/api/invoices`, `/api/invoices/[id]`
- `/api/payments`, `/api/payments/[id]`
- `/api/expenses`, `/api/expenses/[id]`
- `/api/expenses/[id]/approve` — approval workflow

## Messaging & Support
- `/api/messages` (GET/POST)
- `/api/messages/[id]/status` — tracking delivery/read state
- `/api/support-conversations` — live chat threads
- `/api/support-messages/[id]/status`
- `/api/notifications` — list notifications for current user

## Analytics & Reports
- `/api/analytics/dashboard`
- `/api/analytics/errors`
- `/api/analytics/leads/by-country`
- `/api/analytics/performance`
- `/api/analytics/revenue`
- `/api/sidebar/stats` — aggregated metrics for navigation badges

## Settings & System
- `/api/settings/email` — SMTP configuration
- `/api/settings/email/recipients` — contact list
- `/api/settings/email/test` — send test email
- `/api/settings/email/contact` — public contact form
- `/api/static/[...path]` — serve static assets in Docker deployment
- `/api/health` — application health check

## WhatsApp Integration
- `/api/whatsapp/test-staff` — smoke test for staff WhatsApp configuration
- Uses `WHATSAPP_DOCUMENT_BASE_URL` to generate external URLs for attachments.

## Error Handling
- Standardized error helper in `lib/api-response.ts`
- Validation errors derive from Zod schemas; messages localized for UI consumption
- Audit logs recorded for critical mutations (see `lib/audit.ts`)

## Testing Tips
- Use `npm run dev:win` locally, or `docker compose up` in preview environments
- Seed data (`npm run db:seed`) ensures sample users for token generation
- API regression packs live in `documentation/API_TEST_RESULTS*.md` and should be refreshed after major releases

---
**Last Updated:** 10 November 2025

