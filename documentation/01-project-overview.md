# Project Overview (November 2025)

## Vision
Tabadl Alkon CRM delivers an end-to-end digital experience for launching and managing companies in Saudi Arabia. The platform consolidates lead intake, onboarding, service delivery, compliance, messaging, and analytics into a single workspace for staff and clients.

## Platform Pillars
- **Multi-Portal Experience:** Public marketing site, admin/staff control center, and client self-service portal.
- **Integrated Operations:** Applications, documents, tasks, invoices, payments, and support threads live in a unified data model.
- **Real-Time Collaboration:** Socket.IO notifications, live messaging, and dynamic dashboards keep every stakeholder aligned.
- **Secure & Compliant:** RBAC-backed permissions, JWT authentication, audit trails, and environment-driven configuration.

## Technology Stack
| Layer | Key Technologies |
| --- | --- |
| Frontend | Next.js 15.3.5 (App Router), React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui, Radix, Framer Motion, Zustand, React Query |
| Backend | Next.js API routes, Node.js 20 runtime, Prisma 6.11.1, SQLite (`prisma/db/custom.db`), Socket.IO 4.8, Nodemailer |
| Tooling | Docker & Docker Compose, ESLint 9, tsx, nodemon, `create-deployment-zip.ps1`, `scripts/redeploy.sh`, `deploy.sh`, `init-uploads.sh` |

## High-Level Architecture
```
src/
  app/              # App Router pages (public, admin, client, API)
  components/       # Shared UI components
  contexts/         # Auth context
  hooks/            # Custom React hooks
  lib/              # Utilities (auth, analytics, mail, validation)
prisma/             # Schema, migrations, seeds, SQLite file under prisma/db
public/             # Static assets & media
uploads/            # Runtime storage (must be owned by uid 1001)
```

## Core Capabilities
1. **Lead & Client Lifecycle** – Capture leads, convert to clients, manage company profiles and service history.
2. **Application Processing** – Track incorporations, visas, tax, banking, compliance, and support engagements with task workflows.
3. **Document Management** – Upload, review, approve/reject, and templatize documents with permission-aware access.
4. **Financial Suite** – Generate invoices, log payments, monitor revenue, and track expenses.
5. **Messaging & Support** – Email, in-app messaging, WhatsApp document delivery, and live support channels.
6. **Analytics & Reporting** – Dashboards, KPI tracking, error analytics, and export-ready reports across modules.

## Deployment Snapshot
- Containerized via Docker; production bundle included in `tk-deployment.zip` (sources + scripts; documentation stays in the repo).
- Requires writable `uploads/` directory (uid/gid 1001) prior to starting containers.
- `.env` generated via `./setup-env.sh` (auto-injects the SemVer from `package.json` into `NEXT_PUBLIC_APP_VERSION`) or copied from `env.production.example`.
- Redeploy by uploading the refreshed zip and running `./scripts/redeploy.sh` to back up `.env`, `prisma/db`, `uploads`, `logs`, sync source, rebuild containers, and run `prisma migrate deploy`.

## Default Seed Data
| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@tk.sa` | `admin123` |
| Staff (Case Manager) | `fatima@tk.sa` | `staff123` |
| Client | `ahmed@techstartup.sa` | `client123` |

> ⚠️ Update all seeded credentials immediately after first login.

---
**Last Updated:** 17 November 2025

