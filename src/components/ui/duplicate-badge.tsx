'use client'

import { Badge } from '@/components/ui/badge'
import { Copy, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DuplicateBadgeProps {
  isDuplicate: boolean
  duplicateCount: number
  className?: string
  showIcon?: boolean
}

export function DuplicateBadge({ 
  isDuplicate, 
  duplicateCount, 
  className,
  showIcon = true 
}: DuplicateBadgeProps) {
  if (!isDuplicate) return null

  const getBadgeVariant = () => {
    if (duplicateCount === 2) return 'secondary'
    if (duplicateCount === 3) return 'destructive'
    return 'outline'
  }

  const getBadgeText = () => {
    if (duplicateCount === 1) return 'Original'
    return `Duplicate (${duplicateCount - 1}/3)`
  }

  return (
    <Badge 
      variant={getBadgeVariant()}
      className={cn(
        "flex items-center gap-1 text-xs font-medium",
        duplicateCount === 3 && "bg-red-100 text-red-800 border-red-200",
        duplicateCount === 2 && "bg-orange-100 text-orange-800 border-orange-200",
        duplicateCount === 1 && "bg-blue-100 text-blue-800 border-blue-200",
        className
      )}
    >
      {showIcon && (
        <Copy className="h-3 w-3" />
      )}
      {getBadgeText()}
    </Badge>
  )
}

interface DuplicateWarningProps {
  duplicateCount: number
  className?: string
}

export function DuplicateWarning({ duplicateCount, className }: DuplicateWarningProps) {
  if (duplicateCount <= 1) return null

  const getWarningMessage = () => {
    if (duplicateCount === 2) {
      return 'This lead has 1 duplicate submission'
    }
    if (duplicateCount === 3) {
      return 'This lead has 2 duplicate submissions (maximum reached)'
    }
    return `This lead has ${duplicateCount - 1} duplicate submissions`
  }

  return (
    <div className={cn(
      "flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200",
      className
    )}>
      <AlertTriangle className="h-3 w-3" />
      <span>{getWarningMessage()}</span>
    </div>
  )
}
