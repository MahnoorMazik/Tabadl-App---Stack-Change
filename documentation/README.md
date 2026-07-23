# Tabadl Alkon CRM – Master Guide (November 2025)

This document replaces the previous multi-file documentation set as the authoritative reference. Supporting topic-specific documents remain in this directory for deep dives (see `README-main.md` for index).

---

## 1. Executive Summary
- **Purpose:** Digital platform that streamlines company formation and ongoing business services in Saudi Arabia by unifying client onboarding, operations, and compliance in one CRM.
- **Audience:** Product owners, engineers, DevOps, QA, and support staff responsible for running or extending the platform.
- **Highlights:** Multi-portal experience (public, admin/staff, client), real-time messaging and notifications, comprehensive analytics, deep RBAC controls, and explicit SemVer releases surfaced inside the admin sidebar (v1.1.2 and onward).

---

## 2. Architecture & Technology
**Frontend**
- Next.js 15.3.5 (App Router) with React 19 and TypeScript 5
- Tailwind CSS 4, shadcn/ui, Radix primitives, Lucide icons, Framer Motion for animation
- Zustand for lightweight state, React Query for data fetching, React Hook Form + Zod for typed forms, Recharts for analytics

**Backend**
- Next.js API routes running inside a custom server (`server.ts`) backed by Node.js 20 runtime
- Prisma 6.11.1 ORM with SQLite (`prisma/db/custom.db`)
- Socket.IO 4.8 for real-time messaging and presence features
- Nodemailer for transactional email, Axios for internal HTTP calls

**DevOps & Tooling**
- Docker & Docker Compose deployment model; production bundle generated via `npm run build`
- ESLint 9, tsx, nodemon, `create-deployment-zip.ps1` for packaging, and `scripts/redeploy.sh` for automated backups + rolling updates (legacy `deploy.sh` remains for quick local bring-up)
- Upload permissions helper `init-uploads.sh`; diagnostics in `logs/`

**High-Level Structure**
```
src/
  app/ (pages, layouts, API routes)
  components/ (UI library)
  contexts/ (Auth)
  hooks/ (custom React hooks)
  lib/ (utilities: auth, analytics, mail, validation)
prisma/ (schema, migrations, seed)
public/ (static assets, media)
uploads/ (runtime storage for docs)
```

---

## 3. Application Surface & Navigation
**Public & Marketing**
- Landing page (`/`) with service overview, hero CTA, testimonials, and contact form
- Alternate marketing variant at `/home-new`
- Company info (`/about-us`), contact, and legal pages for privacy, cookies, and terms
- Authentication touchpoints (`/login`, `/signup`), plus global error handling via `not-found.tsx`

**Admin / Staff Portal** (all routes guarded by auth + RBAC)
- Dashboards: KPI-rich landing (`/admin/dashboard`), alternative experimental dashboards
- Operations: Applications (pipeline views, tasks, status-specific lists), Clients (CRUD, import, grouping), Leads (import, dedupe, conversion), Documents (upload, templates, archives), Financial (revenue, invoices, payments, expenses)
- Collaboration: Team management, role administration, support chat, inbox/sent/support messaging with templates
- Governance: Settings (general, email, system, backup), notifications, analytics-driven reports, help center

**Client Portal**
- Universal dashboard router and dedicated `/client` namespace for application tracking, document approvals, messaging, notifications, support, profile, and settings
- Specialized timelines and tasks views to mirror staff workflows while exposing only client-owned data

**Staff Dashboard**
- `/staff/dashboard` delivers specialized metrics for non-admin personnel while respecting permissions

---

## 4. Feature Matrix (Condensed)
| Module | Key Capabilities |
| --- | --- |
| Authentication & RBAC | JWT-based auth, password hashing (bcryptjs), httpOnly session cookies, rate limiting, granular permissions (view/create/update/delete/approve/assign/export/import/manage) across modules |
| Client Management | Full CRUD, grouping, categorization, CSV import, history tracking, payment/application context |
| Lead Management | Multi-stage pipelines, consultation form ingestion, CSV import, assignment, analytics (conversion rates, source attribution) |
| Application Management | Supports multiple service tracks (incorporation, visas, tax, bank accounts, compliance, support); lifecycle automation with assignment, approvals, notifications, timeline |
| Document Management | Validated uploads, status workflow (pending → approved/rejected), templates, archiving, access controls |
| Task Management | Application-linked tasks with priority, due dates, status transitions, overdue detection, notifications |
| Messaging & Notifications | Internal messaging, templated responses, support channels, Socket.IO-powered notifications, email dispatch |
| Financial Suite | Revenue analytics, invoicing, payments, expenses with reporting and export tooling |
| Analytics & Reporting | Dashboards, performance metrics, country-based insights, error analytics (`/api/analytics/*`) |
| Support & Helpdesk | FAQ, docs, contact forms, live support chat, role-aware sidebar navigation |
| Integrations | WhatsApp document delivery (configurable base URL), email via Nodemailer, CSV import/export, optional Nginx proxy |

