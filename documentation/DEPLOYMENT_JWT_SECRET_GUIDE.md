# JWT Secret Setup Guide (November 2025)

## Why It Matters
The JWT secret signs authentication tokens. Using a weak or shared value exposes the platform to session hijacking. Always configure a unique, high-entropy secret per environment.

## Steps
1. **Generate Secret**
   ```bash
   openssl rand -base64 48
   ```
   > You can also run `./setup-env.sh`, which automatically injects a secure JWT secret (and app version) into `.env`.
2. **Set in `.env`**
   ```env
   JWT_SECRET=<paste-generated-string>
   JWT_EXPIRES_IN=7d   # adjust if needed
   ```
3. **Apply to Deployment**
   - For Docker compose: ensure `.env` is mounted/available before `docker compose up`.
   - For managed hosting: add environment variable via provider console.
4. **Restart Services**
   ```bash
   docker compose restart tabadl-alkon-crm
   ```

## Rotation Checklist
- Generate new secret and update `.env`.
- Invalidate active sessions by redeploying or clearing session store (JWT TTL will naturally expire old tokens).
- Communicate to staff/clients if manual re-login required.

## Validation
- After restart, access `/api/auth/me` to ensure token still valid.
- Review logs for `JWT secret not configured` warnings—none should appear.

## Additional Tips
- Store secrets in password managers or vaults (e.g., 1Password, AWS Secrets Manager).
- Avoid committing `.env` files to version control; use templates (`env.production.example`).

---
**Last Updated:** 17 November 2025

