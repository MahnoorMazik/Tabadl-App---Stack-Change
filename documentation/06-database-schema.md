# Database Schema (November 2025)

The CRM relies on Prisma 6.11.1 with a SQLite backend (`prisma/db/custom.db`). Migrations live under `prisma/migrations`, with initial schema in `20250304000000_init_sqlite`.

## Core Entities
| Model | Purpose |
| --- | --- |
| `User` | Staff & client accounts with profile metadata |
| `Role`, `Permission`, `RolePermission`, `UserRole` | RBAC framework |
| `Client`, `ClientCategory`, `ClientGroup`, `ClientGroupMember` | Client segmentation |
| `Lead`, `LeadSource`, `LeadAssignment`, `LeadNote` | Lead lifecycle & attribution |
| `Application`, `ApplicationTask`, `ApplicationStatusHistory`, `ApplicationNote` | Service delivery workflow |
| `Document`, `DocumentTemplate`, `DocumentReview` | File management & approvals |
| `Invoice`, `Payment`, `Expense` | Financial records |
| `Message`, `SupportConversation`, `SupportMessage` | Communication channels |
| `Notification` | User alerts |
| `AuditLog`, `SystemSetting` | Compliance and configuration |

## Relationships (Highlights)
- **User ↔ Role:** Many-to-many via `UserRole`
- **Role ↔ Permission:** Many-to-many via `RolePermission`
- **Client ↔ Application:** One-to-many
- **Application ↔ Task/Document:** One-to-many with cascading status history
- **Lead → Client:** Conversion recorded with foreign keys and history
- **Invoice ↔ Payment:** One-to-many; payments store invoice reference and amounts
- **SupportConversation ↔ SupportMessage:** One-to-many ordered by creation timestamp

## Prisma Conventions
- All models include `id`, `createdAt`, `updatedAt`
- Enum definitions handle status fields (e.g., `ApplicationStatus`, `TaskStatus`, `LeadStage`)
- `@@index` and `@@unique` directives cover email, phone, and identifier fields
- Soft deletes handled via status flags rather than record removal

## Migrations & Seeding
1. Run migrations: `npx prisma migrate deploy`
2. Generate client: `npx prisma generate`
3. Seed data: `npm run db:seed` (creates default roles, permissions, users, sample records)

Seed script ensures referential integrity, populating:
- Admin, Staff, Client roles
- Permissions across modules (clients, leads, applications, financials, reports, settings)
- Sample client, lead, application, document, and messaging data

## Backup & Maintenance
- SQLite file located at `prisma/db/custom.db`
- Backup: `cp prisma/db/custom.db prisma/db/custom.db.backup.$(date +%Y%m%d_%H%M%S)` (or rely on deploy script which backs up `.env`, `prisma/db`, `uploads`, `logs`)
- Restore: stop app, replace `prisma/db/custom.db` with backup, restart
- Monitor migration lock file (`prisma/migrations/migration_lock.toml`) in CI/CD

## Normalization Notes
- Recent migration introduces `normalizedPhone` on leads to support deduplication
- Addresses stored as JSON fields for flexibility
- File metadata includes both original name and internal storage path for auditing

---
**Last Updated:** 17 November 2025

