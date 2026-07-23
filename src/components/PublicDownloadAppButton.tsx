'use client'

import { usePathname } from 'next/navigation'
import { DownloadAppButton } from '@/components/DownloadAppButton'

export function PublicDownloadAppButton() {
  const pathname = usePathname()
  const isAdmin = pathname?.startsWith('/admin')

  if (isAdmin) return null
  return <DownloadAppButton />
}
