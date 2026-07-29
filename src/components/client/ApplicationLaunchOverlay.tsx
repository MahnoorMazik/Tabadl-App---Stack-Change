'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

type ApplicationLaunchOverlayProps = {
  open: boolean
  areaLabel?: string
  mode?: 'start' | 'continue'
  className?: string
}

export function ApplicationLaunchOverlay({
  open,
  areaLabel,
  mode = 'start',
  className,
}: ApplicationLaunchOverlayProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={cn(
            'fixed inset-0 z-[100] flex items-center justify-center p-6',
            'bg-background/80 backdrop-blur-md',
            className
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          role="alertdialog"
          aria-busy="true"
          aria-live="polite"
          aria-label="Starting application"
        >
          <motion.div
            className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-emerald-200/80 bg-linear-to-br from-emerald-50 via-white to-teal-50 shadow-2xl shadow-emerald-900/10 px-8 py-10 text-center"
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          >
            <motion.div
              className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Sparkles className="h-8 w-8" aria-hidden />
            </motion.div>

            <motion.h2
              className="text-lg font-semibold tracking-tight text-emerald-950"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
            >
              {mode === 'continue'
                ? 'Continuing your application'
                : 'Your application is starting'}
            </motion.h2>

            <motion.p
              className="mt-2 text-sm text-muted-foreground leading-relaxed"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 }}
            >
              {areaLabel
                ? mode === 'continue'
                  ? `Loading your ${areaLabel} draft…`
                  : `Preparing your ${areaLabel} forms — one moment…`
                : mode === 'continue'
                  ? 'Loading your draft…'
                  : 'Preparing your forms — one moment…'}
            </motion.p>

            <motion.div
              className="mt-6 flex justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" aria-hidden />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
