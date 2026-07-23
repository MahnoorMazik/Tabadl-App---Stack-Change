# Rebuild Fix Checklist (November 2025)

Use this checklist when builds fail or when `next build` output diverges between environments.

## 1. Clean Install
```bash
rm -rf node_modules .next
npm install
npm run lint
npm run build
```

## 2. Dependency Alignment
- Confirm Node.js version matches project (Node 20).
- Ensure `package-lock.json` committed; avoid mixing npm/yarn/pnpm.
- For Docker, rebuild image: `docker compose build --no-cache`.

## 3. Prisma & Database
```bash
npx prisma generate
npx prisma migrate deploy
```

## 4. Environment Variables
- Check `.env` for missing values (JWT secret, API URLs, SMTP).
- Remove stale overrides that differ between environments.

## 5. Image Optimization
- Delete `public/.next` artifacts if copying from previous builds.
- Verify Sharp optional dependencies installed inside Docker (Next.js handles automatically in current image).

## 6. Troubleshooting Tips
- Run `next build --debug` for verbose logs.
- For Windows-specific issues, use `npm run dev:win` to confirm dev builds.
- Inspect `eslint.config.mjs` for failing rules; run `npm run lint` prior to build.

## 7. After Fix
- Recreate deployment archive: `powershell -ExecutionPolicy Bypass -File create-deployment-zip.ps1`.
- Update QA and documentation if build change impacts features.

---
**Maintainer:** Engineering Team (Last updated 10 November 2025)

