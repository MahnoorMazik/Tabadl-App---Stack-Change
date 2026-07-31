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
  Archive, Settings, Shield, Phone, ClipboardList, LayoutDashboard, CreditCard, Bot,
  ChevronDown, ChevronRight, Menu, Calculator, Receipt, 
  PieChart, TrendingDown, Building, Bell, Calendar, Eye, Upload,
  AlertCircle, Clock, ListTodo, UserCircle, LogOut, Globe, Briefcase, Package, PlusCircle, Layers
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import axios from 'axios'

interface SidebarItem {
  title: string
  icon: React.ComponentType<{ className?: string }>
  href?: string
  badge?: string
  permission?: string
  children?: SidebarItem[]
  priority?: number // For ordering
}

interface DynamicSidebarProps {
  className?: string
  isCollapsed?: boolean
  onToggle?: () => void
}

// Icon mapping for modules
const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  [Module.DASHBOARD]: BarChart3,
  [Module.CLIENTS]: Users,
  [Module.LEADS]: UserPlus,
  [Module.APPLICATIONS]: FileText,
  [Module.DOCUMENTS]: FolderOpen,
  [Module.TEAM]: Users,
  [Module.FINANCIAL]: DollarSign,
  [Module.MESSAGES]: MessageSquare,
  [Module.REPORTS]: BarChart3,
  [Module.SETTINGS]: Settings,
  [Module.HELP]: HelpCircle,
  [Module.USER_MANAGEMENT]: UserCircle,
  [Module.ROLE_MANAGEMENT]: Shield,
  [Module.SUPPORT]: HelpCircle,
  [Module.TASKS]: CheckCircle,
  [Module.INVOICES]: Receipt,
  [Module.PAYMENTS]: CreditCard,
  [Module.EXPENSES]: TrendingDown,
  [Module.ANALYTICS]: PieChart,
  [Module.SERVICES]: Briefcase,
  [Module.AUDIT]: Eye,
}

// Module display names
const MODULE_NAMES: Record<string, string> = {
  [Module.DASHBOARD]: 'Dashboard',
  [Module.CLIENTS]: 'Client Management',
  [Module.LEADS]: 'Lead Management',
  [Module.APPLICATIONS]: 'Applications',
  [Module.DOCUMENTS]: 'Documents',
  [Module.TEAM]: 'Team Management',
  [Module.FINANCIAL]: 'Financial',
  [Module.MESSAGES]: 'Messages',
  [Module.REPORTS]: 'Reports',
  [Module.SETTINGS]: 'Settings',
  [Module.HELP]: 'Help & Support',
  [Module.USER_MANAGEMENT]: 'User Management',
  [Module.ROLE_MANAGEMENT]: 'Role Management',
  [Module.SUPPORT]: 'Support',
  [Module.TASKS]: 'Tasks',
  [Module.INVOICES]: 'Invoices',
  [Module.PAYMENTS]: 'Payments',
  [Module.EXPENSES]: 'Expenses',
  [Module.ANALYTICS]: 'Analytics',
  [Module.SERVICES]: 'Services',
  [Module.AUDIT]: 'Audit',
}

// Module priorities for ordering
const MODULE_PRIORITIES: Record<string, number> = {
  [Module.DASHBOARD]: 1,
  [Module.CLIENTS]: 2,
  [Module.LEADS]: 3,
  [Module.APPLICATIONS]: 4,
  [Module.DOCUMENTS]: 5,
  [Module.TEAM]: 6,
  [Module.FINANCIAL]: 7,
  [Module.MESSAGES]: 8,
  [Module.REPORTS]: 9,
  [Module.SETTINGS]: 10,
  [Module.HELP]: 11,
  [Module.USER_MANAGEMENT]: 12,
  [Module.ROLE_MANAGEMENT]: 13,
  [Module.SUPPORT]: 14,
  [Module.EXPENSES]: 18,
  [Module.ANALYTICS]: 19,
  [Module.SERVICES]: 5,
  [Module.AUDIT]: 20,
}

