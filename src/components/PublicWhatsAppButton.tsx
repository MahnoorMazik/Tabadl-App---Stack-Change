'use client'

import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'

const WhatsAppButton = dynamic(
  () => import('@/components/WhatsAppButton').then((mod) => ({ default: mod.WhatsAppButton })),
  { ssr: false }
)

const PUBLIC_PATHS = [
  '/',
  '/about-us',
  '/contact',
  '/misa',
  '/premium-residency',
  '/privacy-policy',
  '/terms-of-service',
  '/cookie-policy',
]

export function PublicWhatsAppButton() {
  const pathname = usePathname()
  const isPublic = pathname && PUBLIC_PATHS.includes(pathname)

  if (!isPublic) return null
  return <WhatsAppButton variant="floating" />
}
