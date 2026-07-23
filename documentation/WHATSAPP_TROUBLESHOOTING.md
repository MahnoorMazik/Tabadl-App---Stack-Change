# WhatsApp Troubleshooting (November 2025)

## Common Issues

### 1. Broken Document Links
- **Cause:** `WHATSAPP_DOCUMENT_BASE_URL` not set or unreachable.
- **Fix:** Update `.env` with publicly accessible URL, redeploy, re-run `/api/whatsapp/test-staff`.

### 2. File Not Loading on Mobile
- **Cause:** Asset missing in `public/tk-media/` or case-sensitive path mismatch.
- **Fix:** Confirm file exists, matches URL exactly, rebuild next assets if needed.

### 3. Expired or Cached Links
- **Cause:** Browser caching or stale share preview.
- **Fix:** Append cache-busting query (e.g., `?v=20251110`) or re-upload asset.

### 4. WhatsApp Blocks Link
- **Cause:** URL flagged as suspicious.
- **Fix:** Use HTTPS with valid SSL, avoid URL shorteners, ensure domain reputation.

### 5. Desire for Automation
- **Note:** Current solution is manual; evaluate WhatsApp Cloud API for automated sends.

## Diagnostic Checklist
1. Run `curl /api/whatsapp/test-staff` for status.
2. Open link in incognito browser; verify accessible without login.
3. Check server logs for 404/500 when serving media.
4. Validate DNS/SSL if using custom domain.

## Support Escalation
- Capture link, timestamp, and recipient device info.
- Provide screenshot/video of failure.
- Log issue in ticketing system with severity.

---
**Maintainer:** Support Team — Updated 10 November 2025

