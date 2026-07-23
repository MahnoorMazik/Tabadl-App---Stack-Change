'use client'

import { useState, useEffect } from 'react'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Bell, Clock, Loader2, Settings } from 'lucide-react'
import Link from 'next/link'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { useLocale } from '@/contexts/LocaleContext'
import type { NotificationEventType } from '@/lib/notifications'

interface Preference {
  eventType: NotificationEventType
  enabled: boolean
}

const DEFAULT_REMINDER_MINUTES = 15
const MIN_REMINDER_MINUTES = 15

/** Preset options (minutes) aligned with 15-min cron; avoids values that conflict with cron. */
const REMINDER_PRESETS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
  { value: 360, label: '6 hours' },
  { value: 720, label: '12 hours' },
  { value: 1440, label: '1 day' },
  { value: 2880, label: '2 days' },
  { value: 10080, label: '1 week' },
] as const

function presetLabel(minutes: number): string {
  const preset = REMINDER_PRESETS.find((p) => p.value === minutes)
  return preset?.label ?? (minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h`)
}

/** Snap stored value to nearest preset >= MIN_REMINDER_MINUTES. */
function snapToPreset(minutes: number): number {
  if (minutes < MIN_REMINDER_MINUTES) return DEFAULT_REMINDER_MINUTES
  const found = REMINDER_PRESETS.find((p) => p.value >= minutes)
  return found ? found.value : REMINDER_PRESETS[REMINDER_PRESETS.length - 1].value
}

export default function NotificationSettingsPage() {
  const { token } = useAuth()
  const { toast } = useToast()
  const { t } = useLocale()
  const [preferences, setPreferences] = useState<Preference[]>([])
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState(DEFAULT_REMINDER_MINUTES)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchPrefs = async () => {
      const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null)
      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {}
      try {
        const res = await axios.get('/api/notifications/preferences', {
          headers,
          withCredentials: true,
        })
        const data = res.data?.data ?? res.data ?? {}
        const list = data.preferences ?? []
        const defaultPrefs = [
          { eventType: 'LEAD_CREATION' as const, enabled: false },
          { eventType: 'LEAD_FOLLOWUP' as const, enabled: false },
          { eventType: 'CLIENT_CONVERSION' as const, enabled: false },
          { eventType: 'REMINDER' as const, enabled: true },
        ]
        setPreferences(list.length > 0 ? list : defaultPrefs)
        const total = data.reminderMinutesBefore ?? DEFAULT_REMINDER_MINUTES
        const value = snapToPreset(total)
        setReminderMinutesBefore(value)
        if (typeof window !== 'undefined') sessionStorage.setItem('reminderMinutesBefore', String(value))
      } catch {
        setPreferences([
          { eventType: 'LEAD_CREATION', enabled: false },
          { eventType: 'LEAD_FOLLOWUP', enabled: false },
          { eventType: 'CLIENT_CONVERSION', enabled: false },
          { eventType: 'REMINDER', enabled: true },
        ])
      } finally {
        setLoading(false)
      }
    }
    fetchPrefs()
  }, [token])

  const handleToggle = (eventType: NotificationEventType, enabled: boolean) => {
    setPreferences((prev) =>
      prev.map((p) => (p.eventType === eventType ? { ...p, enabled } : p))
    )
  }

  const handleSave = async () => {
    setSaving(true)
    const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null)
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {}
    try {
      await axios.put(
        '/api/notifications/preferences',
        { preferences, reminderMinutesBefore },
        { headers, withCredentials: true }
      )
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('reminderMinutesBefore', String(reminderMinutesBefore))
      }
      toast({
        title: t('common.success'),
        description: t('admin.notifications.settings.saved') || 'Notification preferences saved.',
      })
    } catch {
      toast({
        title: t('common.error'),
        description: t('admin.notifications.settings.saveFailed') || 'Failed to save preferences.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const eventLabels: Record<NotificationEventType, string> = {
    LEAD_CREATION: t('admin.notifications.events.leadCreation') || 'Lead creation',
    LEAD_FOLLOWUP: t('admin.notifications.events.followUpCreation') || 'Follow-up creation',
    CLIENT_CONVERSION: t('admin.notifications.events.clientConversion') || 'Client conversion',
    REMINDER: t('admin.notifications.events.reminder') || 'Reminder',
  }

  const eventDescriptions: Record<NotificationEventType, string> = {
    LEAD_CREATION: t('admin.notifications.events.leadCreationDesc') || 'When a new lead is created and assigned to you',
    LEAD_FOLLOWUP: t('admin.notifications.events.followUpCreationDesc') || 'When a follow-up is scheduled',
    CLIENT_CONVERSION: t('admin.notifications.events.clientConversionDesc') || 'When a lead is converted to a client',
    REMINDER: t('admin.notifications.events.reminderDesc') || 'Send a reminder before the scheduled follow-up time',
  }

  const reminderPreference = preferences.find((p) => p.eventType === 'REMINDER')
  const eventPreferencesOnly = preferences.filter((p) => p.eventType !== 'REMINDER')

  return (
    <AdminPageTemplate
      title={t('admin.notifications.settings.title') || 'Notification settings'}
      description={t('admin.notifications.settings.description') || 'Choose which events trigger notifications.'}
      icon={<Settings className="h-6 w-6" />}
      showConstruction={false}
    >
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/admin/notifications" className="hover:underline">
            {t('admin.sidebar.notifications')}
          </Link>
          <span>/</span>
          <span>{t('admin.notifications.settings.title') || 'Settings'}</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t('admin.notifications.settings.remindBefore') || 'Remind me before follow-up'}
            </CardTitle>
            <CardDescription>
              {t('admin.notifications.settings.remindBeforeDesc') ||
                'Send a reminder this long before the scheduled follow-up time.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pb-6">
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('common.loading')}
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border p-4">
                  <div className="space-y-0.5 min-w-0">
                    <Label className="text-sm font-medium cursor-pointer" htmlFor="pref-REMINDER">
                      {eventLabels.REMINDER}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {eventDescriptions.REMINDER}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <Switch
                      id="pref-REMINDER"
                      checked={reminderPreference?.enabled ?? false}
                      onCheckedChange={(checked) => handleToggle('REMINDER', checked)}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <Label htmlFor="reminder-preset" className="whitespace-nowrap">
                    {t('admin.notifications.settings.howLongBefore') || 'How long before'}
                  </Label>
                  <Select
                    value={REMINDER_PRESETS.some((p) => p.value === reminderMinutesBefore) ? String(reminderMinutesBefore) : String(DEFAULT_REMINDER_MINUTES)}
                    onValueChange={(v) => setReminderMinutesBefore(Number(v))}
                  >
                    <SelectTrigger id="reminder-preset" className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REMINDER_PRESETS.map((preset) => (
                        <SelectItem key={preset.value} value={String(preset.value)}>
                          {preset.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">
                    {t('admin.notifications.settings.beforeFollowUp') || 'before follow-up time'}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {t('admin.notifications.settings.eventsByType') || 'Notify me on these events'}
            </CardTitle>
            <CardDescription>
              {t('admin.notifications.settings.eventsByTypeDesc') ||
                'If you disable an event, you will not receive in-app or push notifications for it.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('common.loading')}
              </div>
            ) : (
              <>
                {eventPreferencesOnly.map((pref) => (
                  <div
                    key={pref.eventType}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border p-4"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <Label className="text-sm font-medium cursor-pointer" htmlFor={`pref-${pref.eventType}`}>
                        {eventLabels[pref.eventType]}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {eventDescriptions[pref.eventType]}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <Switch
                        id={`pref-${pref.eventType}`}
                        checked={pref.enabled}
                        onCheckedChange={(checked) => handleToggle(pref.eventType, checked)}
                      />
                    </div>
                  </div>
                ))}
                <div className="pt-4 flex flex-wrap items-center gap-4">
                  <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                    {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {t('common.save') || 'Save'}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {reminderPreference?.enabled
                      ? `${t('admin.notifications.settings.reminderSummary') || 'Reminder:'} ${presetLabel(reminderMinutesBefore)} ${t('admin.notifications.settings.beforeFollowUp') || 'before follow-up time'}`
                      : (t('admin.notifications.settings.remindersOff') || 'Reminders are off')}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminPageTemplate>
  )
}
