# Simple Deployment Guide (November 2025)

## TL;DR
1. Extract package
   ```bash
   unzip tk-deployment.zip
   cd Tabadl-Alkon-CRM-Deployment
   ```
2. Configure environment
   ```bash
   ./setup-env.sh           # auto-generates .env with secure JWT + app version
   # or: cp env.production.example .env && nano .env
   # set DATABASE_URL=file:./db/custom.db, JWT_SECRET, NEXT_PUBLIC_* URLs, SMTP, WhatsApp URL
   ```
3. Fix uploads permissions
   ```bash
   chmod +x init-uploads.sh
   sudo ./init-uploads.sh
   ```
4. Start / update app
   ```bash
   sudo docker compose up -d --build
   sudo docker compose logs -f
   ```
   For future updates: upload the new zip, then `chmod +x scripts/redeploy.sh && ./scripts/redeploy.sh`
5. Verify health
   ```bash
   curl http://localhost:3007/api/health
   ```
6. Login and change default passwords.

Need more detail? See `DEPLOYMENT.md` and `CONTAINER_DIAGNOSTICS.md`.

---
**Last Updated:** 17 November 2025