// Sub-items for each module
const MODULE_SUBITEMS: Record<string, SidebarItem[]> = {
  [Module.CLIENTS]: [
    { title: 'All Clients', icon: Users, href: '/admin/clients', permission: `${Module.CLIENTS}.${Action.VIEW}` },
    { title: 'Lead Management', icon: UserPlus, href: '/admin/leads', permission: `${Module.LEADS}.${Action.VIEW}` },
    { title: 'Client Groups', icon: FolderOpen, href: '/admin/clients/groups', permission: `${Module.CLIENTS}.${Action.VIEW}` },
    { title: 'Import Clients', icon: UserPlus, href: '/admin/clients/import', permission: `${Module.CLIENTS}.${Action.IMPORT}` }
  ],
  [Module.APPLICATIONS]: [
    { title: 'Create Application', icon: Layers, href: '/admin/services/wizards', permission: `${Module.SERVICES}.${Action.VIEW}` },
    { title: 'All Applications', icon: FileText, href: '/admin/applications', permission: `${Module.APPLICATIONS}.${Action.VIEW}` },
    
  ],
  [Module.SERVICES]: [
    { title: 'Services Catalog', icon: Briefcase, href: '/admin/services', permission: `${Module.SERVICES}.${Action.VIEW}` },
    { title: 'Packages', icon: Package, href: '/admin/services/packages', permission: `${Module.SERVICES}.${Action.VIEW}` },
    { title: 'Add-on Services', icon: PlusCircle, href: '/admin/services/add-ons', permission: `${Module.SERVICES}.${Action.VIEW}` },
  ],
  [Module.DOCUMENTS]: [
    { title: 'Document Library', icon: FolderOpen, href: '/admin/documents', permission: `${Module.DOCUMENTS}.${Action.VIEW}` },
    { title: 'Upload Documents', icon: FileText, href: '/admin/documents/upload', permission: `${Module.DOCUMENTS}.${Action.CREATE}` },
    { title: 'Leads Documents', icon: FileCheck, href: '/admin/documents/leads', permission: `${Module.DOCUMENTS}.${Action.VIEW}` },
    { title: 'Document Templates', icon: FileCheck, href: '/admin/documents/templates', permission: `${Module.DOCUMENTS}.${Action.VIEW}` },
    { title: 'Archived Documents', icon: Archive, href: '/admin/documents/archived', permission: `${Module.DOCUMENTS}.${Action.VIEW}` }
  ],
  [Module.TEAM]: [
    { title: 'Users', icon: Users, href: '/admin/users', permission: `${Module.USER_MANAGEMENT}.${Action.VIEW}` },
    { title: 'Team Members', icon: Users, href: '/admin/team', permission: `${Module.USER_MANAGEMENT}.${Action.VIEW}` },
    { title: 'Roles & Permissions', icon: Shield, href: '/admin/team/roles', permission: `${Module.ROLE_MANAGEMENT}.${Action.VIEW}` },
    { title: 'Performance', icon: BarChart3, href: '/admin/team/performance', permission: `${Module.TEAM}.${Action.VIEW}` }
  ],
  [Module.FINANCIAL]: [
    { title: 'Revenue Overview', icon: DollarSign, href: '/admin/financial/revenue', permission: `${Module.FINANCIAL}.${Action.VIEW}` },
    { title: 'Invoices', icon: Receipt, href: '/admin/financial/invoices', permission: `${Module.INVOICES}.${Action.VIEW}` },
    { title: 'Payments', icon: CreditCard, href: '/admin/financial/payments', permission: `${Module.PAYMENTS}.${Action.VIEW}` },
    { title: 'Expenses', icon: TrendingDown, href: '/admin/financial/expenses', permission: `${Module.EXPENSES}.${Action.VIEW}` }
  ],
  [Module.MESSAGES]: [
    { title: 'Inbox', icon: Mail, href: '/admin/messages/inbox', permission: `${Module.MESSAGES}.${Action.VIEW}` },
    { title: 'Support Messaging', icon: HelpCircle, href: '/admin/messages/support', permission: `${Module.SUPPORT}.${Action.VIEW}` },
    { title: 'Templates', icon: FileText, href: '/admin/messages/templates', permission: `${Module.MESSAGES}.${Action.VIEW}` }
  ],
  [Module.REPORTS]: [
    { title: 'Client Reports', icon: Users, href: '/admin/reports/clients', permission: `${Module.REPORTS}.${Action.VIEW}` },
    { title: 'Application Reports', icon: FileText, href: '/admin/reports/applications', permission: `${Module.REPORTS}.${Action.VIEW}` },
    { title: 'Financial Reports', icon: DollarSign, href: '/admin/reports/financial', permission: `${Module.REPORTS}.${Action.VIEW}` },
    { title: 'Performance Reports', icon: BarChart3, href: '/admin/reports/performance', permission: `${Module.REPORTS}.${Action.VIEW}` },
    { title: 'Leads by Country', icon: Globe, href: '/admin/reports/leads-by-country', permission: `${Module.REPORTS}.${Action.VIEW}` }
  ],
  [Module.SETTINGS]: [
    { title: 'General Settings', icon: Settings, href: '/admin/settings/general', permission: `${Module.SETTINGS}.${Action.VIEW}` },
    { title: 'System Configuration', icon: Shield, href: '/admin/settings/system', permission: `${Module.SETTINGS}.${Action.MANAGE}` },
    { title: 'Email Settings', icon: Mail, href: '/admin/settings/email', permission: `${Module.SETTINGS}.${Action.VIEW}` },
    { title: 'Payment Gateway', icon: CreditCard, href: '/admin/settings/payment-gateway', permission: `${Module.SETTINGS}.${Action.MANAGE}` },
    { title: 'AI Chatbot', icon: Bot, href: '/admin/settings/chatbot', permission: `${Module.SETTINGS}.${Action.MANAGE}` },
    { title: 'Backup & Restore', icon: Archive, href: '/admin/settings/backup', permission: `${Module.SETTINGS}.${Action.MANAGE}` }
  ],
  [Module.HELP]: [
    { title: 'Documentation', icon: FileText, href: '/admin/help/docs', permission: `${Module.HELP}.${Action.VIEW}` },
    { title: 'FAQ', icon: HelpCircle, href: '/admin/help/faq', permission: `${Module.HELP}.${Action.VIEW}` },
    { title: 'Contact Support', icon: Phone, href: '/admin/help/contact', permission: `${Module.HELP}.${Action.VIEW}` }
  ]
}

