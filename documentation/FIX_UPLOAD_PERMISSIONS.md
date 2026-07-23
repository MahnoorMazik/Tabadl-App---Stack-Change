# Upload Permissions Fix (November 2025)

## Problem
When running inside Docker, the Next.js app executes as user `nextjs` (uid 1001, gid 1001). If the host-mounted `uploads/` directory is owned by root, file writes fail and startup aborts with an error.

## Permanent Fix
```bash
sudo mkdir -p uploads/applications uploads/leads
sudo chown -R 1001:1001 uploads
sudo chmod -R 755 uploads
```

## Helper Script
Run once before starting containers:
```bash
chmod +x init-uploads.sh
sudo ./init-uploads.sh
```
The script attempts sudo first, then falls back to current user, and reports final owner via `stat`.

## Verification
```bash
docker compose exec tabadl-alkon-crm test -w /app/uploads && echo "Writable" || echo "NOT writable"
```

## Post-Deployment Checklist
- Re-run after cloning to new server or restoring from backup.
- Include in CI/CD provisioning scripts to avoid manual intervention.

---
**Last Updated:** 10 November 2025

