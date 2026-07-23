# Deployment Package README (November 2025)

Thank you for downloading the Tabadl Alkon CRM deployment bundle. This document provides a quick orientation.

## Contents (after unzipping tk-deployment.zip)
- **deploy.sh** — run this to deploy (copies `deployment/` to main-project, builds, then starts containers; build runs first so existing app keeps running if build fails)
- **deployment/** — app files: `docker-compose.yml`, `Dockerfile`, `docker-entrypoint.sh`, `server.ts`, `prisma/`, `src/`, `public/`, `scripts/`, etc.
- Helper scripts in repo: `init-uploads.sh`, `create-deployment-zip.sh` / `create-deployment-zip.ps1` to regenerate the package

## Quick Start
1. Extract archive: `unzip tk-deployment.zip`
2. Run deploy: `./deploy.sh` (prompts for application URL, creates/updates `.env` in main-project, backs up on update, builds then restarts containers)
3. For updates: upload new `tk-deployment.zip`, run `unzip -o tk-deployment.zip` then `./deploy.sh` (main-project `.env`, uploads, logs are preserved)
4. Monitor logs: `docker compose logs -f` (from main-project directory)

Default users and credentials are documented in `documentation/01-project-overview.md`. Change passwords immediately after first login.

## Useful Docs
- `documentation/DEPLOYMENT.md` – Full deployment guide
- `documentation/CONTAINER_DIAGNOSTICS.md` – Troubleshooting
- `documentation/09-qa-testing-guide.md` – QA procedures
- `documentation/03-api-documentation.md` – REST endpoints

## Support
If you encounter issues:
1. Verify uploads permissions (`sudo chown -R 1001:1001 uploads`).
2. Check `.env` values and restart.
3. Review container logs for guidance.

For further assistance, contact Lyra AI support or consult the full documentation set.

---
**Last Updated:** 17 November 2025

