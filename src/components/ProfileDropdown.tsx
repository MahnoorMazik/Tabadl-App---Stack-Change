'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { toAvatarUrl } from '@/lib/avatar-utils'
import { getLocalizedText } from '@/lib/multilingual-text'
import { MAIN_ROLE_NAMES } from '@/lib/rbac'
import { 
  Settings, 
  LogOut, 
  HelpCircle,
  UserCircle
} from 'lucide-react'

type ClientInfo = {
  id: string
  name: string
  company: string | null
}

export function ProfileDropdown() {
  const { user, logout, update: refreshSession } = useAuth()
  const { t, locale } = useLocale()
  const [avatarFromDb, setAvatarFromDb] = useState<string | null>(null)
  const [customRoleFromDb, setCustomRoleFromDb] = useState<{ id: string; name: string } | null>(null)
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null)
  const [clientLoading, setClientLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setAvatarFromDb(null)
      setCustomRoleFromDb(null)
      return
    }
    let cancelled = false
    fetch('/api/auth/profile')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return
        if (data?.avatar != null) setAvatarFromDb(data.avatar)
        if (data?.customRole != null) setCustomRoleFromDb(data.customRole)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [user?.id])

  // ✅ Fetch client info for collaborators
  useEffect(() => {
    const fetchClientInfo = async () => {
      // Only fetch for collaborators
      if (user?.role !== 'COLLABORATOR') {
        setClientLoading(false)
        return
      }

      try {
        const res = await fetch('/api/collaborator/client-info')
        if (res.ok) {
          const data = await res.json()
          setClientInfo(data.data.client)
        }
      } catch (error) {
        console.error('Failed to fetch client info:', error)
      } finally {
        setClientLoading(false)
      }
    }

    if (user) {
      fetchClientInfo()
    }
  }, [user])

  useEffect(() => {
    if (!user) return
    const onAvatarUpdated = () => {
      refreshSession().then(() => {
        fetch('/api/auth/profile')
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.avatar != null) setAvatarFromDb(data.avatar)
            if (data?.customRole != null) setCustomRoleFromDb(data.customRole)
          })
          .catch(() => {})
      })
    }
    window.addEventListener('profileAvatarUpdated', onAvatarUpdated)
    return () => window.removeEventListener('profileAvatarUpdated', onAvatarUpdated)
  }, [user?.id, refreshSession])

  const avatarUrl = toAvatarUrl(avatarFromDb ?? user?.avatar ?? null)

  const handleLogout = async () => {
    const redirectTo = user?.role === 'CLIENT' ? '/login' : '/admin/login'
    await logout(redirectTo)
  }

  if (!user) return null

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleBadge = () => {
    if (user.role === 'COLLABORATOR') {
      return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs">Collaborator</Badge>
    }
    if (user.role === 'CLIENT') {
      return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs">{t('admin.clients.client')}</Badge>
    }
    const roleName = customRoleFromDb?.name ?? null
    const roleLabels: Record<string, string> = {
      [MAIN_ROLE_NAMES.ADMIN]: t('admin.team.roleAdmin'),
      [MAIN_ROLE_NAMES.CLIENTS]: t('admin.team.roleClients'),
      [MAIN_ROLE_NAMES.REPORTS]: t('admin.team.roleReports'),
      [MAIN_ROLE_NAMES.SUPPORT]: t('admin.team.roleSupport'),
    }
    const colors: Record<string, string> = {
      [MAIN_ROLE_NAMES.ADMIN]: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      [MAIN_ROLE_NAMES.CLIENTS]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      [MAIN_ROLE_NAMES.REPORTS]: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
      [MAIN_ROLE_NAMES.SUPPORT]: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    }
    const cls = roleName ? (colors[roleName] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300') : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    const label = roleName ? (roleLabels[roleName] ?? roleName) : t('profile.roleStaff')
    return <Badge className={`${cls} text-xs`}>{label}</Badge>
  }

  /** Avatar border color matching role/tag: Admin=purple, Clients=blue, Reports=emerald, Support=amber, Client=emerald, Collaborator=emerald, default=gray */
  const getAvatarBorderClass = (): string => {
    if (user.role === 'CLIENT' || user.role === 'COLLABORATOR') return 'border-emerald-200 dark:border-emerald-800'
    const roleName = customRoleFromDb?.name ?? null
    const borders: Record<string, string> = {
      [MAIN_ROLE_NAMES.ADMIN]: 'border-purple-200 dark:border-purple-800',
      [MAIN_ROLE_NAMES.CLIENTS]: 'border-blue-200 dark:border-blue-800',
      [MAIN_ROLE_NAMES.REPORTS]: 'border-emerald-200 dark:border-emerald-800',
      [MAIN_ROLE_NAMES.SUPPORT]: 'border-amber-200 dark:border-amber-800',
    }
    return roleName ? (borders[roleName] ?? 'border-gray-200 dark:border-gray-700') : 'border-gray-200 dark:border-gray-700'
  }

  const basePath = user.role === 'CLIENT' ? '/client' : user.role === 'COLLABORATOR' ? '/collaborator' : '/admin'

  const avatarBlock = (
    <Avatar className={`h-10 w-10 border ${getAvatarBorderClass()} cursor-pointer shrink-0`}>
      {avatarUrl ? (
        <AvatarImage
          src={avatarUrl}
          alt={displayName || 'Profile'}
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
      ) : null}
      <AvatarFallback className="bg-amber-100 text-amber-700 font-semibold">
        {displayName ? getInitials(displayName) : ''}
      </AvatarFallback>
    </Avatar>
  )

  const avatarBlockLarge = (
    <Avatar className="h-12 w-12">
      {avatarUrl ? (
        <AvatarImage
          src={avatarUrl}
          alt={displayName || 'Profile'}
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
      ) : null}
      <AvatarFallback className="bg-amber-100 text-amber-700 font-semibold text-lg">
        {displayName ? getInitials(displayName) : ''}
      </AvatarFallback>
    </Avatar>
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center space-x-3 hover:opacity-80 transition-opacity focus:outline-none cursor-pointer">
          {avatarBlock}
          <div className="hidden md:block text-left">
            <p className="text-sm font-semibold text-gray-900 dark:text-foreground">{displayName}</p>
            <p className="text-xs text-gray-500 dark:text-muted-foreground">{user.email}</p>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>
          <div className="flex items-center space-x-3">
            {avatarBlockLarge}
            <div className="flex-1">
              <p className="font-semibold text-gray-900 dark:text-foreground">{displayName}</p>
              <p className="text-xs text-gray-500 dark:text-muted-foreground">{user.email}</p>
              <div className="mt-1">
                {getRoleBadge()}
              </div>
              {/* ✅ Show Client Name for Collaborators - Without icon */}
              {user.role === 'COLLABORATOR' && !clientLoading && clientInfo && (
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    Working for: <span className="font-semibold text-emerald-800 dark:text-emerald-300">{clientInfo.company || clientInfo.name}</span>
                  </p>
                </div>
              )}
              {user.role === 'COLLABORATOR' && !clientLoading && !clientInfo && (
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    No client assigned yet
                  </p>
                </div>
              )}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`${basePath}/profile`} className="cursor-pointer">
            <UserCircle className="mr-2 h-4 w-4" />
            <span>{t('profile.myProfile')}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`${basePath}/settings/general`} className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>{t('admin.sidebar.settings')}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`${basePath}/help`} className="cursor-pointer">
            <HelpCircle className="mr-2 h-4 w-4" />
            <span>{t('admin.sidebar.helpSupport')}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleLogout}
          className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{t('auth.logout')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
