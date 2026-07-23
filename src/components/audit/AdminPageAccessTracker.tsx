'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { resolveAdminPageTitle, shouldTrackAdminPageAccess } from '@/lib/adminPageTitles'

/** Logs admin page visits for the User Activity audit report. */
export function AdminPageAccessTracker() {
  const pathname = usePathname()
  const lastLoggedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!pathname || !shouldTrackAdminPageAccess(pathname)) return
    if (lastLoggedRef.current === pathname) return
    lastLoggedRef.current = pathname

    const pageTitle = resolveAdminPageTitle(pathname)
    const referer =
      typeof document !== 'undefined' && document.referrer ? document.referrer : undefined

    void fetch('/api/audit-logs/page-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname, pageTitle, referer }),
      keepalive: true,
    }).catch(() => {})
  }, [pathname])

  return null
}
