'use client'

import { useState, useEffect } from 'react'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Bell, Check, CheckCheck, Loader2, MoreVertical, Pin, PinOff, Settings, Trash2, XCircle } from 'lucide-react'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'
import { useNotificationCount } from '@/contexts/NotificationContext'
import { format } from 'date-fns'
import { useLocale } from '@/contexts/LocaleContext'
import Link from 'next/link'
import { PushNotificationSettings } from '@/components/PushNotificationSettings'

type Filter = 'all' | 'unread' | 'pinned'

export default function NotificationsPage() {
  const { token } = useAuth()
  const { unreadCount, setUnreadCount, refreshUnreadCount } = useNotificationCount()
  const { t, formatNumber } = useLocale()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [testPushLoading, setTestPushLoading] = useState(false)
  const [testPushMessage, setTestPushMessage] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    fetchNotifications()
  }, [filter])

  const fetchNotifications = async () => {
    try {
      const params = new URLSearchParams()
      if (filter === 'unread') params.set('unreadOnly', 'true')
      if (filter === 'pinned') params.set('pinnedOnly', 'true')
      const url = `/api/notifications${params.toString() ? '?' + params.toString() : ''}`
      const response = await axios.get(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true,
      })
      const notifs = response.data?.data?.notifications || response.data?.notifications || []
      const unread = response.data?.data?.unreadCount ?? response.data?.unreadCount ?? 0
      setNotifications(notifs)
      setUnreadCount(unread)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const apiCall = (config: { method: string; url: string; data?: object }) => {
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    return axios({ ...config, headers, withCredentials: true })
  }

  // Helper to sync unread count from API response
  const syncUnreadCount = (response: any) => {
    const newUnreadCount = response.data?.data?.unreadCount ?? response.data?.unreadCount
    if (typeof newUnreadCount === 'number') {
      setUnreadCount(newUnreadCount)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await apiCall({
        method: 'POST',
        url: '/api/notifications',
        data: { markAllAsRead: true },
      })
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      syncUnreadCount(response)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const removeAll = async () => {
    if (!window.confirm(t('admin.notifications.removeAllConfirm') || 'Are you sure you want to remove all notifications? This cannot be undone.')) {
      return
    }
    try {
      await apiCall({
        method: 'POST',
        url: '/api/notifications',
        data: { removeAll: true },
      })
      setNotifications([])
      setUnreadCount(0)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      const response = await apiCall({
        method: 'POST',
        url: '/api/notifications',
        data: { notificationIds: [id] },
      })
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
      )
      syncUnreadCount(response)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const togglePin = async (id: string, currentlyPinned: boolean) => {
    try {
      const response = await apiCall({
        method: 'POST',
        url: '/api/notifications',
        data: currentlyPinned ? { unpinIds: [id] } : { pinIds: [id] },
      })
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isPinned: !currentlyPinned } : n))
      )
      syncUnreadCount(response)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const removeNotification = async (id: string, wasUnread: boolean) => {
    try {
      const response = await apiCall({ method: 'DELETE', url: `/api/notifications/${id}` })
      setNotifications(prev => prev.filter(n => n.id !== id))
      const newUnread = response?.data?.data?.unreadCount
      if (typeof newUnread === 'number') setUnreadCount(newUnread)
      else await refreshUnreadCount()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const sendTestPush = async () => {
    setTestPushMessage(null)
    setTestPushLoading(true)
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
        setTestPushMessage(data.message || 'Test notification sent')
      } else {
        setTestPushMessage(data.message || data.error || 'Failed to send test')
      }
    } catch {
      setTestPushMessage('Failed to send test notification')
    } finally {
      setTestPushLoading(false)
    }
  }

  return (
    <AdminPageTemplate
      title={t('admin.sidebar.notifications') || 'Notifications'}
      description={t('admin.notifications.description') || 'System notifications'}
      icon={<Bell className="h-6 w-6" />}
      showConstruction={false}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground" />
          <Link href="/admin/notifications/settings">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              {t('admin.notifications.settings.title') || 'Notification settings'}
            </Button>
          </Link>
        </div>

        {/* Push Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {t('admin.notifications.pushTitle') || 'Browser Push Notifications'}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {t('admin.notifications.pushDescription') || 'Enable push notifications to receive alerts even when the app is in the background.'}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <PushNotificationSettings />
            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="default"
                size="default"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={sendTestPush}
                disabled={testPushLoading}
              >
                {testPushLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {t('admin.notifications.sendTestPush') || 'Send Test Notification'}
              </Button>
              {testPushMessage && (
                <span className="text-sm text-muted-foreground">{testPushMessage}</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Header & Filters */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold">{t('admin.notifications.yourNotifications') || 'Notification History'}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">{formatNumber(unreadCount)} {t('admin.notifications.unreadNotifications') || 'unread'}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-lg border p-1">
              {(['all', 'unread', 'pinned'] as const).map((f) => (
                <Button
                  key={f}
                  variant={filter === f ? 'secondary' : 'ghost'}
                  size="sm"
                  className="capitalize"
                  onClick={() => setFilter(f)}
                >
                  {f === 'all' ? (t('admin.notifications.filterAll') || 'all') : f === 'unread' ? (t('admin.notifications.filterUnread') || 'unread') : (t('admin.notifications.filterPinned') || 'pinned')}
                </Button>
              ))}
            </div>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                <CheckCheck className="h-4 w-4 mr-1" />
                {t('admin.notifications.markAllRead') || 'Mark all read'}
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={removeAll}>
                <XCircle className="h-4 w-4 mr-1" />
                {t('admin.notifications.removeAll') || 'Remove all'}
              </Button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-8">{t('admin.notifications.loading') || 'Loading notifications...'}</div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{t('admin.notifications.noNotifications') || 'No notifications yet'}</p>
                <p className="text-sm mt-1">
                  {filter === 'unread' && (t('admin.notifications.noUnread') || 'No unread notifications')}
                  {filter === 'pinned' && (t('admin.notifications.noPinned') || 'No pinned notifications')}
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[600px]">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b flex items-start gap-3 ${
                      !notification.isRead ? 'bg-emerald-50/50' : ''
                    } ${notification.isPinned ? 'bg-amber-50/30' : ''}`}
                  >
                    <div className={`mt-1 flex-shrink-0 ${!notification.isRead ? 'text-emerald-600' : 'text-gray-400'}`}>
                      <Bell className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-semibold">{notification.title}</h4>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {notification.isPinned && (
                            <Pin className="h-4 w-4 text-amber-600" />
                          )}
                          {!notification.isRead && (
                            <Badge className="bg-emerald-600 text-xs">{t('common.new') || 'New'}</Badge>
                          )}
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {format(new Date(notification.createdAt), 'MMM d, yyyy · h:mm a')}
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
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
                      <p className="text-sm text-gray-600 mt-1">{notification.content}</p>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminPageTemplate>
  )
}
