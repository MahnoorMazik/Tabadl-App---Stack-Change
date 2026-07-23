# Simple Redeployment Steps

## 🔄 Update/Redeploy App

**When:** You have a new version ZIP file and want to update your existing app.

### Steps:

1. **Upload the new ZIP file to your server**
   ```bash
   # Place it in your project directory (same location as current deployment)
   # Example: ~/tk.sa/tk-deployment.zip
   ```

2. **Run the redeploy script**
   ```bash
   cd ~/tk.sa  # or wherever your project is
   chmod +x redeploy.sh
   ./redeploy.sh
   ```

3. **Done!** The script automatically:
   - ✅ Backs up your data (database, uploads, .env, logs)
   - ✅ Stops containers
   - ✅ Updates code from ZIP
   - ✅ Preserves your database and uploads
   - ✅ Rebuilds and starts containers
   - ✅ Verifies everything works

---

## 📋 What Gets Preserved

Your data is **always safe** during redeployment:
- ✅ Database (`prisma/db/custom.db`) - **NOT overwritten**
- ✅ Uploads (`uploads/`) - **NOT overwritten**  
- ✅ Environment (`.env`) - **NOT overwritten**
- ✅ Logs - **NOT overwritten**

Backups are saved to `backups/` folder with timestamp.

---

## 🆘 If Something Goes Wrong

```bash
# Check logs
docker compose logs -f

# Restore from backup (if needed)
ls -lh backups/  # Find your backup
tar -xzf backups/persistent-YYYYMMDD-HHMMSS.tar.gz -C .

# Restart
docker compose restart
```

---

## ⚡ Quick Command Reference

```bash
# Redeploy
./redeploy.sh

# Check status
docker compose ps

# View logs
docker compose logs -f

# Restart if needed
docker compose restart
```