export function DynamicSidebar({ className, isCollapsed = false, onToggle }: DynamicSidebarProps) {
  const pathname = usePathname()
  const { user } = useAuth()
  const [openItems, setOpenItems] = useState<string[]>([])
  const [stats, setStats] = useState<any>({})
  const [permissionChecker, setPermissionChecker] = useState<PermissionChecker | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Component instance ID for stable keys
  const componentId = useRef(`dynamic-sidebar-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`).current

  // Initialize permission checker for staff/admin (visibility is role/permission-based)
  useEffect(() => {
    if (user && (user.role === 'STAFF' || user.role === 'ADMIN')) {
      const permissions = user.permissions || []
      const checker = new PermissionChecker(permissions as any, user.role, user.staffType || 'ADMIN')
      setPermissionChecker(checker)
      setLoading(false)
    } else if (user && user.role === 'CLIENT') {
      setLoading(false)
    }
  }, [user])

  // Load saved state from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dynamic-sidebar-open-items')
      if (saved) {
        try {
          const parsedItems = JSON.parse(saved)
          if (Array.isArray(parsedItems)) {
            setOpenItems(parsedItems)
          }
        } catch (e) {
          // Clear invalid data
          localStorage.removeItem('dynamic-sidebar-open-items')
        }
      }
    }
    // Fetch stats
    fetchStats()
  }, [])

  // Save state to localStorage whenever openItems changes (debounced)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const timeoutId = setTimeout(() => {
        localStorage.setItem('dynamic-sidebar-open-items', JSON.stringify(openItems))
      }, 100) // Debounce to prevent excessive writes
      
      return () => clearTimeout(timeoutId)
    }
  }, [openItems])

  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth-token')
      if (token) {
        const response = await axios.get('/api/sidebar/stats', {
          headers: { Authorization: `Bearer ${token}` }
        })
        setStats(response.data.stats || {})
      }
    } catch (error) {
      console.error('Error fetching sidebar stats:', error)
      // Set default stats on error to prevent undefined state
      setStats({ 
        clients: 0, 
        applications: 0,
        totalRevenue: 0,
        pendingPayments: 0
      })
    }
  }, [])

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

  // Generate sidebar items dynamically based on permissions
  const generateSidebarItems = useCallback((): SidebarItem[] => {
    if (!permissionChecker) return []

    const accessibleModules = permissionChecker.getAccessibleModules()
    
    // Hide financials, reports, and documents modules (Applications is visible)
    const hiddenModules = [Module.FINANCIAL, Module.REPORTS, Module.DOCUMENTS]
    const filteredModules = accessibleModules.filter(module => !hiddenModules.includes(module))
    
    return filteredModules
      .map(module => {
        const moduleName = MODULE_NAMES[module]
        const moduleIcon = MODULE_ICONS[module]
        const modulePriority = MODULE_PRIORITIES[module]
        const subItems = MODULE_SUBITEMS[module] || []

        // Filter sub-items based on permissions
        const accessibleSubItems = subItems.filter(subItem => {
          if (subItem.permission && !permissionChecker.hasPermission(subItem.permission as any)) {
            return false
          }
          return true
        })

        // If no sub-items are accessible, create a direct link
        if (accessibleSubItems.length === 0) {
          return {
            title: moduleName,
            icon: moduleIcon,
            href: getModuleDefaultHref(module),
            permission: `${module}.${Action.VIEW}`,
            priority: modulePriority
          }
        }

        return {
          title: moduleName,
          icon: moduleIcon,
          permission: `${module}.${Action.VIEW}`,
          priority: modulePriority,
          children: accessibleSubItems
        }
      })
      .sort((a, b) => (a.priority || 999) - (b.priority || 999))
      .filter((item, index, array) => {
        // Remove any duplicate items that might be showing at the bottom
        // This ensures we only show the hierarchical structure
        // Check if this item is a duplicate of a sub-item
        const isDuplicate = array.some((otherItem, otherIndex) => {
          if (otherIndex === index) return false
          if (!otherItem.children) return false
          
          return otherItem.children.some(child => 
            child.title === item.title && child.href === item.href
          )
        })
        
        return !isDuplicate
      })
  }, [permissionChecker])

  // Get default href for a module
  const getModuleDefaultHref = (module: string): string => {
    const defaultHrefs: Record<string, string> = {
      [Module.DASHBOARD]: '/admin/dashboard',
      [Module.CLIENTS]: '/admin/clients',
      [Module.LEADS]: '/admin/leads',
      [Module.APPLICATIONS]: '/admin/applications',
      [Module.DOCUMENTS]: '/admin/documents',
      [Module.TEAM]: '/admin/team',
      [Module.FINANCIAL]: '/admin/financial/revenue',
      [Module.MESSAGES]: '/admin/messages/inbox',
      [Module.REPORTS]: '/admin/reports/clients',
      [Module.SETTINGS]: '/admin/settings/general',
      [Module.HELP]: '/admin/help/docs',
      [Module.SERVICES]: '/admin/services',
    }
    return defaultHrefs[module] || '/admin/dashboard'
  }

  const sidebarItems = useMemo(() => {
    return generateSidebarItems()
  }, [generateSidebarItems])

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

  // Show loading state
  if (loading) {
    return (
      <div className={cn('flex flex-col h-full bg-white border-r border-gray-200 dark:bg-[#1b1b1c] dark:border-border rtl:border-r-0 rtl:border-l', className)}>
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // Client users get a simple dashboard link
  if (user.role === 'CLIENT') {
    return (
      <div className={cn('flex flex-col h-full bg-white border-r border-gray-200 dark:bg-[#1b1b1c] dark:border-border rtl:border-r-0 rtl:border-l', className)}>
        <div className="flex items-center justify-center p-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-amber-600 hover:text-amber-700">
            <LayoutDashboard className="h-6 w-6" />
            <span className="font-semibold">Dashboard</span>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col h-full bg-white border-r border-gray-200 dark:bg-[#1b1b1c] dark:border-border rtl:border-r-0 rtl:border-l transition-all duration-300 ease-in-out', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 border-b border-gray-200 dark:border-border">
        <div className={cn('flex items-center gap-3 transition-all duration-300 ease-in-out', isCollapsed ? 'opacity-0 scale-0' : 'opacity-100 scale-100')}>
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
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {sidebarItems.map((item, index) => (
          <div key={`${item.title}-${index}`}>
            {renderSidebarItem(item)}
          </div>
        ))}
      </nav>

      {/* Stats */}
      {!isCollapsed && (
        <div className="p-4 border-t border-gray-200 dark:border-border">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.clients || 0}</div>
              <div className="text-xs text-gray-500 dark:text-muted-foreground">Clients</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.applications || 0}</div>
              <div className="text-xs text-gray-500 dark:text-muted-foreground">Applications</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
