'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, ChevronDown, ChevronRight, Loader2, Mail, MonitorSmartphone, Smartphone } from 'lucide-react'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Module, Action } from '@/lib/rbac'

interface EventSetting {
  eventType: string
  label: string
  description: string
  module: string
  sendEmail: boolean
  sendInApp: boolean
  sendPush: boolean
  recipients: 'assigned' | 'all_admins' | 'both'
  savedInDb: boolean
}

interface ModuleGroup {
  module: string
  events: EventSetting[]
}

export default function NotificationEventSettingsPage() {
  const { token } = useAuth()
  const { toast } = useToast()
  const [groups, setGroups] = useState<ModuleGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const headers = token ? { Authorization: `Bearer ${token}` } : {}

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/notification-event-settings', { headers })
      setGroups(res.data ?? [])
      const open: Record<string, boolean> = {}
      for (const g of res.data ?? []) open[g.module] = true
      setExpanded(open)
    } catch {
      toast({ title: 'Error', description: 'Failed to load notification settings', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchSettings()
  }, [token])

  const updateEvent = async (eventType: string, field: string, value: boolean | string) => {
    setSaving(eventType)
    try {
      await axios.patch('/api/notification-event-settings', {
        eventType,
        data: { [field]: value },
      }, { headers })
      setGroups((prev) =>
        prev.map((g) => ({
          ...g,
          events: g.events.map((e) =>
            e.eventType === eventType ? { ...e, [field]: value, savedInDb: true } : e
          ),
        }))
      )
    } catch {
      toast({ title: 'Error', description: 'Failed to save setting', variant: 'destructive' })
    } finally {
      setSaving(null)
    }
  }

  return (
    <AdminPageTemplate
      title="Notification Event Settings"
      description="Configure email, in-app, and push notifications for each system event"
      requiredPermission={`${Module.SETTINGS}.${Action.MANAGE}`}
      icon={<Bell className="h-6 w-6" />}
      showConstruction={false}
      actions={
        <Button variant="outline" asChild>
          <Link href="/admin/notifications/settings">Personal Preferences</Link>
        </Button>
      }
    >
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <Card key={group.module}>
              <CardHeader
                className="cursor-pointer"
                onClick={() => setExpanded((p) => ({ ...p, [group.module]: !p[group.module] }))}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {expanded[group.module] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      {group.module}
                    </CardTitle>
                    <CardDescription>{group.events.length} events</CardDescription>
                  </div>
                  <Badge variant="secondary">{group.events.filter((e) => e.savedInDb).length} customized</Badge>
                </div>
              </CardHeader>
              {expanded[group.module] && (
                <CardContent className="space-y-4 pt-0">
                  {group.events.map((event) => (
                    <div key={event.eventType} className="border rounded-lg p-4 space-y-3">
                      <div>
                        <p className="font-medium">{event.label}</p>
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm flex items-center gap-1"><Mail className="h-3 w-3" /> Email</span>
                          <Switch
                            checked={event.sendEmail}
                            disabled={saving === event.eventType}
                            onCheckedChange={(v) => void updateEvent(event.eventType, 'sendEmail', v)}
                          />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm flex items-center gap-1"><MonitorSmartphone className="h-3 w-3" /> In-App</span>
                          <Switch
                            checked={event.sendInApp}
                            disabled={saving === event.eventType}
                            onCheckedChange={(v) => void updateEvent(event.eventType, 'sendInApp', v)}
                          />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm flex items-center gap-1"><Smartphone className="h-3 w-3" /> Push</span>
                          <Switch
                            checked={event.sendPush}
                            disabled={saving === event.eventType}
                            onCheckedChange={(v) => void updateEvent(event.eventType, 'sendPush', v)}
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-sm">Recipients</span>
                          <Select
                            value={event.recipients}
                            disabled={saving === event.eventType}
                            onValueChange={(v) => void updateEvent(event.eventType, 'recipients', v)}
                          >
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="assigned">Assigned user</SelectItem>
                              <SelectItem value="all_admins">All admins</SelectItem>
                              <SelectItem value="both">Both</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </AdminPageTemplate>
  )
}
