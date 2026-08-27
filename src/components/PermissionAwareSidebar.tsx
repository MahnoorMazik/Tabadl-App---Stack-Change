'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import { PermissionChecker, Module, Action } from '@/lib/rbac'
import { 
  BarChart3, Users, UserPlus, FolderOpen, FileText, CheckCircle,
  DollarSign, TrendingUp, MessageSquare, Mail, HelpCircle, FileCheck,
  Archive, Settings, Shield, Phone, ClipboardList, LayoutDashboard,
  ChevronDown, ChevronRight, Menu, X, Globe, Tag, History, Activity, Bell, CreditCard, Bot,
  Briefcase, Package, PlusCircle, Layers, UserCog, Database
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useLocale } from '@/contexts/LocaleContext'

interface SidebarItem {
  title: string
  icon: React.ComponentType<{ className?: string }>
  href?: string
  badge?: string
  permission?: string
  children?: SidebarItem[]
}

interface PermissionAwareSidebarProps {
  className?: string
  isCollapsed?: boolean
  onToggle?: () => void
}

// Helper function to create sidebar items with translations
const createSidebarItems = (t: (key: string) => string): SidebarItem[] => [
  {
    title: t('admin.sidebar.dashboard'),
    icon: BarChart3,
    href: '/admin/dashboard',
    permission: `${Module.DASHBOARD}.${Action.VIEW}`
  },
  {
    title: t('admin.sidebar.clientManagement'),
    icon: Users,
    permission: `${Module.CLIENTS}.${Action.VIEW}`,
    children: [
      {
        title: t('admin.sidebar.leadManagement'),
        icon: UserPlus,
        href: '/admin/leads',
        permission: `${Module.LEADS}.${Action.VIEW}`
      },
      {
        title: t('admin.sidebar.importLeads'),
        icon: FileCheck,
        href: '/admin/leads/import',
        permission: `${Module.LEADS}.${Action.IMPORT}`
      },
      {
        title: t('admin.sidebar.leadStatuses'),
        icon: Tag,
        href: '/admin/leads/statuses',
        permission: `${Module.LEADS}.${Action.UPDATE}`
      },
      {
        title: t('admin.sidebar.allClients'),
        icon: Users,
        href: '/admin/clients',
        permission: `${Module.CLIENTS}.${Action.VIEW}`
      },
      {
        title: t('admin.sidebar.clientGroups'),
        icon: FolderOpen,
        href: '/admin/clients/groups',
        permission: `${Module.CLIENTS}.${Action.VIEW}`
      },
      {
        title: t('admin.sidebar.importClients'),
        icon: UserPlus,
        href: '/admin/clients/import',
        permission: `${Module.CLIENTS}.${Action.IMPORT}`
      }
    ]
  },
  {
    title: t('admin.sidebar.services'),
    icon: Briefcase,
    permission: `${Module.SERVICES}.${Action.VIEW}`,
    children: [
      {
        title: t('admin.sidebar.servicesCatalog'),
        icon: Briefcase,
        href: '/admin/services',
        permission: `${Module.SERVICES}.${Action.VIEW}`
      },
      {
        title: t('admin.sidebar.packages'),
        icon: Package,
        href: '/admin/services/packages',
        permission: `${Module.SERVICES}.${Action.VIEW}`
      },
      {
        title: t('admin.sidebar.addOnServices'),
        icon: PlusCircle,
        href: '/admin/services/add-ons',
        permission: `${Module.SERVICES}.${Action.VIEW}`
      }
    ]
  },
  {
    title: t('admin.sidebar.applications'),
    icon: FileText,
    permission: `${Module.APPLICATIONS}.${Action.VIEW}`,
    children: [
      {
        title: t('admin.sidebar.createApplication'),
        icon: Layers,
        href: '/admin/services/wizards',
        permission: `${Module.SERVICES}.${Action.VIEW}`
      },
      {
        title: t('admin.sidebar.allApplications'),
        icon: FileText,
        href: '/admin/applications',
        permission: `${Module.APPLICATIONS}.${Action.VIEW}`
      }
    ]
  },
  {
    title: t('admin.sidebar.documents'),
    icon: FolderOpen,
    permission: `${Module.DOCUMENTS}.${Action.VIEW}`,
    children: [
      {
        title: t('admin.sidebar.documentLibrary'),
        icon: FolderOpen,
        href: '/admin/documents',
        permission: `${Module.DOCUMENTS}.${Action.VIEW}`
      },
      {
        title: t('admin.sidebar.uploadDocuments'),
        icon: FileText,
        href: '/admin/documents/upload',
        permission: `${Module.DOCUMENTS}.${Action.CREATE}`
      },
      {
        title: t('admin.sidebar.documentTemplates'),
        icon: FileCheck,
        href: '/admin/documents/templates',
        permission: `${Module.DOCUMENTS}.${Action.VIEW}`
      },
      {
        title: t('admin.sidebar.archivedDocuments'),
        icon: Archive,
        href: '/admin/documents/archived',
        permission: `${Module.DOCUMENTS}.${Action.VIEW}`
      }
    ]
  },
  // ✅ MOVED: Collaborator Management is now a top-level item
  {
    title: t('admin.sidebar.collaboratorManagement'),
    icon: UserCog,
    href: '/admin/collaborators',
    permission: `${Module.COLLABORATORS}.${Action.VIEW}`
  },
  {
    title: t('admin.sidebar.teamManagement'),
    icon: Users,
    permission: `${Module.TEAM}.${Action.VIEW}`,
    children: [
      {
        title: t('admin.sidebar.users'),
        icon: Users,
        href: '/admin/users',
        permission: `${Module.USER_MANAGEMENT}.${Action.VIEW}`
      },
      {
        title: t('admin.sidebar.teamMembers'),
        icon: Users,
        href: '/admin/team',
        permission: `${Module.USER_MANAGEMENT}.${Action.VIEW}`
      },
      {
        title: t('admin.sidebar.rolesPermissions'),
        icon: Shield,
        href: '/admin/team/roles',
        permission: `${Module.ROLE_MANAGEMENT}.${Action.VIEW}`
      },
      {
        title: t('admin.sidebar.performance'),
        icon: BarChart3,
        href: '/admin/team/performance',
        permission: `${Module.TEAM}.${Action.VIEW}`
      }
    ]
  },
  {
    title: t('admin.sidebar.financial'),
    icon: DollarSign,
    permission: `${Module.FINANCIAL}.${Action.VIEW}`,
    children: [
      {
        title: t('admin.sidebar.revenueOverview'),
        icon: DollarSign,
        href: '/admin/financial/revenue',
        permission: `${Module.FINANCIAL}.${Action.VIEW}`
      },
      {
        title: t('admin.sidebar.invoices'),
        icon: FileText,
        href: '/admin/financial/invoices',
        permission: `${Module.INVOICES}.${Action.VIEW}`
      },
      {
        title: t('admin.sidebar.payments'),
        icon: DollarSign,
        href: '/admin/financial/payments',
        permission: `${Module.PAYMENTS}.${Action.VIEW}`
      },
      {
        title: t('admin.sidebar.expenses'),
        icon: TrendingUp,
        href: '/admin/financial/expenses',
        permission: `${Module.EXPENSES}.${Action.VIEW}`
      }
    ]
  },
  {
    title: t('admin.sidebar.messages'),
    icon: MessageSquare,
    permission: `${Module.MESSAGES}.${Action.VIEW}`,
    children: [
      {
        title: t('admin.sidebar.inbox'),
        icon: Mail,
        href: '/admin/messages/inbox',
        permission: `${Module.MESSAGES}.${Action.VIEW}`
      },
      {
        title: t('admin.sidebar.supportMessaging'),
        icon: HelpCircle,
        href: '/admin/messages/support',
        permission: `${Module.SUPPORT}.${Action.VIEW}`
      },
      {
        title: t('admin.sidebar.templates'),
        icon: FileText,
        href: '/admin/messages/templates',
        permission: `${Module.MESSAGES}.${Action.VIEW}`
      }
    ]
  },
  {
    title: t('admin.sidebar.reports'),
    icon: BarChart3,
    permission: `${Module.REPORTS}.${Action.VIEW}`,
    children: [
      {
        title: t('admin.sidebar.clientReports'),
        icon: Users,
        href: '/admin/reports/clients',
        permission: `${Module.REPORTS}.${Action.VIEW}`
      },
      {
        title: t('admin.sidebar.applicationReports'),
        icon: FileText,
        href: '/admin/reports/applications',
        permission: `${Module.REPORTS}.${Action.VIEW}`
      },
      {
        title: t('admin.sidebar.financialReports'),
        icon: DollarSign,
        href: '/admin/reports/financial',
        permission: `${Module.REPORTS}.${Action.VIEW}`
      },
      {
        title: t('admin.sidebar.performanceReports'),
        icon: BarChart3,
        href: '/admin/reports/performance',
        permission: `${Module.REPORTS}.${Action.VIEW}`
      },
      {
        title: t('admin.sidebar.leadsByCountry'),
        icon: Globe,
        href: '/admin/reports/leads-by-country',
        permission: `${Module.REPORTS}.${Action.VIEW}`
      }
    ]
  },
  {
    title: t('admin.sidebar.settings'),
    icon: Settings,
    permission: `${Module.SETTINGS}.${Action.VIEW}`,
    children: [
      {
        title: t('admin.sidebar.generalSettings'),
        icon: Settings,
        href: '/admin/settings/general',
        permission: `${Module.SETTINGS}.${Action.VIEW}`
      },
      {
        title: t('admin.sidebar.systemConfiguration'),
        icon: Shield,
        href: '/admin/settings/system',
        permission: `${Module.SETTINGS}.${Action.MANAGE}`
      },
      {
        title: t('admin.sidebar.emailSettings'),
        icon: Mail,
        href: '/admin/settings/email',
        permission: `${Module.SETTINGS}.${Action.VIEW}`
      },
      {
        title: t('admin.sidebar.paymentGateway'),
        icon: CreditCard,
        href: '/admin/settings/payment-gateway',
        permission: `${Module.SETTINGS}.${Action.MANAGE}`
      },
      {
        title: t('admin.sidebar.aiChatbot'),
        icon: Bot,
        href: '/admin/settings/chatbot',
        permission: `${Module.SETTINGS}.${Action.MANAGE}`
      },
      {
        title: t('admin.sidebar.databaseConnection'),
        icon: Database,
        href: '/admin/settings/database',
        permission: `${Module.SETTINGS}.${Action.MANAGE}`
      },
      {
        title: t('admin.sidebar.notificationEvents'),
        icon: Bell,
        href: '/admin/notifications/events',
        permission: `${Module.SETTINGS}.${Action.MANAGE}`
      },
      {
        title: t('admin.sidebar.backupRestore'),
        icon: Archive,
        href: '/admin/settings/backup',
        permission: `${Module.SETTINGS}.${Action.MANAGE}`
      }
    ]
  },
  {
    title: t('admin.sidebar.audit'),
    icon: History,
    permission: `${Module.AUDIT}.${Action.VIEW}`,
    children: [
      {
        title: t('admin.sidebar.auditLogs'),
        icon: History,
        href: '/admin/audit-logs',
        permission: `${Module.AUDIT}.${Action.VIEW}`
      },
      {
        title: t('admin.sidebar.userActivity'),
        icon: Activity,
        href: '/admin/audit-logs/activity',
        permission: `${Module.AUDIT}.${Action.VIEW}`
      }
    ]
  },
  {
    title: t('admin.sidebar.helpSupport'),
    icon: HelpCircle,
    permission: `${Module.HELP}.${Action.VIEW}`,
    children: [
      {
        title: t('admin.sidebar.documentation'),
        icon: FileText,
        href: '/admin/help/docs',
        permission: `${Module.HELP}.${Action.VIEW}`
      },
      {
        title: t('admin.sidebar.faq'),
        icon: HelpCircle,
        href: '/admin/help/faq',
        permission: `${Module.HELP}.${Action.VIEW}`
      },
      {
        title: t('admin.sidebar.contactSupport'),
        icon: Phone,
        href: '/admin/help/contact',
        permission: `${Module.HELP}.${Action.VIEW}`
      }
    ]
  }
]

