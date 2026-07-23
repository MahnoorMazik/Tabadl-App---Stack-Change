'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MessageSquare, Phone, Mail } from 'lucide-react'
import { PageUnderConstruction } from '@/components/PageUnderConstruction'
import { useMobileSidebar } from '@/hooks/use-mobile-sidebar'
import { MobileLayout } from '@/lib/mobile-layout-utils'
import { useLocale } from '@/contexts/LocaleContext'

export default function SupportPage() {
  const { user } = useAuth()
  const { t } = useLocale()
  const { isSidebarCollapsed, isMobileSidebarOpen, toggleMobileSidebar, toggleDesktopSidebar, closeMobileSidebar } = useMobileSidebar()

  return (
    <MobileLayout
      isSidebarCollapsed={isSidebarCollapsed}
      isMobileSidebarOpen={isMobileSidebarOpen}
      onToggleMobile={toggleMobileSidebar}
      onToggleDesktop={toggleDesktopSidebar}
      onCloseMobile={closeMobileSidebar}
      title={t('client.help.support')}
      description={t('client.help.supportDescription')}
      icon={<MessageSquare className="h-5 w-5 text-emerald-600" />}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        <PageUnderConstruction
          title={t('client.help.support')}
          description={t('client.help.constructionDesc')}
        />
        <div className="hidden">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="text-center">
                <CardContent className="p-6">
                  <MessageSquare className="h-8 w-8 text-emerald-700 mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">{t('client.help.liveChat')}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{t('client.help.chatWithUs')}</p>
                  <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800">{t('client.help.startChat')}</Button>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardContent className="p-6">
                  <Phone className="h-8 w-8 text-blue-700 mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">{t('client.help.phone')}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">+966 50 123 4567</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('client.help.hours')}</p>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardContent className="p-6">
                  <Mail className="h-8 w-8 text-purple-700 mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">{t('client.help.email')}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">support@tk.sa</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('client.help.responseTime')}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{t('client.help.sendMessage')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="subject">{t('client.help.subject')}</Label>
                  <Input id="subject" placeholder={t('client.help.subjectPlaceholder')} className="mt-2" />
                </div>
                <div>
                  <Label htmlFor="message">{t('client.help.message')}</Label>
                  <textarea
                    id="message"
                    className="w-full mt-2 p-3 border rounded-md"
                    rows={6}
                    placeholder={t('client.help.messagePlaceholder')}
                  />
                </div>
                <Button className="w-full bg-emerald-700 hover:bg-emerald-800">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {t('client.help.sendMessageButton')}
                </Button>
              </CardContent>
            </Card>
        </div>
      </div>
    </MobileLayout>
  )
}

