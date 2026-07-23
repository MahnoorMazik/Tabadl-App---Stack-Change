# Detailed JWT Secret Setup (November 2025)

## Step 1: Generate Secret
Use OpenSSL to generate a high-entropy secret:
```bash
openssl rand -base64 64
```
Or run `./setup-env.sh`, which automatically injects a secure JWT secret (and synced SemVer) into `.env`.

## Step 2: Apply to Environment
Edit `.env` (or host env vars) and set:
```env
JWT_SECRET=<generated-secret>
JWT_EXPIRES_IN=7d
```
Adjust expiration if business requirements differ.

## Step 3: Propagate to Deployment
- For Docker Compose deployments, ensure `.env` sits alongside `docker-compose.yml`.
- For managed hosting, add environment variable via provider dashboard.

## Step 4: Restart Service
```bash
docker compose restart tabadl-alkon-crm
```

## Step 5: Validate
- Login and confirm tokens issue as expected.
- Call `/api/auth/me` to verify response.
- Monitor logs for absence of `JWT secret not configured` warnings.

## Rotation Strategy
- Schedule quarterly or incident-driven secret rotation.
- Notify users if forced logout will occur.
- Maintain old secret briefly if supporting overlapping sessions is required (not currently implemented; tokens will become invalid).

## Best Practices
- Store secrets securely (password manager, secrets vault).
- Never commit real secrets to version control.
- Update `env.production.example` only with placeholder text.

---
**Maintainer:** DevOps — Updated 17 November 2025

