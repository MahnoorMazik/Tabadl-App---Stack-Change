'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Construction } from 'lucide-react'

interface PageUnderConstructionProps {
  className?: string
  title?: string
  description?: string
  hideBackButton?: boolean
  backHref?: string
  backLabel?: string
}

export function PageUnderConstruction({
  className,
  title = 'Page Under Construction',
  description = 'This feature is currently being developed and will be available soon.',
  hideBackButton = false,
  backHref = '/client',
  backLabel = 'Back to Dashboard',
}: PageUnderConstructionProps) {
  return (
    <div className={cn('min-h-[60vh] flex items-center justify-center', className)}>
      <div className="max-w-2xl w-full rounded-2xl border bg-white dark:bg-card dark:border-border shadow-sm px-10 py-12 text-center">
        <div className="flex flex-col items-center gap-4">
          <Construction className="h-12 w-12 text-amber-500 dark:text-amber-400" />
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-foreground">{title}</h2>
            <p className="mt-2 text-gray-600 dark:text-muted-foreground">{description}</p>
          </div>
          {!hideBackButton && (
            <Link
              href={backHref}
              className="inline-flex items-center rounded-md border border-gray-200 dark:border-border bg-white dark:bg-card px-4 py-2 text-sm font-medium text-gray-700 dark:text-foreground hover:bg-gray-50 dark:hover:bg-muted/50"
            >
              {backLabel}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