---

## 5. API & Integrations Overview
- RESTful endpoints under `src/app/api/**` segmented by domain (auth, clients, leads, applications, documents, financials, notifications, roles, settings, tasks, uploads, WhatsApp, analytics)
- Supports CRUD, status transitions, and background processing hooks; most routes expect JWT-authenticated requests and enforce permission checks
- Real-time channel via Socket.IO for messaging/notifications (`/socket.io`), with event names standardized in `lib/socket-events.ts`
- Email sending API (`/api/email/send`) leverages Nodemailer with environment-driven SMTP credentials
- Upload endpoints require writable `uploads/` mount owned by UID:GID 1001 (Next.js container user)
- WhatsApp helper routes rely on `WHATSAPP_DOCUMENT_BASE_URL` to generate externally accessible asset links

---

## 6. Data Model Snapshot
Prisma schema defines the following high-value models (partial list):
- `User`, `Role`, `Permission`, `RolePermission`, `UserRole` – RBAC system with seed data
- `Client`, `ClientCategory`, `ClientGroup`, `ClientGroupMember`
- `Lead`, `LeadSource`, `LeadNote`, `LeadAssignment`
- `Application`, `ApplicationTask`, `ApplicationStatusHistory`
- `Document`, `DocumentTemplate`, `DocumentReview`
- `Invoice`, `Payment`, `Expense`
- `Message`, `SupportConversation`, `Notification`
- `AuditLog`, `SystemSetting`
Relationships are modeled with Prisma and surfaced through typed repositories in `src/lib/*`. Migrations live under `prisma/migrations`; initial seed populates baseline roles, permissions, users, and sample data.

---

## 7. Authentication & Security
- JWT tokens issued on login (`/api/auth/login`), validated via middleware, and refreshed via `/api/auth/me`
- RBAC middleware aligns UI rendering and API access; unauthorized access returns 403 with contextual messaging
- Passwords hashed using bcryptjs; password policies enforced at form level with Zod
- Email validation utilities ensure contact forms and user management maintain data quality
- CORS settings managed through `lib/cors.ts`, rate limiting for critical auth routes, error analytics capturing stack traces for triage

---

## 8. Deployment & Environment
**Prerequisites**
- Ubuntu 20.04+, Docker Engine ≥ 20.10, Docker Compose v2, 2GB RAM, open port 3007
- Optional: Domain + Nginx + SSL via Certbot

**Steps (Dockerized)**
1. Provision server directories (`/opt/tabadl-alkon-crm`) and extract `Tabadl-Alkon-CRM-Deployment.zip` (sources + `scripts/`; documentation now lives in the repository).
2. Generate `.env` via `./setup-env.sh` **or** copy `env.production.example` manually. Key values:
   - `DATABASE_URL=file:./db/custom.db` (SQLite; path relative to prisma/)
   - `JWT_SECRET` (use `openssl rand -base64 32`)
   - `NEXT_PUBLIC_*` URLs + `WHATSAPP_DOCUMENT_BASE_URL`
   - `NEXT_PUBLIC_APP_VERSION` (mirrors `package.json` semver and drives the admin sidebar badge)
   - `PORT=3007`
3. Ensure uploads directory permissions: `sudo chown -R 1001:1001 uploads` + `chmod -R 755 uploads` (or run `./init-uploads.sh`)
4. Start with `sudo docker compose up -d --build`
5. For updates, upload the refreshed zip and run `chmod +x scripts/redeploy.sh && ./scripts/redeploy.sh` to back up persistent data (including SQLite), sync sources, rebuild containers, and apply Prisma migrations.
6. Optionally front with Nginx reverse proxy (see config snippet in `DEPLOYMENT.md`)

**Maintenance Commands**
- Restart/Stop: `sudo docker compose restart|down|up -d`
- Logs: `sudo docker compose logs -f tabadl-alkon-crm`
- Health: `curl http://localhost:3007/api/health`
- Backups: `cp prisma/db/custom.db prisma/db/custom.db.backup.$(date +%Y%m%d_%H%M%S)` (redeploy script backs up `.env`, `prisma/db`, `uploads`, `logs`)

**Seed Accounts (change passwords immediately)**
- Admin: `admin@tk.sa / admin123`
- Staff: `fatima@tk.sa / staff123`
- Client: `ahmed@techstartup.sa / client123`

---

