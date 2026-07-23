# Quick Fix: JWT Secret Missing

## Symptom
- Login requests fail.
- Logs show `JWT secret not configured` warning.

## Fix Steps
1. Generate secure secret:
   ```bash
   openssl rand -base64 48
   ```
2. Open `.env` file and set:
   ```env
   JWT_SECRET=<generated-value>
   JWT_EXPIRES_IN=7d
   ```
3. Restart service:
   ```bash
   docker compose restart tabadl-alkon-crm
   ```
4. Confirm via `/api/auth/me` that tokens issue correctly.

## Preventive Measures
- Store secrets in infrastructure vaults.
- Keep `env.production.example` updated with required variables.
- Include secret configuration in deployment checklists.

---
**Verified:** 10 November 2025

