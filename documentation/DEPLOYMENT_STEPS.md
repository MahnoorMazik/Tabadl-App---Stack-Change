# Quick Deployment Steps (November 2025)

> **Quick Reference:** See `DEPLOYMENT_QUICK_GUIDE.md` for a simple comparison of first-time vs. update deployments.

## 🆕 First-Time Deployment

**Use this when:** Installing on a new server for the first time.

## Quick Method (Recommended)
```bash
# 1. Extract package
unzip tk-deployment.zip
cd Tabadl-Alkon-CRM-Deployment

# 2. Run automated deployment script
chmod +x deploy.sh
./deploy.sh
```
The `deploy.sh` script automatically:
- Creates `.env` file (using `setup-env.sh` if available)
- Sets up uploads directory with correct permissions
- Builds and starts containers
- Verifies health status

## Manual Method (Alternative)
If you prefer step-by-step control:

### 1. Extract Package
```bash
unzip tk-deployment.zip
cd Tabadl-Alkon-CRM-Deployment
```

### 2. Configure Environment
```bash
./setup-env.sh              # preferred; auto-adds JWT + app version
# or:
cp env.production.example .env && nano .env
```
Ensure:
- `DATABASE_URL=file:./prisma/db/custom.db` or `file:./db/custom.db` (relative to prisma/)
- `JWT_SECRET` (generate with `openssl rand -base64 32`)
- `NEXT_PUBLIC_*` URLs
- `NEXT_PUBLIC_APP_VERSION` (mirrors package.json; drives admin sidebar badge)
- `WHATSAPP_DOCUMENT_BASE_URL`
- SMTP credentials (if email sending required)

### 3. Prepare Uploads Directory
```bash
chmod +x init-uploads.sh
sudo ./init-uploads.sh
```
(Ensures `uploads/` owned by uid/gid 1001 and permissions set to 755.)

### 4. Start Containers
```bash
sudo docker compose up -d --build
sudo docker compose logs -f
```

### 5. Verify
```bash
curl http://localhost:3007/api/health
```
Login via `http://SERVER_IP:3007` and change default passwords.

## 6. (Optional) Configure Nginx + SSL
Refer to `documentation/DEPLOYMENT.md` for sample config and Certbot steps.

## 7. Maintenance Basics
```bash
sudo docker compose restart
sudo docker compose down
sudo docker compose up -d --build
```
## 🔄 Redeployment / Updating App

**Use this when:** Updating to a new version on an existing server.

```bash
# 1. Upload new deployment ZIP to server
# 2. Run redeployment script
chmod +x redeploy.sh
./redeploy.sh
```

**What happens:**
- ✅ Automatic backup of persistent data (database, uploads, .env, logs)
- ✅ Stops containers
- ✅ Updates source code from ZIP
- ✅ Preserves your database and uploads (NOT overwritten)
- ✅ Rebuilds and starts containers
- ✅ Verifies health

**Your data is safe:** Database, uploads, and `.env` are preserved during updates.

---

## Maintenance Basics

---
**Need more detail?** See the full deployment guide and container diagnostics in `documentation/`.

