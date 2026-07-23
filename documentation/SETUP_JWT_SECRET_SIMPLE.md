# Quick JWT Secret Setup

1. Generate secret:
   ```bash
   openssl rand -base64 32
   ```
   *(Alternatively run `./setup-env.sh`, which auto-generates a secure secret in `.env`.)*
2. Add to `.env`:
   ```env
   JWT_SECRET=<paste-value>
   JWT_EXPIRES_IN=7d
   ```
3. Restart service:
   ```bash
   docker compose restart tabadl-alkon-crm
   ```
4. Confirm login works and no warnings appear in logs.

> For detailed guidance, see `SETUP_JWT_SECRET.md`.

**Updated:** 17 November 2025

