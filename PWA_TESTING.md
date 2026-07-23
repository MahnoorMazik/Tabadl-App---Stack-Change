# PWA Testing Guide

## How to Enable PWA in Development Mode

To test PWA features in development, set the `ENABLE_PWA_DEV` environment variable:

### Option 1: Create/Update `.env.local` file
```bash
ENABLE_PWA_DEV=true
```

### Option 2: Run with environment variable
```bash
ENABLE_PWA_DEV=true pnpm dev
```

### Option 3: Windows PowerShell
```powershell
$env:ENABLE_PWA_DEV="true"; pnpm dev
```

### Option 4: Linux/Mac
```bash
export ENABLE_PWA_DEV=true && pnpm dev
```

## Where to See the Install Prompt

### Desktop Browsers:

1. **Chrome/Edge:**
   - Look for the install icon (➕) in the address bar (right side)
   - Or wait for the custom install prompt card (bottom-right corner)
   - The browser may also show a banner at the top

2. **Firefox:**
   - Menu → Install Site as App
   - Or the custom install prompt card

3. **Safari (macOS):**
   - File → Add to Dock (not a true PWA, but similar)

### Mobile Browsers:

1. **Chrome (Android):**
   - Browser menu → "Install app" or "Add to Home screen"
   - Custom install prompt card (bottom-right)
   - Browser may show a banner at the bottom

2. **Safari (iOS):**
   - Share button → "Add to Home Screen"
   - Note: iOS doesn't support the `beforeinstallprompt` event, so the custom prompt won't appear

3. **Samsung Internet:**
   - Menu → "Add page to" → "Home screen"

## Testing Checklist

- [ ] Service worker is registered (check DevTools → Application → Service Workers)
- [ ] Manifest is loaded (check DevTools → Application → Manifest)
- [ ] Install prompt appears (custom card or browser UI)
- [ ] App installs successfully
- [ ] App opens in standalone mode (no browser UI)
- [ ] Offline page works (turn off network, navigate to a new page)
- [ ] Cached assets load offline
- [ ] App icon appears on home screen/desktop

## Important Notes

1. **HTTPS Required:** PWA features only work on HTTPS (or localhost)
2. **Production:** PWA is automatically enabled in production builds
3. **Development:** PWA is disabled by default unless `ENABLE_PWA_DEV=true`
4. **Service Worker:** May need to unregister old service workers in DevTools if testing

## Troubleshooting

### Install prompt not showing?
1. Check if app is already installed
2. Clear browser cache and service workers
3. Ensure you're on HTTPS or localhost
4. Check browser console for errors
5. Verify manifest.json is accessible at `/manifest.json`

### Service worker not registering?
1. Check DevTools → Application → Service Workers
2. Look for errors in Console
3. Ensure `ENABLE_PWA_DEV=true` is set in development
4. Try hard refresh (Ctrl+Shift+R / Cmd+Shift+R)

### Offline not working?
1. Verify service worker is active
2. Check Network tab in DevTools (should show "ServiceWorker" in size column)
3. Ensure fallback page exists at `/offline`

## Deployment Safety

✅ **Safe for Production:**
- PWA is automatically enabled in production (`NODE_ENV=production`)
- The `ENABLE_PWA_DEV` variable only affects development mode
- Production builds will always have PWA enabled regardless of this variable
