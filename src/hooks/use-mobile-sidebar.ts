'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function useMobileSidebar() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const pathname = usePathname()

  // Close mobile sidebar when route changes
  useEffect(() => {
    setIsMobileSidebarOpen(false)
  }, [pathname])

  // Close mobile sidebar when window is resized to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileSidebarOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen)
    setIsSidebarCollapsed(false)
  }

  const toggleDesktopSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed)
    setIsMobileSidebarOpen(false)
  }

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false)
  }

  return {
    isSidebarCollapsed,
    isMobileSidebarOpen,
    setIsSidebarCollapsed,
    setIsMobileSidebarOpen,
    toggleMobileSidebar,
    toggleDesktopSidebar,
    closeMobileSidebar,
  }
}
