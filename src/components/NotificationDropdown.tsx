'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNotificationCount } from '@/contexts/NotificationContext'
import { useLocale } from '@/contexts/LocaleContext'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bell, Check, CheckCheck, MoreVertical, Pin, PinOff, Settings, Trash2, XCircle } from 'lucide-react'
import Link from 'next/link'
import axios from 'axios'
import { format } from 'date-fns'

interface Notification {
  id: string
  title: string
  content: string
  isRead: boolean
  isPinned?: boolean
  createdAt: string
}

export function NotificationDropdown() {
  const { user, token } = useAuth()
  const { t } = useLocale()
  const { unreadCount, setUnreadCount, refreshUnreadCount } = useNotificationCount()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)

  const fetchNotifications = useCallback(async () => {
    try {
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const response = await axios.get('/api/notifications', {
        headers,
        withCredentials: true,
      })
      // Handle structured response format: { success: true, data: { notifications: [...], unreadCount: 0 } }
      const notifs = response.data?.data?.notifications || response.data?.notifications || []
      const unread = response.data?.data?.unreadCount ?? response.data?.unreadCount ?? 0
      // Get only the latest 5 notifications
      setNotifications(notifs.slice(0, 5))
      setUnreadCount(unread)
    } catch (error) {
      console.error('Error fetching notifications:', error)
      // Set empty state on error
      setNotifications([])
      setUnreadCount(0)
    }
  }, [token, setUnreadCount])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const apiCall = useCallback(async (config: { method: string; url: string; data?: object }) => {
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    return axios({ ...config, headers, withCredentials: true })
  }, [token])

  // Helper to sync unread count from API response
  const syncUnreadCount = (response: any) => {
    const newUnreadCount = response.data?.data?.unreadCount ?? response.data?.unreadCount
    if (typeof newUnreadCount === 'number') {
      setUnreadCount(newUnreadCount)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await apiCall({
        method: 'POST',
        url: '/api/notifications',
        data: { notificationIds: [notificationId] },
      })
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, isRead: true } : notif
        )
      )
      syncUnreadCount(response)
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await apiCall({
        method: 'POST',
        url: '/api/notifications',
        data: { markAllAsRead: true },
      })
      setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })))
      syncUnreadCount(response)
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const removeAll = async () => {
    try {
      await apiCall({
        method: 'POST',
        url: '/api/notifications',
        data: { removeAll: true },
      })
      setNotifications([])
      setUnreadCount(0)
    } catch (error) {
      console.error('Error removing all notifications:', error)
    }
  }

  const togglePin = async (notificationId: string, currentlyPinned: boolean) => {
    try {
      await apiCall({
        method: 'POST',
        url: '/api/notifications',
        data: currentlyPinned ? { unpinIds: [notificationId] } : { pinIds: [notificationId] },
      })
      // Refetch to get correct order (pinned first) and accurate unread count
      await fetchNotifications()
    } catch (error) {
      console.error('Error toggling pin:', error)
    }
  }

  const removeNotification = async (notificationId: string, wasUnread: boolean) => {
    try {
      const response = await apiCall({ method: 'DELETE', url: `/api/notifications/${notificationId}` })
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId))
      const newUnread = response?.data?.data?.unreadCount
      if (typeof newUnread === 'number') setUnreadCount(newUnread)
      else await refreshUnreadCount()
    } catch (error) {
      console.error('Error removing notification:', error)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) markAsRead(notification.id)
  }

  const basePath = user?.role === 'CLIENT' ? '/client' : '/admin'

  return (
    <DropdownMenu open={isOpen} onOpenChange={(open) => {
      setIsOpen(open)
      if (open) fetchNotifications()
    }}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-semibold">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 max-h-[500px]">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base">{t('admin.sidebar.notifications') || 'Notifications'}</h3>
            {unreadCount > 0 && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {basePath === '/admin' && (
              <Link
                href="/admin/notifications/settings"
                onClick={() => setIsOpen(false)}
                className="inline-flex items-center justify-center rounded-md hover:bg-accent h-8 w-8 text-muted-foreground hover:text-foreground"
                title={t('admin.notifications.settings.title') || 'Notification settings'}
              >
                <Settings className="h-4 w-4" />
              </Link>
            )}
            {notifications.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                  {t('common.actions') || 'Actions'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {unreadCount > 0 && (
                  <DropdownMenuItem onClick={markAllAsRead}>
                    <CheckCheck className="h-4 w-4 mr-2" />
                    {t('admin.notifications.markAllRead') || 'Mark all as read'}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={removeAll}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {t('admin.notifications.removeAll') || 'Remove all'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            )}
          </div>
        </div>
        
        {notifications.length > 0 ? (
          <>
            <div className="max-h-[320px] overflow-y-auto">
              <div className="divide-y">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-accent/50 cursor-pointer transition-colors border-l-4 ${
                      !notification.isRead ? 'bg-blue-50/50 border-l-blue-500' : 'border-l-transparent'
                    } ${notification.isPinned ? 'bg-amber-50/50' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-medium truncate ${!notification.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {notification.title}
                          </p>
                          {notification.isPinned && (
                            <Pin className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                          )}
                          {!notification.isRead && (
                            <span className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 break-words">
                          {notification.content}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(notification.createdAt), 'MMM d, yyyy · h:mm a')}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          {!notification.isRead && (
                            <DropdownMenuItem onClick={() => markAsRead(notification.id)}>
                              <Check className="h-4 w-4 mr-2" />
                              {t('admin.notifications.markAsRead') || 'Mark as read'}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => togglePin(notification.id, !!notification.isPinned)}>
                            {notification.isPinned ? (
                              <><PinOff className="h-4 w-4 mr-2" />{t('admin.notifications.unpin') || 'Unpin'}</>
                            ) : (
                              <><Pin className="h-4 w-4 mr-2" />{t('admin.notifications.pin') || 'Pin'}</>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => removeNotification(notification.id, !notification.isRead)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('admin.notifications.remove') || 'Remove'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-3 border-t bg-muted/30 space-y-2">
              <Button 
                variant="ghost" 
                className="w-full justify-center text-sm h-9"
                onClick={() => {
                  setIsOpen(false)
                  router.push(`${basePath}/notifications`)
                }}
              >
                {t('admin.notifications.viewAll') || 'View All Notifications'}
              </Button>
              {basePath === '/admin' && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full justify-center text-sm h-8 border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                  onClick={async () => {
                    try {
                      const headers: Record<string, string> = {}
                      if (token) headers['Authorization'] = `Bearer ${token}`
                      const res = await fetch('/api/push/test', {
                        method: 'POST',
                        headers,
                        credentials: 'include',
                      })
                      const data = await res.json()
                      if (res.ok && data.success) {
                        fetchNotifications()
                        alert(data.message || t('admin.notifications.testSentHint') || 'Test notification sent. Check the bell panel.')
                      } else {
                        alert(data.message || data.error || t('admin.notifications.enablePushHint') || 'Enable push notifications first on the Notifications page')
                      }
                    } catch {
                      alert(t('admin.notifications.testFailed') || 'Failed to send test')
                    }
                  }}
                >
                  {t('admin.notifications.sendTestPush') || 'Send Test Push'}
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">{t('admin.notifications.noNotifications') || 'No notifications yet'}</p>
            {basePath === '/admin' && (
              <Button 
                variant="outline" 
                size="sm"
                className="mt-3 border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                onClick={async () => {
                  try {
                    const headers: Record<string, string> = {}
                    if (token) headers['Authorization'] = `Bearer ${token}`
                    const res = await fetch('/api/push/test', {
                      method: 'POST',
                      headers,
                      credentials: 'include',
                    })
                    const data = await res.json()
                    if (res.ok && data.success) {
                      fetchNotifications()
                      alert(data.message || t('admin.notifications.testSentHint') || 'Test notification sent. Check the bell panel.')
                    } else {
                      alert(data.message || data.error || t('admin.notifications.enablePushHint') || 'Enable push notifications first on the Notifications page')
                    }
                  } catch {
                    alert(t('admin.notifications.testFailed') || 'Failed to send test')
                  }
                }}
              >
                {t('admin.notifications.sendTestPush') || 'Send Test Push'}
              </Button>
            )}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

