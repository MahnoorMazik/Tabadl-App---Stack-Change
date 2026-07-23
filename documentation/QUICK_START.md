# Quick Start Guide

Get your Tabadl Alkon CRM up and running quickly!

## 🚀 Clean start (minimal commands)

For a **clean start and test** without Docker, run in order:

```bash
pnpm install
pnpm db:push
pnpm db:seed
pnpm run dev
```

Then open **http://localhost:3000** and log in as **admin@tk.sa** / **admin123**.

**.env required:** Copy `env.production.example` → `.env` and set `NEXTAUTH_SECRET`, `JWT_SECRET`, and app URLs. Or use **`./setup-local.sh`** (or `pnpm run setup:local`) to create `.env`, generate secrets, set up dirs, db, and seed in one go—see `documentation/CLEAN_START.md`.

---

## 🚀 Full setup (5 minutes)

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Generate Secrets
```bash
# Windows
pnpm run setup:secrets

# Linux/Mac
pnpm run setup:secrets:bash
```

Copy the generated secrets to your `.env` file (create from `env.production.example`).

### 3. Create PWA Icons
```bash
pnpm run setup:icons
```

This creates placeholder icons. Replace them with properly sized icons for production.

### 4. Set Up Database
```bash
pnpm run db:generate
pnpm run db:push
pnpm run db:seed
```

### 5. Start Development Server
```bash
pnpm run dev
```

Visit `http://localhost:3000` (or the port in your `.env`) 🎉

## 📋 Environment Variables Checklist

Make sure your `.env` file has:

- ✅ `NEXTAUTH_SECRET` - Generated secret (32+ chars)
- ✅ `NEXTAUTH_URL` - Your app URL
- ✅ `NEXT_PUBLIC_VAPID_PUBLIC_KEY` - From `pnpm run setup:vapid`
- ✅ `VAPID_PRIVATE_KEY` - From `pnpm run setup:vapid`
- ✅ `JWT_SECRET` - Generated secret (40+ chars)
- ✅ `DATABASE_URL` - SQLite: `file:./db/custom.db` (relative to prisma/)

## 🔧 Common Commands

```bash
# Development
pnpm run dev              # Start dev server (nodemon + custom server)
pnpm build                # Build for production
pnpm start                # Start production server

# Database
pnpm db:push              # Sync schema to database
pnpm db:generate          # Generate Prisma Client
pnpm db:seed              # Seed initial data
pnpm db:studio            # Open Prisma Studio

# Setup
pnpm run setup:local      # Full local setup (env, dirs, db, seed) — no Docker
pnpm setup:icons          # Create placeholder PWA icons
pnpm setup:vapid          # Generate VAPID keys
```

## 🐳 Docker Deployment

```bash
# Build
docker build -t tabadl-alkon-crm .

# Run
docker-compose up -d
```

## 📱 Testing PWA Features

1. **Install PWA**: Open in Chrome/Edge → Click install icon
2. **Test Offline**: Disconnect internet → Visit `/offline`
3. **Push Notifications**: Requires HTTPS in production

## ⚠️ Production Checklist

Before deploying to production:

- [ ] Generate new secrets (don't use development secrets)
- [ ] Set up HTTPS (required for PWA and push notifications)
- [ ] Replace placeholder PWA icons with proper ones
- [ ] Configure email settings (SMTP)
- [ ] Set up database backups
- [ ] Configure proper CORS origins
- [ ] Set up monitoring/logging
- [ ] Test all user roles (Admin, Staff, Client)

## 📚 More Information

- Full setup guide: See `SETUP.md`
- Framework upgrade details: See upgrade plan document
- NextAuth.js docs: https://next-auth.js.org/
- PWA docs: https://github.com/DuCanhGH/next-pwa

## 🆘 Troubleshooting

**Build fails?**
- Run `pnpm install` again
- Clear `.next` folder: `rm -rf .next` (Linux/Mac) or `Remove-Item -Recurse -Force .next` (Windows)

**Database errors?**
- Run `pnpm db:push` to sync schema
- Check `DATABASE_URL` in `.env` (e.g. `file:./db/custom.db`)

**PWA not working?**
- Ensure HTTPS is enabled (required)
- Check browser console for errors
- Verify `manifest.json` is accessible

**Authentication issues?**
- Verify `NEXTAUTH_SECRET` is set
- Check `NEXTAUTH_URL` matches your domain
- Ensure NextAuth tables exist in database
