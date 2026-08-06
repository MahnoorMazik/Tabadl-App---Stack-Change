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
import { useLocale } from "@/contexts/LocaleContext"

export function Toaster() {
  const { toasts } = useToast()
  const { locale } = useLocale()
  const isRTL = locale === 'ar'

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, duration = 5000, variant, className, ...props }) {
        return (
          <Toast 
            key={id} 
            duration={duration} 
            variant={variant} 
            dir={isRTL ? 'rtl' : 'ltr'}
            className={cn(
              isRTL && 'text-right [direction:rtl]',
              className
            )} 
            {...props}
          >
            <div className={cn("grid gap-1", isRTL && "text-right")}>
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
              isRTL && 'right-auto left-2',
              (variant === 'success' || className?.includes('bg-emerald')) && 'text-white/80 hover:text-white',
              variant === 'destructive' && 'text-white/80 hover:text-white',
            )} />
            <ToastProgressBar duration={duration} />
          </Toast>
        )
      })}
      <ToastViewport className={cn(
        isRTL && "sm:left-4 sm:right-auto rtl:slide-in-from-top-full"
      )} />
    </ToastProvider>
  )
}