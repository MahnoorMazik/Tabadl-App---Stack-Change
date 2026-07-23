'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

const ITEM_HEIGHT = 36
const VISIBLE_ITEMS = 5
const COLUMN_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS

const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
const MINUTES_5 = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]
const AM_PM = ['AM', 'PM'] as const

function parseHHmm(value: string): { hour12: number; minute: number; ampm: 'AM' | 'PM' } {
  const [hStr, mStr] = (value || '09:00').split(':')
  const h24 = Math.min(23, Math.max(0, parseInt(hStr || '9', 10)))
  const minute = Math.min(55, Math.max(0, Math.round(parseInt(mStr || '0', 10) / 5) * 5))
  const hour12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24
  const ampm = h24 < 12 ? 'AM' : 'PM'
  return { hour12, minute, ampm }
}

function toHHmm(hour12: number, minute: number, ampm: 'AM' | 'PM'): string {
  let h24 = hour12
  if (ampm === 'AM') h24 = hour12 === 12 ? 0 : hour12
  else h24 = hour12 === 12 ? 12 : hour12 + 12
  return `${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

interface TimePickerColumnProps {
  options: (string | number)[]
  value: string | number
  onSelect: (value: string | number) => void
  formatOption?: (opt: string | number) => string
  className?: string
}

function TimePickerColumn({ options, value, onSelect, formatOption, className }: TimePickerColumnProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const valueIndex = options.indexOf(value)
  const safeIndex = valueIndex >= 0 ? valueIndex : 0
  const format = formatOption ?? ((opt: string | number) => String(opt).padStart(2, '0'))

  // Sync scroll position to current value when value changes (e.g. from parent)
  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = safeIndex * ITEM_HEIGHT
  }, [safeIndex])

  const handleScroll = React.useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const index = Math.round(el.scrollTop / ITEM_HEIGHT)
    const clamped = Math.max(0, Math.min(index, options.length - 1))
    if (options[clamped] !== value) {
      onSelect(options[clamped])
    }
  }, [options, value, onSelect])

  const handleScrollEnd = React.useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const index = Math.round(el.scrollTop / ITEM_HEIGHT)
    const clamped = Math.max(0, Math.min(index, options.length - 1))
    el.scrollTo({ top: clamped * ITEM_HEIGHT, behavior: 'smooth' })
    if (options[clamped] !== value) {
      onSelect(options[clamped])
    }
  }, [options, value, onSelect])

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    let timeout: ReturnType<typeof setTimeout>
    const onScrollEnd = () => {
      clearTimeout(timeout)
      timeout = setTimeout(handleScrollEnd, 100)
    }
    el.addEventListener('scrollend', handleScrollEnd)
    el.addEventListener('scroll', onScrollEnd)
    return () => {
      el.removeEventListener('scrollend', handleScrollEnd)
      el.removeEventListener('scroll', onScrollEnd)
      clearTimeout(timeout)
    }
  }, [handleScrollEnd])

  const handleWheel = React.useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const el = scrollRef.current
    if (!el) return
    const canScrollUp = el.scrollTop > 0
    const canScrollDown = el.scrollTop < el.scrollHeight - el.clientHeight - 1
    if ((e.deltaY > 0 && canScrollDown) || (e.deltaY < 0 && canScrollUp)) {
      e.preventDefault()
      el.scrollTop += e.deltaY
    }
  }, [])

  return (
    <div
      ref={scrollRef}
      className={cn(
        'overflow-y-auto overflow-x-hidden overscroll-y-auto flex flex-col py-[72px]',
        'touch-pan-y [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:[display:none]',
        'select-none',
        className
      )}
      style={{ height: COLUMN_HEIGHT, touchAction: 'pan-y' }}
      onScroll={handleScroll}
      onWheel={handleWheel}
      tabIndex={0}
      role="listbox"
    >
      {options.map((opt, i) => (
        <button
          key={i}
          type="button"
          className={cn(
            'shrink-0 h-9 flex items-center justify-center text-sm font-medium transition-colors rounded-md',
            'hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300',
            value === opt ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-muted-foreground'
          )}
          style={{ height: ITEM_HEIGHT }}
          onClick={() => {
            onSelect(opt)
            scrollRef.current?.scrollTo({ top: i * ITEM_HEIGHT, behavior: 'smooth' })
          }}
        >
          {format(opt)}
        </button>
      ))}
    </div>
  )
}

export interface TimePickerProps {
  value: string
  onChange: (value: string) => void
  onClose?: () => void
  className?: string
}

export function TimePicker({ value, onChange, onClose, className }: TimePickerProps) {
  const parsed = React.useMemo(() => parseHHmm(value), [value])
  const [hour12, setHour12] = React.useState(parsed.hour12)
  const [minute, setMinute] = React.useState(parsed.minute)
  const [ampm, setAmpm] = React.useState<'AM' | 'PM'>(parsed.ampm)

  // Refs so handlers can read latest state without effect-driven onChange (avoids update loops)
  const stateRef = React.useRef({ hour12, minute, ampm })
  stateRef.current = { hour12, minute, ampm }

  // Sync from parent when value prop changes (e.g. initial open or external reset)
  React.useEffect(() => {
    const p = parseHHmm(value)
    setHour12(p.hour12)
    setMinute(p.minute)
    setAmpm(p.ampm)
  }, [value])

  // Notify parent only from user actions; never from an effect to avoid infinite loops
  const notifyChange = React.useCallback((h: number, m: number, a: 'AM' | 'PM') => {
    const next = toHHmm(h, m, a)
    onChange(next)
  }, [onChange])

  const handleHourSelect = React.useCallback(
    (h: string | number) => {
      const n = typeof h === 'string' ? parseInt(h, 10) : h
      setHour12(n)
      const { minute: m, ampm: a } = stateRef.current
      notifyChange(n, m, a)
    },
    [notifyChange]
  )

  const handleMinuteSelect = React.useCallback(
    (m: string | number) => {
      const n = typeof m === 'string' ? parseInt(m, 10) : m
      setMinute(n)
      const { hour12: h, ampm: a } = stateRef.current
      notifyChange(h, n, a)
    },
    [notifyChange]
  )

  const handleAmpmSelect = React.useCallback(
    (a: string | number) => {
      const nextAmpm = String(a) as 'AM' | 'PM'
      setAmpm(nextAmpm)
      const { hour12: h, minute: m } = stateRef.current
      notifyChange(h, m, nextAmpm)
    },
    [notifyChange]
  )

  return (
    <div
      className={cn(
        'flex items-stretch rounded-lg border border-border bg-popover text-popover-foreground overflow-hidden',
        className
      )}
      role="group"
      aria-label="Time picker"
    >
      <div className="relative flex">
        <div
          className="absolute inset-x-0 top-[72px] h-9 pointer-events-none z-10 rounded-md border-y border-emerald-500/30 bg-emerald-500/10"
          style={{ height: ITEM_HEIGHT }}
          aria-hidden
        />
        <TimePickerColumn
          options={HOURS_12}
          value={hour12}
          onSelect={handleHourSelect}
          formatOption={(opt) => String(opt)}
          className="min-w-[52px] border-r border-border"
        />
        <TimePickerColumn
          options={MINUTES_5}
          value={minute}
          onSelect={handleMinuteSelect}
          className="min-w-[52px] border-r border-border"
        />
        <TimePickerColumn
          options={[...AM_PM]}
          value={ampm}
          onSelect={handleAmpmSelect}
          formatOption={(opt) => String(opt)}
          className="min-w-[56px]"
        />
      </div>
    </div>
  )
}
