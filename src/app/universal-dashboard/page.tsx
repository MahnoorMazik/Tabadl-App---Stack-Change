'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { DynamicSidebar } from '@/components/DynamicSidebar'
import { DynamicDashboard } from '@/components/DynamicDashboard'
import { ProfileDropdown } from '@/components/ProfileDropdown'
import { NotificationDropdown } from '@/components/NotificationDropdown'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { Menu, Bell } from 'lucide-react'

export default function UniversalDashboard() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      // Redirect to appropriate login based on intended user type
      const intendedUserType = localStorage.getItem('intended-user-type') || 'client'
      if (intendedUserType === 'staff') {
        router.push('/admin/login')
      } else {
        router.push('/login')
      }
    }
  }, [user, authLoading, router])

  // Show loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Don't render if no user
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background flex">
      {/* Dynamic Sidebar */}
      <div className={`${isSidebarCollapsed ? 'w-[70px]' : 'w-64'} transition-all duration-300 flex-shrink-0`}>
        <DynamicSidebar 
          isCollapsed={isSidebarCollapsed} 
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white dark:bg-card border-b dark:border-border">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className="p-2 lg:hidden"
                >
                  <Menu className="h-4 w-4" />
                </Button>
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <Image
                      src="/logo-horizontal.png"
                      alt="Tabadl Alkon"
                      width={150}
                      height={50}
                      className="h-10 w-auto"
                      priority
                    />
                  </div>
                  <div className="border-l border-gray-300 dark:border-border h-8"></div>
                  <div>
                    <h1 className="text-xl font-semibold text-gray-900 dark:text-foreground">
                      {user.role === 'CLIENT' ? 'Client Dashboard' : 'Staff Dashboard'}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-muted-foreground">
                      {user.role === 'CLIENT' 
                        ? 'Manage your applications and documents'
                        : `${user.staffType?.replace('_', ' ') || 'Staff'} Dashboard`
                      }
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <LanguageSwitcher />
                <ThemeSwitcher />
                <NotificationDropdown />
                <ProfileDropdown />
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Dashboard Content */}
        <main className="flex-1 overflow-auto">
          <DynamicDashboard />
        </main>
      </div>
    </div>
  )
}
