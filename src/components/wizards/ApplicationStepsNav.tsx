'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export type ApplicationStepNavItem = {
  id: string
  formName: string
  filled?: boolean
  paymentRequired?: boolean
}

type ApplicationStepsNavProps = {
  steps: ApplicationStepNavItem[]
  stepIndex: number
  onStepSelect: (index: number) => void
  completedCount?: number
  className?: string
  searchThreshold?: number
}

function StepNode({
  index,
  active,
  filled,
}: {
  index: number
  active: boolean
  filled: boolean
}) {
  if (filled) {
    return (
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          active
            ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm shadow-emerald-600/25'
            : 'border-emerald-500 bg-emerald-500 text-white'
        )}
        aria-hidden
      >
        <Check className="h-4 w-4 stroke-[2.5]" />
      </span>
    )
  }

  return (
    <span
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold tabular-nums transition-colors',
        active
          ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm shadow-emerald-600/25'
          : 'border-muted-foreground/25 bg-background text-muted-foreground'
      )}
      aria-hidden
    >
      {index + 1}
    </span>
  )
}

export function ApplicationStepsNav({
  steps,
  stepIndex,
  onStepSelect,
  completedCount,
  className,
  searchThreshold = 8,
}: ApplicationStepsNavProps) {
  const [query, setQuery] = useState('')
  const activeRef = useRef<HTMLButtonElement>(null)
  const total = steps.length
  const filled = completedCount ?? steps.filter((s) => s.filled).length

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return steps.map((step, index) => ({ step, index }))
    return steps
      .map((step, index) => ({ step, index }))
      .filter(
        ({ step, index }) =>
          step.formName.toLowerCase().includes(q) ||
          `step ${index + 1}`.includes(q) ||
          String(index + 1).includes(q)
      )
  }, [query, steps])

  const showConnectors = !query.trim()

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [stepIndex])

  if (total === 0) return null

  const progressPct = total > 0 ? Math.round((filled / total) * 100) : 0

  const renderStepList = () => (
    <ul className="py-1 px-3">
      {filtered.length === 0 ? (
        <li className="px-2 py-6 text-center text-xs text-muted-foreground">
          No steps match &quot;{query}&quot;
        </li>
      ) : (
        filtered.map(({ step, index }, i) => {
          const active = index === stepIndex
          const isLastInList = i === filtered.length - 1

          return (
            <li key={step.id} className="relative pl-10 pr-1 pb-0.5 last:pb-0">
              {showConnectors && !isLastInList && (
                <span
                  className={cn(
                    'absolute left-[15px] top-[2.125rem] bottom-0 w-0.5 -mb-0.5',
                    step.filled ? 'bg-emerald-400' : 'bg-border'
                  )}
                  aria-hidden
                />
              )}
              <div className="absolute left-0 top-2 z-[1]">
                <StepNode index={index} active={active} filled={!!step.filled} />
              </div>
              <button
                ref={active ? activeRef : undefined}
                type="button"
                onClick={() => onStepSelect(index)}
                className={cn(
                  'group w-full rounded-lg py-2 pl-2 pr-2 text-left transition-colors',
                  active
                    ? 'bg-emerald-50/90 ring-1 ring-inset ring-emerald-200/80'
                    : 'hover:bg-muted/50'
                )}
              >
                <span className="min-w-0 block">
                  <span
                    className={cn(
                      'block text-[10px] font-semibold uppercase tracking-wider',
                      active ? 'text-emerald-700' : 'text-muted-foreground'
                    )}
                  >
                    Step {index + 1}
                  </span>
                  <span
                    className={cn(
                      'block truncate text-sm leading-snug mt-0.5',
                      active ? 'font-semibold text-emerald-950' : 'font-medium text-foreground'
                    )}
                  >
                    {step.formName}
                  </span>
                  {step.paymentRequired && (
                    <span className="inline-block mt-1 text-[10px] font-medium text-amber-800 bg-amber-100/80 border border-amber-200/60 rounded px-1.5 py-px">
                      Payment
                    </span>
                  )}
                </span>
              </button>
            </li>
          )
        })
      )}
    </ul>
  )

  return (
    <Card className={cn('flex flex-col overflow-hidden border-border/80', className)}>
      <CardHeader className="py-4 px-4 space-y-3 border-b bg-muted/20">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">Steps</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Forms in order — {filled} of {total} completed
          </p>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-600 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="flex gap-2 lg:hidden">
          <Select value={String(stepIndex)} onValueChange={(v) => onStepSelect(Number(v))}>
            <SelectTrigger className="h-9 flex-1 text-xs">
              <SelectValue placeholder="Jump to step" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {(query.trim() ? filtered : steps.map((step, i) => ({ step, index: i }))).map(
                ({ step, index: i }) => (
                  <SelectItem key={step.id} value={String(i)} className="text-xs">
                    Step {i + 1}: {step.formName}
                    {step.filled ? ' ✓' : ''}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            disabled={stepIndex <= 0}
            onClick={() => onStepSelect(stepIndex - 1)}
            aria-label="Previous step"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            disabled={stepIndex >= total - 1}
            onClick={() => onStepSelect(stepIndex + 1)}
            aria-label="Next step"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {total >= searchThreshold && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search steps…"
              className="h-8 pl-8 text-xs bg-background"
            />
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0 flex flex-col flex-1 min-h-0">
        <ScrollArea className="h-[min(520px,calc(100vh-14rem))] max-lg:h-[min(280px,40vh)]">
          {renderStepList()}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
