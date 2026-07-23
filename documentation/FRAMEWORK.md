# 1ON ERP - Framework & Infrastructure

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5.6 |
| UI | React 19 + Tailwind CSS + shadcn/ui |
| Database | SQLite + Prisma ORM |
| Auth | NextAuth.js v5 (JWT) |
| PWA | @ducanh2912/next-pwa + Web Push |
| Package Manager | pnpm |

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/        # Login page
│   ├── (dashboard)/         # All dashboard pages
│   └── api/                  # REST API routes
├── components/
│   ├── ui/                   # shadcn/ui components
│   └── layout/               # Navigation, header
├── lib/
│   ├── auth/                 # NextAuth config
│   ├── db/                   # Prisma client
│   └── utils/                # Helpers
└── middleware.ts             # Auth + RBAC
prisma/
├── schema.prisma             # Database schema
└── seed.ts                   # Initial data
```

## Key Commands

```bash
pnpm dev          # Development
pnpm build        # Production build
pnpm db:push      # Update database schema
pnpm db:seed      # Seed database
pnpm db:studio    # Database GUI
```

## Deployment

**Docker:**
```bash
docker-compose up -d
```

**PM2:**
```bash
pm2 start ecosystem.config.js --env production
```

## Environment Variables

```env
DATABASE_URL="file:./prisma/db/custom.db"
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="random-32-char-string"
JWT_SECRET="another-random-string"

# PWA Push (optional)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=""
VAPID_PRIVATE_KEY=""
```

## User Roles

`admin` | `store_keeper` | `repair_staff` | `receptionist` | `dealer`

## PWA

- **Manifest:** `public/manifest.json`
- **Service Worker:** Auto-generated in `public/sw.js`
- **Caching:** NetworkFirst strategy, 24h expiry
- **Push Notifications:** Requires VAPID keys in `.env`

## Default Login

**Username:** `admin` | **Password:** `admin123`
