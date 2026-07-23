# Docker Issues Report (November 2025)

## Common Issues & Fixes

### 1. Uploads Directory Not Writable
- **Symptom:** Container logs `Uploads directory is not writable!` and service aborts.
- **Cause:** Host `uploads/` folder owned by root.
- **Fix:**
  ```bash
  sudo mkdir -p uploads/applications uploads/leads
  sudo chown -R 1001:1001 uploads
  sudo chmod -R 755 uploads
  docker compose restart
  ```
  or run `sudo ./init-uploads.sh` before `docker compose up`.

### 2. JWT Secret Missing
- **Symptom:** Logs warn `JWT secret not configured`, login fails.
- **Fix:** Set `JWT_SECRET` in `.env` (see `DEPLOYMENT_JWT_SECRET_GUIDE.md`).

### 3. Prisma Migration Errors
- **Symptom:** Startup logs show migration lock or schema mismatch.
- **Fix:**
  ```bash
  docker compose exec tabadl-alkon-crm npx prisma migrate deploy
  docker compose exec tabadl-alkon-crm npx prisma db pull
  ```
  Ensure `prisma/migrations/migration_lock.toml` not checked in with stale state.

### 4. Container Won’t Build
- **Symptoms:** Build fails on `npm install` or `next build`.
- **Fix:**
  - Confirm Node.js version in Dockerfile matches lockfile (currently Node 20).
  - Clear `node_modules` and reinstall locally if building outside Docker.
  - Update npm to latest minor if install scripts fail.

### 5. Socket.IO Disconnects Behind Nginx
- **Cause:** Missing upgrade headers in reverse proxy configuration.
- **Fix:** Ensure Nginx location includes:
  ```nginx
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  ```

### 6. Disk Usage Growth
- **Symptoms:** Host disk full due to log accumulation.
- **Fix:** Rotate container logs (`docker system prune` cautiously) and archive `logs/` directory periodically.

## Reporting
When logging Docker-related issues, capture:
- Host OS and kernel version
- Docker & Compose versions (`docker --version`, `docker compose version`)
- Full log snippet (`docker compose logs --tail=200`)
- Recent configuration changes or deployments

---
**Last Updated:** 10 November 2025

