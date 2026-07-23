# Production Setup Guide

This guide will help you set up the Tabadl Alkon CRM project for production deployment.

## Prerequisites

- Node.js 20+ installed
- pnpm installed globally (`npm install -g pnpm`)
- Docker and Docker Compose (for containerized deployment)

## Step 1: Generate Secrets

### Option A: Using PowerShell Script (Windows)
```powershell
.\scripts\generate-secrets.ps1
```

### Option B: Using Bash Script (Linux/Mac)
```bash
chmod +x scripts/generate-secrets.sh
./scripts/generate-secrets.sh
```

### Option C: Manual Generation

1. **NEXTAUTH_SECRET** (minimum 32 characters):
   ```powershell
   # Windows PowerShell
   -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object {[char]$_})
   ```
   ```bash
   # Linux/Mac
   openssl rand -base64 32
   ```

2. **JWT_SECRET** (minimum 40 characters):
   ```bash
   openssl rand -base64 48
   ```

3. **VAPID Keys** (for push notifications):
   ```bash
   pnpm exec web-push generate-vapid-keys
   ```

## Step 2: Configure Environment Variables

1. Copy `env.production.example` to `.env`:
   ```bash
   cp env.production.example .env
   ```

2. Update `.env` with your generated secrets:
   ```env
   NEXTAUTH_SECRET=your-generated-secret-here
   NEXTAUTH_URL=https://your-domain.com
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
   VAPID_PRIVATE_KEY=your-vapid-private-key
   JWT_SECRET=your-jwt-secret-here
   ```

3. Update application URLs:
   ```env
   NEXT_PUBLIC_APP_URL=https://your-domain.com
   NEXT_PUBLIC_API_URL=https://your-domain.com
   NEXT_PUBLIC_WS_URL=wss://your-domain.com
   ```

## Step 3: Set Up PWA Icons

### Option A: Using Setup Script (Windows)
```powershell
.\scripts\setup-pwa-icons.ps1
```

### Option B: Manual Setup

1. Create a master icon (512x512px PNG, square, centered content)

2. Generate all required sizes:
   - 72x72px
   - 96x96px
   - 128x128px
   - 144x144px
   - 152x152px
   - 192x192px
   - 384x384px
   - 512x512px

3. Recommended tools:
   - [RealFaviconGenerator](https://realfavicongenerator.net/)
   - [PWA Builder Image Generator](https://www.pwabuilder.com/imageGenerator)
   - ImageMagick:
     ```bash
     for size in 72 96 128 144 152 192 384 512; do
       magick convert your-icon.png -resize ${size}x${size} public/icons/icon-${size}x${size}.png
     done
     ```

4. Place all icons in `public/icons/` directory

## Step 4: Install Dependencies

```bash
pnpm install
```

## Step 5: Set Up Database

```bash
# Generate Prisma Client
pnpm exec prisma generate

# Push schema to database
pnpm exec prisma db push

# Seed initial data
pnpm exec prisma db seed
```

## Step 6: Build Application

```bash
pnpm run build
```

## Step 7: Test Locally

```bash
# Development mode
pnpm dev:win

# Production mode
pnpm start
```

Visit `http://localhost:3007` to verify everything works.

## Step 8: Deploy

### Docker Deployment

1. Build Docker image:
   ```bash
   docker build -t tabadl-alkon-crm .
   ```

2. Run with Docker Compose:
   ```bash
   docker-compose up -d
   ```

### Manual Deployment

1. Ensure all environment variables are set
2. Run `pnpm run build`
3. Start the server: `pnpm start`

## Post-Deployment Checklist

- [ ] Verify authentication works (login/logout)
- [ ] Test PWA installation on mobile devices
- [ ] Verify push notifications (requires HTTPS)
- [ ] Check Socket.IO real-time features
- [ ] Verify file uploads work
- [ ] Test email notifications
- [ ] Check database backups are configured
- [ ] Verify SSL/TLS certificates (for HTTPS)
- [ ] Test all user roles (Admin, Staff, Client)

## Troubleshooting

### PWA Not Installing
- Ensure HTTPS is enabled (required for PWA)
- Check that `manifest.json` is accessible
- Verify service worker is registered (`/sw.js`)

### Push Notifications Not Working
- Verify VAPID keys are correctly set
- Ensure HTTPS is enabled (required for push)
- Check browser console for errors
- Verify `/api/push/subscribe` endpoint is accessible

### Authentication Issues
- Verify `NEXTAUTH_SECRET` is set and matches across instances
- Check `NEXTAUTH_URL` matches your domain
- Ensure database has NextAuth tables (Account, Session, VerificationToken)

### Database Issues
- Run `pnpm exec prisma db push` to sync schema
- Check database file permissions
- Verify `DATABASE_URL` is correct

## Security Notes

- **Never commit `.env` file to version control**
- **Use strong, unique secrets in production**
- **Enable HTTPS in production** (required for PWA and push notifications)
- **Regularly update dependencies**: `pnpm update`
- **Set up database backups**
- **Configure rate limiting** (already configured in code)

## Support

For issues or questions, refer to:
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Next.js PWA Documentation](https://github.com/DuCanhGH/next-pwa)
- [Prisma Documentation](https://www.prisma.io/docs)
