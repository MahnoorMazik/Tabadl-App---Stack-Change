# Deployment Quick Guide

## 🆕 First-Time Deployment

**When:** Installing the app on a new server for the first time.

**Steps:**
```bash
# 1. Upload and extract the deployment ZIP
unzip tk-deployment.zip
cd Tabadl-Alkon-CRM-Deployment

# 2. Run the automated deployment script
chmod +x deploy.sh
./deploy.sh
```

**What `deploy.sh` does automatically:**
- ✅ Creates `.env` file (prompts for server IP/domain)
- ✅ Sets up uploads directory with correct permissions
- ✅ Creates required directories (prisma/db, uploads, logs)
- ✅ Builds Docker images
- ✅ Starts containers
- ✅ Verifies health status

**After deployment:**
- Login at `http://YOUR_SERVER_IP:3007`
- Change default passwords immediately
- Check logs: `docker compose logs -f`

---

## 🔄 Redeployment / Updating App

**When:** Updating to a new version of the app on an existing server.

**Simple Steps:**
```bash
# 1. Upload new ZIP to your server (same directory as current deployment)

# 2. Run redeploy script
chmod +x redeploy.sh
./redeploy.sh
```

**That's it!** The script handles everything automatically.

**What `redeploy.sh` does automatically:**
- ✅ Creates backup of persistent data (.env, database, uploads, logs)
- ✅ Stops running containers
- ✅ Extracts new ZIP file
- ✅ Updates source code and configuration files
- ✅ Preserves your database and uploads
- ✅ Rebuilds and starts containers
- ✅ Verifies health status

**Important:** Your existing data is preserved:
- ✅ Database (`prisma/db/custom.db`) - **NOT overwritten**
- ✅ Uploads (`uploads/`) - **NOT overwritten**
- ✅ Environment variables (`.env`) - **NOT overwritten**
- ✅ Logs - **NOT overwritten**

Backups are saved to `backups/` directory with timestamp.

---

## 📋 Quick Reference

| Scenario | Script to Use | What It Does |
|----------|---------------|--------------|
| **First Time** | `./deploy.sh` | Full setup from scratch |
| **Update** | `./redeploy.sh` | Updates app, preserves data |

---

## 🆘 Troubleshooting

**If deployment fails:**
```bash
# Check logs
docker compose logs -f

# Restart containers
docker compose restart

# Rebuild from scratch (first-time only)
docker compose down
./deploy.sh
```

**If uploads permissions fail:**
```bash
sudo chown -R 1001:1001 uploads
sudo chmod -R 755 uploads
```

**If you need to restore from backup:**
```bash
# Find your backup
ls -lh backups/

# Restore (example)
tar -xzf backups/persistent-20250120-120000.tar.gz -C .
```

---

## 📝 Notes

- **First deployment:** Use `deploy.sh` - it handles everything
- **Updates:** Use `redeploy.sh` - it preserves your data
- **Backups:** Automatically created during redeployment
- **Database:** Always preserved during updates
- **Environment:** Your `.env` file is never overwritten during redeployment

