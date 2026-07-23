# Pages & Navigation (November 2025)

This catalog outlines every major route in the Tabadl Alkon CRM App Router. All private routes enforce authentication and RBAC. File paths reference `src/app/**`.

## Public Experience
- `/` → `page.tsx` — Primary marketing site (hero, services, testimonials, contact form)
- `/home-new` → `home-new/page.tsx` — Alternate marketing variant with media-rich hero
- `/about-us`, `/contact` — Company overview and inquiry form
- `/login`, `/signup` — Client authentication entry points
- `/privacy-policy`, `/terms-of-service`, `/cookie-policy` — Legal disclosures
- `not-found.tsx` — Global 404 handling

## Staff / Admin Portal (`/admin` namespace)
| Module | Routes |
| --- | --- |
| Access | `/admin/login`
| Dashboards | `/admin/dashboard`
| Applications | `/admin/applications`, `/admin/applications/pending`, `/approved`, `/rejected`, `/tasks`, `/page-new`
| Clients | `/admin/clients`, `/new`, `/categories`, `/groups`, `/import`
| Leads | `/admin/leads`, `/import`
| Documents | `/admin/documents`, `/upload`, `/templates`, `/archived`, `/documents/leads`
| Finance | `/admin/financial/revenue`, `/invoices`, `/payments`, `/expenses`
| Team | `/admin/team`, `/performance`, `/roles`
| Messaging | `/admin/messages/inbox`, `/sent`, `/support`, `/templates`
| Reports | `/admin/reports/clients`, `/applications`, `/financial`, `/performance`
| Notifications | `/admin/notifications`
| Roles & Permissions | `/admin/roles`
| Settings | `/admin/settings`, `/general`, `/email`, `/system`, `/backup`
| Help | `/admin/help`, `/faq`, `/docs`, `/contact`
| Support Chat | `/admin/support-chat`
| Profile | `/admin/profile`

## Client Portal (`/client` namespace)
- `/client/applications`, `/pending`, `/approved`, `/rejected`, `/tasks`
- `/client/documents`, `/pending`, `/approved`, `/upload`
- `/client/timeline`
- `/client/messages`
- `/client/notifications`
- `/client/help`, `/faq`, `/support`
- `/client/profile`
- `/client/settings/general`

## Shared Dashboards
- `/dashboard` — Universal dashboard route (role-aware)
- `/universal-dashboard` — Router for selecting dashboard based on permissions
- `/staff/dashboard` — Focused view for staff roles

## Supporting Files
- `layout.tsx` — Root providers, theming, and metadata
- `_document-fixer.tsx`, `_hydration-error-suppressor.tsx` — Render safeguards
- `globals.css` — Tailwind base styles

## Access Control
- Middleware ensures JWT presence and role verification before rendering protected segments.
- Sidebars (`PermissionAwareSidebar`, `ClientSidebar`) dynamically show routes based on the current user’s permissions.

---
**Last Updated:** 10 November 2025

