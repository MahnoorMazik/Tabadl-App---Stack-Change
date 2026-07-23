# Tabadl Alkon CRM – Changelog

## v1.1.4 · January 2025
- **Arabic Language Support:** Added comprehensive bilingual support (English/Arabic) for all public pages with RTL layout, language switcher, and persistent preferences
- Enabled "Add Lead" button in Lead Management page (previously hidden)
- Renamed "Import Contacts" to "Import Clients" for consistency across sidebar and pages
- See `documentation/VersionUpdates/1.1.4.md` for detailed changes

## v1.1.3 · 18 Nov 2025
- Testing redeployment

## v1.1.2 · 17 Nov 2025
- Added SemVer badge to the admin sidebar footer (powered by `NEXT_PUBLIC_APP_VERSION`).
- Introduced `scripts/redeploy.sh` to automate backups (`.env`, `prisma/db`, `uploads`, `logs`) and orchestrate rolling updates.
- Database: SQLite (`prisma/db/custom.db`); deployment docs and redeploy workflow updated.
- `setup-env.sh` now injects the current package version into `.env`.

## v1.1.1 · 10 Nov 2025
- Documentation refresh covering deployment, QA, and feature guides.
- Added init scripts for uploads permissions and PowerShell helpers.

## v1.1.0 · 01 Nov 2025
- Stable release with multi-portal experience, RBAC enforcement, messaging, financial suite, and analytics dashboards.

