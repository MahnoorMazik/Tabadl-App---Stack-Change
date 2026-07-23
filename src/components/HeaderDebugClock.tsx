'use client'

import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'

/**
 * Shows the current time as seen by the browser (for debugging notification/time issues).
 * Updates every second. Tooltip shows timezone and ISO time.
 */
export function HeaderDebugClock() {
  const [now, setNow] = useState<Date | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const tick = () => setNow(new Date())
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  if (!mounted || !now) return null

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })
  const isoStr = now.toISOString()
  const title = `Browser time (for debugging)\n${timezone}\n${isoStr}`

  return (
    <span
      className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono tabular-nums"
      title={title}
    >
      <Clock className="h-3.5 w-3.5 flex-shrink-0" />
      <span className="hidden sm:inline">{timeStr}</span>
      <span className="sm:hidden">{now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
    </span>
  )
}
