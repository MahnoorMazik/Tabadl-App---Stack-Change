# Authentication & RBAC (November 2025)

## Authentication Flow
1. User submits credentials to `/api/auth/login` (or registers via `/api/auth/register` for clients).
2. Credentials validated against Prisma user store (passwords hashed with bcryptjs).
3. JWT issued with role claims and stored in httpOnly cookie; token includes expiration defined by `JWT_EXPIRES_IN`.
4. Protected routes/middleware verify JWT, fetch user context, and attach permissions.
5. `/api/auth/me` endpoint (and `useAuth` hook) expose profile, roles, and allowed actions to the UI.
6. Logout clears session cookie via `/api/auth/logout`.

Rate limiting guards login/register endpoints, throttling repeated failures.

## Roles & Permissions
Default roles seeded during `npm run db:seed`:
- **Admin:** Full system access, including role/permission management.
- **Staff:** Case manager baseline with operations access (applications, clients, documents, tasks).
- **Client:** Limited to self-service portal (applications, documents, messages, profile).

Roles can be customized via `/admin/roles` UI or `/api/roles` endpoints, allowing combination of permissions listed below.

### Permission Modules
`clients`, `leads`, `applications`, `documents`, `team`, `financial`, `messages`, `reports`, `settings`, `help`, `tasks`, `invoices`, `payments`, `expenses`, `analytics`, `users`, `roles`, `notifications`

### Permission Actions
`view`, `create`, `update`, `delete`, `approve`, `assign`, `export`, `import`, `manage`

Permissions are stored in `Permission` and associated via `RolePermission`. UI helpers (`PermissionAwareSidebar`, `useHasPermission`) gate access to navigation items and components.

## Session Security
- Tokens signed with `JWT_SECRET` (configure in `.env` using secure random value).
- CORS restrictions configured in `lib/cors.ts`.
- CSRF mitigated via httpOnly cookies and same-site policies.
- Audit logging captures key auth events.

## Password Reset (Manual)
Currently handled via administrative workflow:
1. Admin updates password through `/admin/clients` or `/admin/team` editing screens.
2. Clients receive temporary password and are prompted to change it on next login.
3. Future roadmap includes self-service password reset (tracked in backlog).

## Multi-Portal Guarding
- Admin/staff portal routes require `staff` or `admin` role membership.
- Client portal routes require `client` role and ownership of resources.
- Universal dashboard determines destination based on highest-permission role.

## Tips for New Roles
1. Clone an existing role to preserve baseline permissions.
2. Grant only `view` permissions initially; add mutating capabilities (`create`, `update`, `delete`) deliberately.
3. For auditors, enable `view` + `export` on analytics and financial modules while leaving mutating permissions disabled.

---
**Last Updated:** 10 November 2025

