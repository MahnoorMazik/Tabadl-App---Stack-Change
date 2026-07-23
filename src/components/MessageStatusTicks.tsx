import { Check, CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MessageStatusTicksProps {
  status: 'SENT' | 'DELIVERED' | 'READ'
  className?: string
}

export function MessageStatusTicks({ status, className }: MessageStatusTicksProps) {
  if (status === 'SENT') {
    return (
      <Check 
        className={cn("h-3.5 w-3.5", className)} 
        strokeWidth={2.5}
      />
    )
  }

  if (status === 'DELIVERED') {
    return (
      <CheckCheck 
        className={cn("h-3.5 w-3.5 text-gray-400", className)} 
        strokeWidth={2.5}
      />
    )
  }

  // READ status - blue double tick
  return (
    <CheckCheck 
      className={cn("h-3.5 w-3.5 text-blue-500", className)} 
      strokeWidth={2.5}
    />
  )
}

