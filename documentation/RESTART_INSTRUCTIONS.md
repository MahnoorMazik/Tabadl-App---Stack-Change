# Restart Instructions (November 2025)

## Docker Deployment
```bash
cd /opt/tabadl-alkon-crm/Tabadl-Alkon-CRM-Deployment
sudo docker compose restart
```

If configuration changed:
```bash
sudo docker compose down
sudo docker compose up -d --build
```

For code updates, prefer uploading the latest deployment zip and running:
```bash
chmod +x scripts/redeploy.sh
./scripts/redeploy.sh
```
(backs up `.env`, `prisma/db`, `uploads`, `logs`, then rebuilds and runs Prisma migrations automatically.)

## Upload Permissions Reminder
Before restarting on a new host, ensure:
```bash
sudo chown -R 1001:1001 uploads
sudo chmod -R 755 uploads
```

## Verify After Restart
- `curl http://localhost:3007/api/health`
- Login as admin to confirm dashboards load
- `docker compose logs --tail=100` for warnings

## Development Environment
```bash
npm run dev:win        # Windows
npm run dev             # macOS/Linux
```
Hot reload handles most changes; restart only after dependency updates or env adjustments.

---
**Updated:** 17 November 2025

