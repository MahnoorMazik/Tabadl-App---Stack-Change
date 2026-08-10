/** Writes the ApplicationLaunchOverlay-style loading UI into a newly opened about:blank tab. */
export function writeApplicationLaunchLoadingDocument(
  popup: Window,
  options: {
    title: string
    subtitle: string
    documentTitle?: string
    dir?: 'ltr' | 'rtl'
  }
) {
  const { title, subtitle, documentTitle = 'Loading…', dir = 'ltr' } = options

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')

  const safeTitle = escapeHtml(title)
  const safeSubtitle = escapeHtml(subtitle)
  const safeDocTitle = escapeHtml(documentTitle)

  popup.document.open()
  popup.document.write(`<!DOCTYPE html>
<html lang="${dir === 'rtl' ? 'ar' : 'en'}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeDocTitle}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; }
    body {
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      color: #022c22;
    }
    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }
    .card {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 24rem;
      overflow: hidden;
      border-radius: 1rem;
      border: 1px solid rgba(167, 243, 208, 0.8);
      background: linear-gradient(135deg, #ecfdf5 0%, #ffffff 45%, #f0fdfa 100%);
      box-shadow: 0 25px 50px -12px rgba(6, 78, 59, 0.12);
      padding: 2.5rem 2rem;
      text-align: center;
      animation: cardIn 0.45s cubic-bezier(0.22, 1, 0.36, 1);
    }
    .icon {
      margin: 0 auto 1.25rem;
      width: 4rem;
      height: 4rem;
      border-radius: 1rem;
      background: #059669;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 15px -3px rgba(5, 150, 105, 0.3);
      animation: pulse 1.4s ease-in-out infinite;
    }
    .icon svg { width: 2rem; height: 2rem; }
    h1 {
      font-size: 1.125rem;
      font-weight: 600;
      letter-spacing: -0.01em;
      color: #022c22;
    }
    p {
      margin-top: 0.5rem;
      font-size: 0.875rem;
      line-height: 1.625;
      color: #64748b;
    }
    .spinner {
      margin: 1.5rem auto 0;
      width: 1.5rem;
      height: 1.5rem;
      border: 2px solid #a7f3d0;
      border-top-color: #059669;
      border-radius: 9999px;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.06); }
    }
    @keyframes cardIn {
      from { opacity: 0; transform: translateY(12px) scale(0.92); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
  </style>
</head>
<body>
  <div class="backdrop" aria-hidden="true"></div>
  <div class="card" role="alertdialog" aria-busy="true" aria-live="polite">
    <div class="icon" aria-hidden="true">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
        <path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>
      </svg>
    </div>
    <h1>${safeTitle}</h1>
    <p>${safeSubtitle}</p>
    <div class="spinner" aria-hidden="true"></div>
  </div>
</body>
</html>`)
  popup.document.close()
}
