# Feature Catalogue (November 2025)

## 1. Authentication & Authorization
- JWT-based login for clients and staff (Next.js API routes)
- Password hashing with bcryptjs and Zod-enforced policies
- Rate-limited login endpoints to mitigate brute force attempts
- Role-Based Access Control (RBAC) with granular permissions (view/create/update/delete/approve/assign/export/import/manage)
- Dynamic UI rendering via permission-aware sidebars and component guards

## 2. Lead & Client Management
- Lead capture from consultation form, manual entry, or CSV import (Papaparse)
- Pipeline statuses (NEW → CONTACTED → QUALIFIED → PROPOSAL → NEGOTIATION → WON/LOST)
- Lead assignment, notes, duplicate detection, and conversion to client profile
- Client directory with grouping, categorization, contact timeline, and payment/application history

## 3. Application Processing
- Supports service types: incorporation, visas, banking, tax, compliance, support
- Multi-stage lifecycle (PENDING → IN_PROGRESS → APPROVED/REJECTED → COMPLETED)
- Assignment workflows, approvals, SLA tracking, and history logs
- Task management (priority, due dates, status updates, overdue detection)

## 4. Document Management
- Drag-and-drop uploads with file validation and storage under `/uploads`
- Review workflow (pending → approved/rejected) with reviewer notes
- Document templates, categories, and archiving for long-term storage
- Secure download proxy with permission checks and audit logging

## 5. Financial Suite
- Invoice creation, PDF download, status tracking
- Payment logging (including partial payments) and reconciliation
- Expense management with approvals and category-based reporting
- Revenue and profitability dashboards accessible by finance roles

## 6. Messaging & Support
- Internal messaging (inbox, sent, templates) with read-status tracking
- Support conversations with real-time Socket.IO updates and typing indicators
- Email notifications via Nodemailer for escalations and status changes
- WhatsApp outreach leveraging `WHATSAPP_DOCUMENT_BASE_URL`

## 7. Analytics & Reporting
- Role-aware dashboards with KPIs (applications, clients, revenue, leads by country)
- Performance and error analytics (via `/api/analytics/**` routes)
- Export-ready reports for applications, clients, financials, and tasks
- Notification badges and sidebar stats generated from analytics endpoints

## 8. Help & Onboarding
- Contextual help center with FAQs, documentation links, and contact form
- In-app guides for new staff (seed data includes example users & roles)
- Automated QA scripts and manual checklists documented in `documentation/`

## 9. DevOps & Maintenance
- Docker-first deployment with standalone Next.js server (`server.ts`)
- Packaging + rollout tooling:
  - `create-deployment-zip.ps1` (Windows) regenerates the deployment bundle
  - `scripts/redeploy.sh` (Linux) handles backups (`.env`, `uploads`, `logs`), rsyncs new source, rebuilds containers, applies Prisma migrations, and waits for health
  - `deploy.sh` remains available for one-off local bring-up
- Upload initialization helper (`init-uploads.sh`) ensuring UID/GID 1001 ownership
- Prisma migrations for DB evolution; seed script for quick bootstrap

## 10. Extensibility
- Modular component library (`src/components`) following shadcn/ui patterns
- Utility layer (`src/lib`) for auth, analytics, mail, rate limiting, formatting
- Hook library (`src/hooks`) for sockets, search, toasts, retry logic
- Configurable environment via `.env` with templates and setup guides

---
## 11. UI Enhancements (v1.1.2)
- Admin sidebar footer now surfaces the app SemVer (`NEXT_PUBLIC_APP_VERSION`), visible in both collapsed and expanded states, ensuring staff immediately know which release is running.
- Version source of truth lives in `package.json`; `setup-env.sh` injects it into `.env` automatically.

---
**Last Updated:** 17 November 2025

