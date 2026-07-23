'use client'

import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Settings, 
  Mail, 
  Database, 
  Shield, 
  Server,
  ArrowRight,
  CreditCard,
  Bot
} from 'lucide-react'
import Link from 'next/link'
import { useLocale } from '@/contexts/LocaleContext'

export default function SettingsPage() {
  const { t } = useLocale()
  const settingsCategories = [
    {
      title: t('admin.settings.general'),
      description: t('admin.settings.generalDesc') || 'Configure system preferences and basic settings',
      icon: <Settings className="h-8 w-8 text-blue-600" />,
      href: '/admin/settings/general',
      color: 'bg-blue-50 border-blue-200'
    },
    {
      title: t('admin.settings.email'),
      description: t('admin.settings.emailDesc') || 'Configure SMTP, IMAP, and POP3 email settings',
      icon: <Mail className="h-8 w-8 text-green-600" />,
      href: '/admin/settings/email',
      color: 'bg-green-50 border-green-200'
    },
    {
      title: 'Payment Gateway',
      description: 'Configure EdfaPay for online invoice payments',
      icon: <CreditCard className="h-8 w-8 text-teal-600" />,
      href: '/admin/settings/payment-gateway',
      color: 'bg-teal-50 border-teal-200'
    },
    {
      title: 'AI Chatbot',
      description: 'Configure Ollama AI assistant and channel settings',
      icon: <Bot className="h-8 w-8 text-indigo-600" />,
      href: '/admin/settings/chatbot',
      color: 'bg-indigo-50 border-indigo-200'
    },
    {
      title: t('admin.settings.system'),
      description: t('admin.settings.systemDesc') || 'Advanced system configuration and maintenance',
      icon: <Server className="h-8 w-8 text-purple-600" />,
      href: '/admin/settings/system',
      color: 'bg-purple-50 border-purple-200'
    },
    {
      title: t('admin.settings.backup'),
      description: t('admin.settings.backupDesc') || 'Manage data backup and recovery settings',
      icon: <Database className="h-8 w-8 text-orange-600" />,
      href: '/admin/settings/backup',
      color: 'bg-orange-50 border-orange-200'
    },
    {
      title: t('admin.settings.security') || 'Security Settings',
      description: t('admin.settings.securityDesc') || 'Configure security policies and access controls',
      icon: <Shield className="h-8 w-8 text-red-600" />,
      href: '/admin/settings/security',
      color: 'bg-red-50 border-red-200'
    }
  ]

  return (
    <AdminPageTemplate
      title={t('admin.settings.title')}
      description={t('admin.settings.description') || "Configure and manage system settings"}
      icon={<Settings className="h-6 w-6" />}
      showConstruction={false}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {settingsCategories.map((category, index) => (
            <Card key={index} className={`${category.color} hover:shadow-lg transition-shadow`}>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  {category.icon}
                  <div>
                    <CardTitle className="text-lg">{category.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm mb-4">
                  {category.description}
                </p>
                <Link href={category.href}>
                  <Button variant="outline" className="w-full group">
                    {t('admin.settings.configure') || 'Configure'}
                    <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.settings.quickActions') || 'Quick Actions'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/admin/settings/email">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-2">
                  <Mail className="h-6 w-6" />
                  <span>{t('admin.settings.testEmail') || 'Test Email'}</span>
                </Button>
              </Link>
              <Link href="/admin/settings/backup">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-2">
                  <Database className="h-6 w-6" />
                  <span>{t('admin.settings.backupNow') || 'Backup Now'}</span>
                </Button>
              </Link>
              <Link href="/admin/settings/system">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-2">
                  <Server className="h-6 w-6" />
                  <span>{t('admin.settings.systemStatus') || 'System Status'}</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminPageTemplate>
  )
}
