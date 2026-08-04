'use client'

import { CircleHelp } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type FieldHelpTooltipProps = {
  text?: string | null
  className?: string
  /** Icon button size classes */
  iconClassName?: string
}

/** Compact ? icon that shows help/tooltip text on hover. */
export function FieldHelpTooltip({
  text,
  className,
  iconClassName,
}: FieldHelpTooltipProps) {
  const message = text?.trim()
  if (!message) return null

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            className
          )}
          aria-label="Field help"
          onClick={(e) => e.preventDefault()}
        >
          <CircleHelp className={cn('h-3.5 w-3.5', iconClassName)} />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={6}
        className="max-w-xs text-left font-normal normal-case tracking-normal"
      >
        {message}
      </TooltipContent>
    </Tooltip>
  )
}