export function PermissionAwareSidebar({ className, isCollapsed = false, onToggle }: PermissionAwareSidebarProps) {
  const pathname = usePathname()
  const { user } = useAuth()
  const { t } = useLocale()
  const [openItems, setOpenItems] = useState<string[]>([])
  const [permissionChecker, setPermissionChecker] = useState<PermissionChecker | null>(null)
  
  // Component instance ID for stable keys
  const componentId = useRef(`sidebar-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`).current

  // Initialize permission checker for staff/admin (sidebar visibility is role/permission-based)
  useEffect(() => {
    if (user && (user.role === 'STAFF' || user.role === 'ADMIN')) {
      const permissions = user.permissions || []
      const checker = new PermissionChecker(permissions as any, user.role, user.staffType || 'ADMIN')
      setPermissionChecker(checker)
    }
  }, [user])

  // Load saved state from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('admin-sidebar-open-items')
      if (saved) {
        try {
          const parsedItems = JSON.parse(saved)
          if (Array.isArray(parsedItems)) {
            setOpenItems(parsedItems)
          }
        } catch (e) {
          // Clear invalid data
          localStorage.removeItem('admin-sidebar-open-items')
        }
      }
    }
  }, [])

  // Save state to localStorage whenever openItems changes (debounced)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const timeoutId = setTimeout(() => {
        localStorage.setItem('admin-sidebar-open-items', JSON.stringify(openItems))
      }, 100) // Debounce to prevent excessive writes
      
      return () => clearTimeout(timeoutId)
    }
  }, [openItems])


  const toggleItem = useCallback((title: string) => {
    setOpenItems(prev => {
      // If clicking an open item, close it
      if (prev.includes(title)) {
        return []
      } else {
        // Otherwise, close all others and open only this one
        return [title]
      }
    })
  }, [])

  // Filter sidebar items based on user permissions
  const getFilteredSidebarItems = useCallback((): SidebarItem[] => {
    if (!permissionChecker) return []

    const ALL_SIDEBAR_ITEMS = createSidebarItems(t)

    // Hide applications, financials, reports, and documents sections
    const hiddenModuleTitles = [
      t('admin.sidebar.financial'),
      t('admin.sidebar.reports'),
      t('admin.sidebar.documents')
    ]

    const filtered = ALL_SIDEBAR_ITEMS
      .map(item => {
        // Skip items that are in the hidden list
        if (hiddenModuleTitles.includes(item.title)) {
          return null
        }
        if (item.permission && !permissionChecker.hasPermission(item.permission as any)) return null
        
        const filteredChildren = item.children?.filter(child => {
          if (child.permission && !permissionChecker.hasPermission(child.permission as any)) return false
          return true
        })
        
        if (item.children && item.children.length > 0 && (!filteredChildren || filteredChildren.length === 0)) return null
        
        return { ...item, children: filteredChildren }
      })
      .filter(Boolean) as SidebarItem[]

    return filtered
  }, [permissionChecker, t])

  const filteredItems = useMemo(() => {
    return getFilteredSidebarItems()
  }, [getFilteredSidebarItems])

  const renderSidebarItem = useCallback((item: SidebarItem, depth = 0) => {
    const isActive = item.href && pathname === item.href
    const hasChildren = item.children && item.children.length > 0
    const isOpen = openItems.includes(item.title)
    const Icon = item.icon

    if (hasChildren) {
      return (
        <div>
          <div
            className={cn(
              'flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              depth > 0 && 'ms-4',
              isActive && 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100',
              isCollapsed && depth === 0 && 'justify-center'
            )}
            onClick={() => toggleItem(item.title)}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Icon className="h-4 w-4 flex-shrink-0" />
              {!isCollapsed && (
                <>
                  <span className="truncate">{item.title}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </>
              )}
            </div>
            {!isCollapsed && (
              <div className="flex-shrink-0">
                <ChevronDown className={cn(
                  'h-4 w-4 transition-transform duration-300 ease-in-out',
                  isOpen ? 'rotate-0' : 'ltr:-rotate-90 rtl:rotate-90'
                )} />
              </div>
            )}
          </div>

          {!isCollapsed && (
            <div 
              className={cn(
                'ms-4 mt-1 space-y-1 overflow-hidden transition-all duration-300 ease-in-out',
                isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
              )}
            >
              {item.children!.map((child, index) => (
                <div 
                  key={`${child.title}-${depth}-${index}`}
                  className={`transition-all duration-200 ease-in-out ${
                    isOpen ? 'translate-y-0' : '-translate-y-2'
                  }`}
                  style={{ transitionDelay: isOpen ? `${index * 50}ms` : '0ms' }}
                >
                  {renderSidebarItem(child, depth + 1)}
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    // For items with href (leaf nodes)
    return (
      <Link href={item.href || '#'}>
        <div
          className={cn(
            'flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            depth > 0 && 'ms-4',
            isActive && 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100',
            isCollapsed && depth === 0 && 'justify-center'
          )}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Icon className="h-4 w-4 flex-shrink-0" />
            {!isCollapsed && (
              <>
                <span className="truncate">{item.title}</span>
                {item.badge && (
                  <Badge variant="secondary" className="text-xs">
                    {item.badge}
                  </Badge>
                )}
              </>
            )}
          </div>
        </div>
      </Link>
    )
  }, [pathname, openItems, isCollapsed, toggleItem])

  if (!user || user.role !== 'STAFF') {
    return null
  }

  return (
    <div className={cn(
      'flex flex-col h-full bg-white border-r border-gray-200 dark:bg-[#1b1b1c] dark:border-border transition-all duration-300 ease-in-out',
      'rtl:border-r-0 rtl:border-l',
      'lg:relative lg:translate-x-0',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 border-b border-gray-200 dark:border-border">
        <div className={cn(
          'flex items-center gap-3 transition-all duration-300 ease-in-out',
          isCollapsed ? 'opacity-0 scale-0 w-0' : 'opacity-100 scale-100'
        )}>
          <div className="flex-shrink-0 h-[84px] flex items-center">
            <Image
              src="/logo-horizontal.png"
              alt="Tabadl Alkon"
              width={150}
              height={50}
              className="h-8 w-auto"
              priority
            />
          </div>
        </div>
        {onToggle && (
          <div className="h-[84px] flex items-center flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="p-2"
            >
              {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {filteredItems.map((item, index) => (
          <div key={`${item.title}-${index}`}>
            {renderSidebarItem(item)}
          </div>
        ))}
      </nav>

    </div>
  )
}