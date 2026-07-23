# WhatsApp Sharing Setup (November 2025)

## 1. Configure Base URL
Set `WHATSAPP_DOCUMENT_BASE_URL` in `.env` to a publicly accessible domain or IP serving the app.
```env
WHATSAPP_DOCUMENT_BASE_URL=https://example.com
```
If unset, system falls back to `NEXT_PUBLIC_APP_URL` but may not be reachable externally.

## 2. Asset Preparation
- Ensure documents required for outreach live in `public/tk-media/`.
- Confirm file names are descriptive and optimized for sharing.

## 3. Internal Workflow
1. Staff generates document or retrieves existing asset.
2. Use in-app WhatsApp button or copy link manually.
3. Paste link into WhatsApp Business message template.
4. Verify recipient can access file via mobile.

## 4. Testing Endpoint
```bash
curl http://localhost:3007/api/whatsapp/test-staff
```
Response `OK` indicates configuration valid; warnings highlight missing base URL.

## 5. Future Automation
- Evaluate WhatsApp Cloud API for automated triggers when volume increases.
- Capture requirements (templates, languages, consent) before integration.

---
**Owner:** Operations — Updated 10 November 2025

