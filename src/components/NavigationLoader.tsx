'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import NProgress from 'nprogress'

NProgress.configure({ 
  showSpinner: false,
  minimum: 0.3,
  easing: 'ease',
  speed: 500,
  trickleSpeed: 200,
})

export function NavigationLoader() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  // Disable progress bar on contact page
  const isContactPage = pathname === '/contact'

  useEffect(() => {
    NProgress.done()
  }, [pathname, searchParams])

  useEffect(() => {
    // If on contact page, don't initialize progress bar handlers
    if (isContactPage) {
      NProgress.done()
      return
    }

    // Handle link clicks
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const anchor = target.closest('a')
      
      if (anchor && anchor.href && !anchor.target && anchor.href.startsWith(window.location.origin)) {
        const url = new URL(anchor.href)
        // Don't show progress bar when navigating to or from contact page
        if (url.pathname !== pathname && url.pathname !== '/contact' && pathname !== '/contact') {
          NProgress.start()
        }
      }
    }

    // Handle button clicks (for navigation buttons)
    const handleButtonClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const button = target.closest('button')
      
      if (button && (button.getAttribute('type') === 'submit' || button.closest('form'))) {
        NProgress.start()
      }
    }

    document.addEventListener('click', handleAnchorClick)
    document.addEventListener('click', handleButtonClick)
    
    return () => {
      document.removeEventListener('click', handleAnchorClick)
      document.removeEventListener('click', handleButtonClick)
      NProgress.done()
    }
  }, [pathname, isContactPage])

  // Hide progress bar on contact page
  useEffect(() => {
    if (isContactPage) {
      const style = document.createElement('style')
      style.textContent = '#nprogress { display: none !important; }'
      document.head.appendChild(style)
      return () => {
        document.head.removeChild(style)
      }
    }
  }, [isContactPage])

  return null
}

