'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

/**
 * PWA is limited to admin only. On /admin we use manifest-admin.json so install
 * opens at /admin/dashboard. On public pages we use manifest-public.json
 * (display: browser) so the site is not installable as a PWA.
 */
export function ManifestSwitcher() {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof document === 'undefined') return
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
    if (!link) return
    const isAdmin = pathname?.startsWith('/admin') ?? false
    const href = isAdmin ? '/manifest-admin.json' : '/manifest-public.json'
    if (link.getAttribute('href') !== href) {
      link.setAttribute('href', href)
    }
  }, [pathname])

  return null
}
