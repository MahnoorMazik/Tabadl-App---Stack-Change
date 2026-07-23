# Deployment Guide (Consolidated – November 2025)

This guide consolidates all deployment tasks for Ubuntu/Docker environments. For quick reference see also `DEPLOYMENT_STEPS.md`.

## Prerequisites
- Ubuntu 20.04+ server (2 CPU, 2+ GB RAM)
- Docker Engine ≥ 20.10, Docker Compose v2
- Open firewall port (default `3007`)
- Domain + Nginx + SSL (optional)

## 1. Server Preparation
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg lsb-release

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Optional: allow current user to run docker without sudo
sudo usermod -aG docker $USER
```

## 2. Directory Setup & Package
Create the deployment package locally with `./create-deployment-zip.sh` (or `create-deployment-zip.ps1` on Windows). This produces **tk-deployment.zip** containing deploy.sh and deployment/.

On the server:
```bash
sudo mkdir -p /opt/tabadl-alkon-crm
sudo chown $USER:$USER /opt/tabadl-alkon-crm
cd /opt/tabadl-alkon-crm

# Upload tk-deployment.zip, then:
unzip tk-deployment.zip
./deploy.sh
```
`deploy.sh` copies `deployment/` to `../main-project`, backs up `.env`, `prisma/db`, `uploads`, `logs` on updates, builds first then restarts containers. SQLite database lives at `main-project/prisma/db/custom.db`.

## 3. Environment Configuration
```bash
./setup-env.sh        # auto-generates .env with secure JWT + version from package.json
# or do it manually:
cp env.production.example .env && nano .env
```
Key variables:
```
DATABASE_URL=file:./db/custom.db
JWT_SECRET=<secure-random-string>
JWT_EXPIRES_IN=7d
NEXT_PUBLIC_API_URL=http://YOUR_SERVER:3007
NEXT_PUBLIC_WS_URL=ws://YOUR_SERVER:3007
NEXT_PUBLIC_APP_URL=http://YOUR_SERVER:3007
NEXT_PUBLIC_APP_VERSION=1.1.2   # keep in sync with package.json so the admin sidebar badge stays accurate
WHATSAPP_DOCUMENT_BASE_URL=https://your-domain.com
PORT=3007
```
Generate secret:
```bash
openssl rand -base64 32
```

## 4. Firewall (UFW)
```bash
sudo ufw allow 22/tcp
sudo ufw allow 3007/tcp
sudo ufw enable
sudo ufw status
```

## 5. Upload Permissions
```bash
sudo mkdir -p uploads/applications uploads/leads
sudo chown -R 1001:1001 uploads
sudo chmod -R 755 uploads
```
Or run:
```bash
chmod +x init-uploads.sh
sudo ./init-uploads.sh
```

## 6. Run Containers
```bash
sudo docker compose up -d --build
sudo docker compose logs -f
```
Health check:
```bash
curl http://localhost:3007/api/health
```
Access via `http://your-server:3007` (or Nginx reverse proxy).

## 7. Optional Nginx Reverse Proxy
1. Create `/etc/nginx/sites-available/tabadl-alkon-crm` with proxy configuration (see template in repository).
2. Enable site, reload Nginx, obtain SSL with Certbot (`sudo certbot --nginx -d your-domain.com`).
3. Ensure WebSocket upgrade headers present for `/socket.io/` location block.

## 8. Seed Data & First Login
- Seed runs automatically on first start; default users documented in `01-project-overview.md`.
- Force reseed by running `npm run db:seed` inside container if needed.

## 9. Maintenance
| Task | Command / Notes |
| --- | --- |
| Restart | `sudo docker compose restart` |
| Stop | `sudo docker compose down` |
| Logs | `sudo docker compose logs -f tabadl-alkon-crm` |
| Prisma migrate | `docker compose exec tabadl-alkon-crm npx prisma migrate deploy` |
| Backups | `cp prisma/db/custom.db prisma/db/custom.db.backup.$(date +%Y%m%d_%H%M%S)` (redeploy backs up `.env`, `prisma/db`, `uploads`, `logs`) |
| Redeploy | Upload latest zip → `chmod +x scripts/redeploy.sh && ./scripts/redeploy.sh` (backs up `.env`, uploads, logs; syncs source; rebuilds containers; applies migrations; polls `/api/health`) |

## 10. Troubleshooting
- Check container logs for upload permission warnings.
- Verify `.env` loaded correctly (`docker compose config`).
- Ensure domain DNS points to server when using Nginx + SSL.
- Review `CONTAINER_DIAGNOSTICS.md` for deeper debugging steps.

## 11. Post-Deployment Checklist
- Login as admin, update default passwords.
- Configure SMTP settings under `/admin/settings/email` and send test email.
- Set `WHATSAPP_DOCUMENT_BASE_URL` and verify `/api/whatsapp/test-staff`.
- Confirm the admin sidebar shows the expected SemVer (v1.1.2 at time of writing). If not, regenerate `.env` with `setup-env.sh` or update `NEXT_PUBLIC_APP_VERSION` manually, then redeploy.
- Regenerate deployment ZIP after any code or documentation change using `./create-deployment-zip.sh` or `create-deployment-zip.ps1` (output: deploy.sh + deployment/). Upload to the server, unzip, and run `./deploy.sh` (or use `scripts/redeploy.sh` if you use that workflow).

---
**Last Updated:** 17 November 2025
