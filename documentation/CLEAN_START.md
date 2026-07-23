# Clean Start & Local Test

Minimal steps to run the project from a clean state **without Docker**.

---

## Command sequence (quick reference)

Run these in order from the project root:

```bash
pnpm install
pnpm db:push
pnpm db:seed
pnpm run dev
```

Then open **http://localhost:3000** and log in as **admin@tk.sa** / **admin123**.

---

## One-shot setup (like `deploy.sh`, no Docker)

Use **`setup-local.sh`** to do env, dirs, db, and seed in one go:

```bash
chmod +x setup-local.sh
./setup-local.sh
```

This script:

- Creates `.env` from `env.production.example` (if missing) and generates `NEXTAUTH_SECRET` / `JWT_SECRET`
- Sets app URLs to `http://localhost:3000` (override with `APP_URL`)
- Creates `prisma/db`, `uploads/applications`, `uploads/leads`, `logs`
- Runs `pnpm install` → `prisma generate` → `prisma db push` → `prisma db seed`
- Starts the dev server (`pnpm run dev`) unless `START_DEV=0`

**Clean start (reset DB first):**

```bash
RESET_DB=1 ./setup-local.sh
```

**Setup only (no dev server):**

```bash
START_DEV=0 ./setup-local.sh
pnpm run dev
```

**Custom URL (e.g. port 3007):**

```bash
APP_URL=http://localhost:3007 ./setup-local.sh
```

---

## Manual steps (if not using `setup-local.sh`)

1. **Install**

   ```bash
   pnpm install
   ```

2. **Environment**

   - Copy `env.production.example` → `.env`
   - Generate secrets: `pnpm run setup:secrets:bash` (or `setup:secrets` on Windows), then put them into `.env`
   - For local dev, set e.g. `AUTH_URL`, `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL` to `http://localhost:3000` (or your chosen port)

3. **Database**

   ```bash
   pnpm db:generate
   pnpm db:push
   pnpm db:seed
   ```

4. **Run**

   ```bash
   pnpm run dev
   ```

---

## Useful commands

| Command | Purpose |
|--------|---------|
| `pnpm run dev` | Start dev server (custom server + Next.js) |
| `pnpm db:push` | Sync Prisma schema to DB (no migrations) |
| `pnpm db:seed` | Seed admin user, roles, lead statuses |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm db:generate` | Regenerate Prisma Client |
| `pnpm run build` | Production build |
| `pnpm start` | Run production server |

---

## Default admin

After seeding:

- **Email:** `admin@tk.sa`
- **Password:** `admin123`

---

## Troubleshooting

- **DB errors:** Ensure `DATABASE_URL` in `.env` points to `file:./db/custom.db` (relative to prisma/). Run `pnpm exec prisma migrate deploy` and `pnpm exec tsx prisma/seed.ts` again.
- **Auth errors:** Check `NEXTAUTH_SECRET` / `AUTH_SECRET` and that `AUTH_URL` / `NEXTAUTH_URL` match the URL you use in the browser.
- **Port in use:** Set `PORT` in `.env` or use `APP_URL=http://localhost:3007 ./setup-local.sh` and ensure nothing else uses that port.
