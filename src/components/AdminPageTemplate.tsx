'use client'

import { useState, useEffect, ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { RoleBasedSidebar } from '@/components/RoleBasedSidebar'
import { ProfileDropdown } from '@/components/ProfileDropdown'
import { NotificationDropdown } from '@/components/NotificationDropdown'
import { PushAutoSubscribe } from '@/components/PushAutoSubscribe'
import { AdminPageAccessTracker } from '@/components/audit/AdminPageAccessTracker'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, Construction } from 'lucide-react'
import { Permission } from '@/lib/rbac'
import { useLocale } from '@/contexts/LocaleContext'

interface AdminPageTemplateProps {
  title: string
  description: string
  icon?: ReactNode
  children?: ReactNode
  showConstruction?: boolean
  requiredPermission?: string
  requiredPermissions?: string[]
  actions?: ReactNode
  /** When true, content uses full main width instead of max-w-6xl. */
  fullWidth?: boolean
}

export function AdminPageTemplate({ 
  title, 
  description, 
  icon,
  children, 
  showConstruction = true,
  requiredPermission,
  requiredPermissions,
  actions,
  fullWidth = false,
}: AdminPageTemplateProps) {
  const { user, loading, permissionsLoading } = useAuth()
  const router = useRouter()
  const { t } = useLocale()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)

  const needsPermissionCheck = Boolean(requiredPermission || (requiredPermissions && requiredPermissions.length > 0))

  useEffect(() => {
    // Stay in a neutral loading state until auth + permissions are fully resolved.
    // Never keep a stale "denied" while permissions are still loading — that was
    // bouncing users to the dashboard on soft navigations (e.g. New Form / after save).
    if (loading || permissionsLoading) {
      setHasPermission(null)
      return
    }

    if (!user) {
      router.replace('/admin/login')
      return
    }

    if (user.role !== 'STAFF') {
      router.replace('/admin/login')
      return
    }

    if (!needsPermissionCheck) {
      setHasPermission(true)
      return
    }

    const userPermissions = user.permissions || []

    if (requiredPermission) {
      setHasPermission(userPermissions.includes(requiredPermission as Permission))
      return
    }

    if (requiredPermissions && requiredPermissions.length > 0) {
      setHasPermission(
        requiredPermissions.some((permission) =>
          userPermissions.includes(permission as Permission)
        )
      )
      return
    }

    setHasPermission(true)
  }, [user, loading, permissionsLoading, requiredPermission, requiredPermissions, needsPermissionCheck, router])

  const isChecking = loading || hasPermission === null || (needsPermissionCheck && permissionsLoading)

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  // Show no permission state (do NOT auto-redirect to dashboard — that caused
  // false "redirect" bugs when navigating between form/wizard screens)
  if (hasPermission === false) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('common.accessDenied')}</h1>
          <p className="text-gray-600">{t('common.noPermission')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-50 dark:bg-background flex overflow-hidden relative">
      <PushAutoSubscribe />
      <AdminPageAccessTracker />
      {/* Mobile backdrop */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Hidden on mobile, overlay when open. RTL: right edge, slide from right. */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 rtl:left-auto rtl:right-0 z-50
        ${isSidebarCollapsed ? 'w-[70px]' : 'w-64'} 
        transition-all duration-300 flex-shrink-0
        ${isMobileSidebarOpen ? 'translate-x-0' : 'max-lg:ltr:-translate-x-full max-lg:rtl:translate-x-full lg:translate-x-0'}
      `}>
        <RoleBasedSidebar 
          isCollapsed={isSidebarCollapsed} 
          onToggle={() => {
            setIsSidebarCollapsed(!isSidebarCollapsed)
            setIsMobileSidebarOpen(false)
          }} 
        />
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden w-full lg:w-auto">
        <header className="bg-white dark:bg-card border-b dark:border-border flex-shrink-0">
          <div className="px-4 sm:px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setIsMobileSidebarOpen(!isMobileSidebarOpen)
                    setIsSidebarCollapsed(false)
                  }}
                  className="lg:hidden"
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-foreground flex items-center gap-2 truncate">
                    {icon && <span className="hidden sm:inline">{icon}</span>}
                    <span className="truncate">{title}</span>
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-muted-foreground truncate">{description}</p>
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

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className={fullWidth ? 'w-full mx-auto' : 'max-w-6xl mx-auto'}>
            {children || (showConstruction && (
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Construction className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    {t('common.pageUnderConstruction')}
                  </CardTitle>
                  <CardDescription>
                    {t('common.featureComingSoon')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <Construction className="h-20 w-20 text-amber-600 dark:text-amber-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2 dark:text-foreground">{t('common.comingSoon')}</h3>
                    <p className="text-gray-600 dark:text-muted-foreground mb-6">{t('common.workingOnFeature')}</p>
                    <Link href="/admin/dashboard">
                      <Button variant="outline">{t('common.backToDashboard')}</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}

