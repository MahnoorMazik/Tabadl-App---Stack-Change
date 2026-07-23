'use client'

import { useEffect, useState } from 'react'

/**
 * Hook to optimize performance on mobile devices
 * Reduces animations and optimizes rendering
 */
export function useMobileOptimization() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Check if device is mobile/tablet
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth < 1024
      setIsMobile(isMobileDevice)
      
      // Add class to body for mobile-specific optimizations
      if (isMobileDevice) {
        document.body.classList.add('mobile-device')
      } else {
        document.body.classList.remove('mobile-device')
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => {
      window.removeEventListener('resize', checkMobile)
      document.body.classList.remove('mobile-device')
    }
  }, [])

  return { isMobile }
}
