'use client'

import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { ClientSidebar } from '@/components/client-sidebar'
import { ProfileDropdown } from '@/components/ProfileDropdown'
import { NotificationDropdown } from '@/components/NotificationDropdown'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { Menu } from 'lucide-react'

interface MobileLayoutProps {
  isSidebarCollapsed: boolean
  isMobileSidebarOpen: boolean
  onToggleMobile: () => void
  onToggleDesktop: () => void
  onCloseMobile: () => void
  title: string
  description?: string
  icon?: ReactNode
  actions?: ReactNode
  children: ReactNode
}

export function MobileLayout({
  isSidebarCollapsed,
  isMobileSidebarOpen,
  onToggleMobile,
  onToggleDesktop,
  onCloseMobile,
  title,
  description,
  icon,
  actions,
  children,
}: MobileLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background flex relative">
      {/* Mobile backdrop */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar - Hidden on mobile, overlay when open. RTL: right edge, slide from right. */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 rtl:left-auto rtl:right-0 z-50
        ${isSidebarCollapsed ? 'w-16' : 'w-64'} 
        transition-all duration-300 flex-shrink-0
        ${isMobileSidebarOpen ? 'translate-x-0' : 'max-lg:ltr:-translate-x-full max-lg:rtl:translate-x-full lg:translate-x-0'}
      `}>
        <ClientSidebar 
          isCollapsed={isSidebarCollapsed} 
          onToggle={() => {
            onToggleDesktop()
            onCloseMobile()
          }} 
        />
      </aside>

      <div className="flex-1 flex flex-col w-full lg:w-auto">
        <header className="bg-white dark:bg-card border-b dark:border-border">
          <div className="px-4 sm:px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onToggleMobile}
                  className="lg:hidden"
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onToggleDesktop}
                  className="hidden lg:flex"
                >
                  <Menu className="h-4 w-4" />
                </Button>
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-foreground flex items-center gap-2 truncate">
                    {icon && <span className="hidden sm:inline">{icon}</span>}
                    <span className="truncate">{title}</span>
                  </h1>
                  {description && (
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-muted-foreground truncate">{description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                {actions && <div className="hidden sm:block">{actions}</div>}
                <LanguageSwitcher />
                <ThemeSwitcher />
                <NotificationDropdown />
                <ProfileDropdown />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
