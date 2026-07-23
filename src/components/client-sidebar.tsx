'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import axios from 'axios'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useLocale } from '@/contexts/LocaleContext'
import { 
  ChevronDown,
  LayoutDashboard,
  FileText,
  Calendar,
  MessageSquare,
  HelpCircle,
  Upload,
  Eye,
  Clock,
  CheckCircle,
  Folder,
  Menu,
  X,
  ClipboardList,
  FileCheck,
  AlertCircle,
  Receipt,
  User,
} from 'lucide-react'

interface SidebarItem {
  title: string
  icon?: React.ComponentType<{ className?: string }>
  href?: string
  badge?: string
  children?: SidebarItem[]
}

const createSidebarItems = (t: (key: string) => string): SidebarItem[] => [
  {
    title: t('client.sidebar.dashboard'),
    icon: LayoutDashboard,
    href: '/dashboard',
  },
  {
    title: 'Complete Profile',
    icon: User,
    href: '/client/profile',
  },
  {
    title: t('client.sidebar.applicationManagement'),
    icon: ClipboardList,
    children: [
      {
        title: t('client.sidebar.allApplications'),
        icon: FileText,
        href: '/client/applications',
      },
      {
        title: t('client.sidebar.timeline'),
        icon: Calendar,
        href: '/client/timeline',
      },
    ],
  },
  {
    title: t('client.sidebar.myDocuments'),
    icon: Folder,
    children: [
      {
        title: t('client.sidebar.allDocuments'),
        icon: FileText,
        href: '/client/documents',
      },
      {
        title: t('client.sidebar.uploadDocument'),
        icon: Upload,
        href: '/client/documents/upload',
      },
      {
        title: t('client.sidebar.pendingReview'),
        icon: Clock,
        href: '/client/documents/pending',
      },
      {
        title: t('client.sidebar.approved'),
        icon: CheckCircle,
        href: '/client/documents/approved',
      },
    ],
  },
  {
    title: t('client.sidebar.messages'),
    icon: MessageSquare,
    href: '/client/messages',
  },
  {
    title: 'My Invoices',
    icon: Receipt,
    href: '/client/invoices',
  },
  {
    title: t('client.sidebar.helpCenter'),
    icon: HelpCircle,
    children: [
      {
        title: t('client.sidebar.faq'),
        icon: HelpCircle,
        href: '/client/help/faq',
      },
      {
        title: t('client.sidebar.support'),
        icon: MessageSquare,
        href: '/client/help/support',
      },
    ],
  },
];

interface ClientSidebarProps {
  className?: string
  isCollapsed?: boolean
  onToggle?: () => void
}

export function ClientSidebar({ className, isCollapsed = false, onToggle }: ClientSidebarProps) {
  const pathname = usePathname()
  const { t } = useLocale()
  const [openItems, setOpenItems] = useState<string[]>([])
  const [stats, setStats] = useState<any>({})
  const sidebarItems = createSidebarItems(t)
  
  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      onToggle?.()
    }
  }, [pathname])

  // Load saved state from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('client-sidebar-open-items')
      if (saved) {
        try {
          setOpenItems(JSON.parse(saved))
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
    // Fetch stats
    fetchStats()
  }, [])

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
      // Set default stats on error
      setStats({ applications: 0, documents: 0 })
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

  // Save state to localStorage whenever openItems changes (debounced)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const timeoutId = setTimeout(() => {
        localStorage.setItem('client-sidebar-open-items', JSON.stringify(openItems))
      }, 100) // Debounce to prevent excessive writes
      
      return () => clearTimeout(timeoutId)
    }
  }, [openItems])

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  const getBadge = (href: string): string | null => {
    if (href === '/client/documents/pending') {
      return stats.pendingDocuments ? String(stats.pendingDocuments) : null
    }
    if (href === '/client/messages') {
      return stats.unreadMessages ? String(stats.unreadMessages) : null
    }
    return null
  }

  const renderSidebarItem = (item: SidebarItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isItemActive = item.href ? isActive(item.href) : false
    const isItemOpen = openItems.includes(item.title)

    if (hasChildren) {
      return (
        <div key={item.title} className="w-full">
          <Collapsible open={isItemOpen} onOpenChange={() => toggleItem(item.title)}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-between h-auto p-3 text-left hover:bg-accent",
                  isCollapsed && "justify-center p-2"
                )}
              >
                <div className="flex items-center gap-3">
                  {item.icon && (
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                  )}
                  {!isCollapsed && (
                    <span className="text-sm font-medium">{item.title}</span>
                  )}
                </div>
                {!isCollapsed && (
                  <ChevronDown 
                    className={cn(
                      "h-4 w-4 transition-transform duration-300 ease-in-out",
                      isItemOpen ? "rotate-0" : "ltr:-rotate-90 rtl:rotate-90"
                    )}
                  />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 transition-all duration-300 ease-in-out overflow-hidden">
              {!isCollapsed && (
                <div className="ms-4 mt-1 space-y-1">
                  {item.children?.map((child, index) => (
                    <div 
                      key={child.title}
                      className="transition-all duration-200 ease-in-out animate-in slide-in-from-left-2 fade-in-0"
                      style={{ 
                        animationDelay: `${index * 50}ms`,
                        animationFillMode: 'both'
                      }}
                    >
                      {renderSidebarItem(child, level + 1)}
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      )
    }

    return (
      <Link key={item.title} href={item.href || '#'}>
        <Button
          variant={isItemActive ? "secondary" : "ghost"}
          className={cn(
            "w-full justify-between h-auto p-3 text-left hover:bg-accent",
            isItemActive && "bg-accent",
            isCollapsed && "justify-center p-2"
          )}
        >
          <div className="flex items-center gap-3">
            {item.icon && (
              <item.icon className="h-4 w-4 flex-shrink-0" />
            )}
            {!isCollapsed && (
              <span className="text-sm font-medium">{item.title}</span>
            )}
          </div>
          {!isCollapsed && item.badge && (
            <span className="bg-emerald-700 text-white text-xs px-2 py-1 rounded-full">
              {item.badge}
            </span>
          )}
          {!isCollapsed && !item.badge && getBadge(item.href || '') && (
            <span className="bg-emerald-700 text-white text-xs px-2 py-1 rounded-full">
              {getBadge(item.href || '')}
            </span>
          )}
        </Button>
      </Link>
    )
  }

  return (
    <div className={cn(
      "flex flex-col h-full bg-white border-r transition-all duration-300 ease-in-out",
      "rtl:border-r-0 rtl:border-l",
      "lg:relative lg:translate-x-0",
      className
    )}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className={cn(
            "flex items-center gap-2 transition-all duration-300",
            isCollapsed && "opacity-0 scale-0 w-0"
          )}>
            <img src="/logo-horizontal.png" alt="TABADL ALKON" className="h-8 w-auto" />
          </div>
          {onToggle && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="p-1 h-8 w-8 flex-shrink-0"
            >
              {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          {sidebarItems.map((item) => renderSidebarItem(item))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t">
        {!isCollapsed && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <p className="text-sm font-medium text-emerald-900 mb-1">{t('client.sidebar.needHelp')}</p>
            <p className="text-xs text-emerald-700">{t('client.sidebar.contactManager')}</p>
          </div>
        )}
      </div>
    </div>
  )
}