## 9. Operations & Runbook
| Task | Command / Notes |
| --- | --- |
| Initialize uploads permissions | `chmod +x init-uploads.sh && sudo ./init-uploads.sh` |
| Verify writable uploads | `docker exec tabadl-alkon-crm test -w /app/uploads` |
| Rebuild deployment bundle | `./create-deployment-zip.sh` or `create-deployment-zip.ps1` (Windows). Output: `tk-deployment.zip` with `deploy.sh` + `deployment/`. |
| Redeploy automation | `chmod +x scripts/redeploy.sh && ./scripts/redeploy.sh` after uploading the latest zip (backs up `.env`, `prisma/db`, `uploads`, `logs`, rebuilds containers, runs Prisma migrate deploy, and polls `/api/health`). |
| Monitor error analytics | Review `lib/error-analytics.ts` logs and `logs/` directory |
| Database maintenance | Prisma migrations (`npx prisma migrate deploy`), seeding (`npm run db:seed`) |
| Environment secrets | Use detailed guides under `documentation/SETUP_JWT_SECRET*.md` |
| WhatsApp documents | Ensure `public/tk-media` assets accessible via configured base URL |

Key fixes captured historically:
- Upload permission failures resolved by enforcing UID 1001 ownership
- Messaging/service data inconsistencies patched (messages fix, clients dashboard fix, support conversations fix)
- JWT secret setup streamlined with helper scripts and documentation

---

## 10. QA & Testing
- **Manual QA Workflow:** Follow structured guide covering authentication, role switching, application lifecycle, document workflow, financial operations, and messaging.
- **API Regression:** Automated cURL suite validated core endpoints (health check, CRUD for clients/leads/applications/documents/financial modules). Latest full runs show green status with a few informational warnings requiring manual verification.
- **Realtime Verification:** Socket.IO channels tested for message delivery and notification badges in both admin and client portals.
- **Known Gaps:** File uploads rely on file-system permissions; ensure CI/CD includes chmod/chown step. Consider adding automated integration tests for WhatsApp document delivery and analytics endpoints.

---

## 11. Change Log & Known Issues
- **Version Badging (Nov 2025):** `package.json` SemVer now propagates to `NEXT_PUBLIC_APP_VERSION` and renders at the bottom of the admin sidebar (collapsed + expanded states).
- **Redeploy Automation:** Added `scripts/redeploy.sh` to back up `.env`, `prisma/db`, `uploads`, and `logs`, sync new source, rebuild containers, run `prisma migrate deploy`, and poll health.
- **Messages API Fix:** Addressed pagination and status updates for support conversations (Jan 2025)
- **Clients Dashboard Improvements:** Resolved mismatched KPI totals and stale caches in admin dashboards
- **Support Conversations:** Fixed role-based access and typing indicators in support chat module
- **API Issues (Historical):** Legacy endpoints audited; see `08-api-issues.md` for active watchlist
- **Uploads Permissions:** Root cause documented; treat as mandatory server-side checklist item

Future watch list:
- Normalize phone numbers (migration `20251031111934_add_normalized_phone_to_leads`)
- Monitor analytics routes for performance under production load

---

## 12. Integrations Snapshot
- **Email:** SMTP credentials via environment variables, send via `/api/email/send`
- **WhatsApp:** Document delivery uses signed URLs and the `WHATSAPP_DOCUMENT_BASE_URL`; includes comparison, setup, and troubleshooting best practices in standalone docs
- **CSV Import:** Clients and leads support CSV ingestion (Papaparse) with validation feedback
- **External Links:** Marketing assets stored under `public/tk-media`, referenced across landing pages and WhatsApp outreach

---

## 13. Development Workflow
| Command | Description |
| --- | --- |
| `npm run dev:win` | Windows-friendly dev server with auto-restart |
| `npm run dev:win:nodemon` | Nodemon-based watcher for finer-grained reloads |
| `npm run build && npm run start` | Production build and start |
| `npm run lint` | ESLint validation (configured in `eslint.config.mjs`) |
| `npm run db:push` / `npm run db:seed` | Prisma schema synchronization and seed data |

Coding standards rely on TypeScript strictness, Tailwind utility conventions, and shared UI components within `src/components`.

---

## 14. Appendix
- **Directory Guide:** See architecture section for structure; remove legacy snapshots and keep deployment bundle regenerated as needed.
- **Static Assets:** Images/logos in `public/`; ensure brand updates cascade to landing page variants (`/` and `/home-new`).
- **Realtime Services:** Review Socket.IO namespaces and events in `src/lib/realtime` utilities before introducing breaking changes.
- **Documentation Maintenance:** Deployment bundle no longer includes the `documentation/` directory. Keep this repo (or your wiki) as the source of truth and update markdown files whenever major product, deployment, or operational changes occur (see `README-main.md`).

---

**Last Updated:** 17 November 2025

