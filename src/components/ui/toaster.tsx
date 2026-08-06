"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  ToastProgressBar,
} from "@/components/ui/toast"
import { cn } from "@/lib/utils"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, duration = 5000, variant, className, ...props }) {
        return (
          <Toast key={id} duration={duration} variant={variant} className={className} {...props}>
            <div className="grid gap-1">
              {title && (
                <ToastTitle className={cn(
                  (variant === 'success' || className?.includes('bg-emerald')) && 'text-white',
                  variant === 'destructive' && 'text-white',
                )}>
                  {title}
                </ToastTitle>
              )}
              {description && (
                <ToastDescription className={cn(
                  (variant === 'success' || className?.includes('bg-emerald')) && 'text-white/95',
                  variant === 'destructive' && 'text-white',
                )}>
                  {description}
                </ToastDescription>
              )}
            </div>
            {action}
            <ToastClose className={cn(
              (variant === 'success' || className?.includes('bg-emerald')) && 'text-white/80 hover:text-white',
              variant === 'destructive' && 'text-white/80 hover:text-white',
            )} />
            <ToastProgressBar duration={duration} />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}