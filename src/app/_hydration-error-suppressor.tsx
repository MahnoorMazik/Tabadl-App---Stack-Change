'use client'

import { useEffect } from 'react'

/**
 * Suppresses hydration errors caused by browser extensions
 * This runs before React hydration and filters out extension-related errors
 */
export function HydrationErrorSuppressor() {
  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV === 'development') {
      const originalError = console.error
      
      console.error = (...args) => {
        // Filter out hydration errors caused by browser extensions
        const errorString = args.join(' ')
        
        if (
          errorString.includes('Hydration') ||
          errorString.includes('data-new-gr-c-s-check-loaded') ||
          errorString.includes('data-gr-ext-installed') ||
          errorString.includes('data-gramm')
        ) {
          // Silently ignore these errors
          return
        }
        
        // Call original console.error for other errors
        originalError.apply(console, args)
      }

      // Cleanup on unmount
      return () => {
        console.error = originalError
      }
    }
  }, [])

  return null
}

