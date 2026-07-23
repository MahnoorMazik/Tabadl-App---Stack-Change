# Container Diagnostics (November 2025)

## Common Checks
| Purpose | Command |
| --- | --- |
| List containers | `docker compose ps` |
| Tail logs | `docker compose logs -f tabadl-alkon-crm` |
| Check health endpoint | `curl http://localhost:3007/api/health` |
| Inspect container shell | `docker compose exec tabadl-alkon-crm sh` |
| View resource usage | `docker stats` |
| Restart service | `docker compose restart tabadl-alkon-crm` |

## Upload Permissions Error
- **Symptom:** Startup logs show `Uploads directory is not writable! (required uid=1001 gid=1001)`.
- **Fix:**
  ```bash
  sudo mkdir -p uploads/applications uploads/leads
  sudo chown -R 1001:1001 uploads
  sudo chmod -R 755 uploads
  docker compose restart
  ```
- Alternative: run `./init-uploads.sh` before `docker compose up`.

## Database Inspection
SQLite file is at `prisma/db/custom.db` (bind-mounted). To list tables locally: `sqlite3 prisma/db/custom.db '.tables'` (if sqlite3 is installed).

## Prisma Diagnostics
```bash
# List migrations
npx prisma migrate status

# Inspect Prisma client
npx prisma studio
```

## Log Patterns to Monitor
- `WARN uploads not writable` → fix permissions as above.
- `JWT secret not configured` → set `JWT_SECRET` in `.env`.
- `Socket connection failed` → verify reverse proxy upgrade headers (if behind Nginx).

## Cleanup
```bash
docker compose down --volumes --remove-orphans
rm -rf node_modules  # prisma/db/custom.db is preserved
npm install
```

## Support Checklist
1. Reproduce issue locally using deployment ZIP if production only.
2. Capture logs (`docker compose logs --tail=200`).
3. Note environment variables and host OS.
4. Provide steps to QA for confirmation.

---
**Last Updated:** 17 November 2025

