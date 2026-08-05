'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useLocale } from '@/contexts/LocaleContext'
import { useAuth } from '@/contexts/AuthContext'
import { Bell, Loader2, Mail, MessageSquare, Settings } from 'lucide-react'

type GeneralSettingsState = {
  clientEmailNotifications: boolean
  clientWhatsAppNotifications: boolean
}

export default function AdminSettingsPage() {
  const { t } = useLocale()
  const { token } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<GeneralSettingsState>({
    clientEmailNotifications: true,
    clientWhatsAppNotifications: true,
  })

  const authHeaders = () => {
    const authToken =
      token || (typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null)
    return authToken ? { Authorization: `Bearer ${authToken}` } : {}
  }

  useEffect(() => {
    void loadSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/settings/general', { headers: authHeaders() })
      const data = res.data?.settings
      setSettings({
        clientEmailNotifications: data?.clientEmailNotifications ?? true,
        clientWhatsAppNotifications: data?.clientWhatsAppNotifications ?? true,
      })
    } catch (error: any) {
      toast({
        title: t('common.error') || 'Error',
        description:
          error.response?.data?.error ||
          t('admin.settings.general.loadFailed') ||
          'Failed to load general settings',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await axios.put('/api/settings/general', settings, {
        headers: authHeaders(),
      })
      const data = res.data?.settings
      if (data) {
        setSettings({
          clientEmailNotifications: data.clientEmailNotifications,
          clientWhatsAppNotifications: data.clientWhatsAppNotifications,
        })
      }
      toast({
        title: t('common.success') || 'Success',
        description:
          t('admin.settings.general.saved') || 'Client notification settings saved.',
      })
    } catch (error: any) {
      toast({
        title: t('common.error') || 'Error',
        description:
          error.response?.data?.error ||
          t('admin.settings.general.saveFailed') ||
          'Failed to save settings',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminPageTemplate
      title={t('admin.settings.general')}
      description={
        t('admin.settings.generalDescription') || 'Configure system preferences'
      }
      icon={<Settings className="h-6 w-6" />}
      showConstruction={false}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5 text-emerald-700" />
              {t('admin.settings.general.clientNotifications') ||
                'Client Notifications'}
            </CardTitle>
            <CardDescription>
              {t('admin.settings.general.clientNotificationsDesc') ||
                'Turn client application status notifications on or off. Email and WhatsApp are controlled separately.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
                  <div className="space-y-1 pr-4">
                    <Label
                      htmlFor="client-email-notifications"
                      className="flex items-center gap-2 text-base font-medium"
                    >
                      <Mail className="h-4 w-4 text-emerald-700" />
                      {t('admin.settings.general.emailNotifications') ||
                        'Email notifications'}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {t('admin.settings.general.emailNotificationsDesc') ||
                        'When off, application status emails are not sent to clients.'}
                    </p>
                  </div>
                  <Switch
                    id="client-email-notifications"
                    checked={settings.clientEmailNotifications}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        clientEmailNotifications: checked,
                      }))
                    }
                  />
                </div>

                <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
                  <div className="space-y-1 pr-4">
                    <Label
                      htmlFor="client-whatsapp-notifications"
                      className="flex items-center gap-2 text-base font-medium"
                    >
                      <MessageSquare className="h-4 w-4 text-emerald-700" />
                      {t('admin.settings.general.whatsappNotifications') ||
                        'WhatsApp notifications'}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {t('admin.settings.general.whatsappNotificationsDesc') ||
                        'When off, application status WhatsApp messages are not sent to clients.'}
                    </p>
                  </div>
                  <Switch
                    id="client-whatsapp-notifications"
                    checked={settings.clientWhatsAppNotifications}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        clientWhatsAppNotifications: checked,
                      }))
                    }
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button onClick={() => void handleSave()} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t('common.saving') || 'Saving…'}
                      </>
                    ) : (
                      t('common.save') || 'Save'
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminPageTemplate>
  )
}
