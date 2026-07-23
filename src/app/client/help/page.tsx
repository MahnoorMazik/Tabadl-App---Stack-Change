'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { HelpCircle, MessageSquare, Phone, FileText } from 'lucide-react'
import { PageUnderConstruction } from '@/components/PageUnderConstruction'
import { useMobileSidebar } from '@/hooks/use-mobile-sidebar'
import { MobileLayout } from '@/lib/mobile-layout-utils'
import { useLocale } from '@/contexts/LocaleContext'

export default function ClientHelpPage() {
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
      title={t('client.help.title')}
      description={t('client.help.description')}
      icon={<HelpCircle className="h-5 w-5 text-emerald-600" />}
    >
      <div className="max-w-4xl mx-auto">
        <PageUnderConstruction
          title={t('client.help.constructionTitle')}
          description={t('client.help.constructionDesc')}
        />
        <div className="hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Link href="/client/help/faq">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardContent className="p-8 text-center">
                    <FileText className="h-12 w-12 text-emerald-700 mx-auto mb-4" />
                    <h3 className="font-semibold text-lg mb-2">{t('client.help.faq')}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('client.help.findAnswers')}</p>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/client/help/support">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardContent className="p-8 text-center">
                    <MessageSquare className="h-12 w-12 text-blue-700 mx-auto mb-4" />
                    <h3 className="font-semibold text-lg mb-2">{t('client.help.contactSupportLabel')}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('client.help.getInTouch')}</p>
                  </CardContent>
                </Card>
              </Link>
            </div>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>{t('client.help.quickHelp')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Phone className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <div>
                    <p className="font-medium">{t('client.help.phoneSupport')}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">+966 50 123 4567</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <MessageSquare className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <div>
                    <p className="font-medium">{t('client.help.emailSupport')}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">support@tk.sa</p>
                  </div>
                </div>
              </CardContent>
            </Card>
        </div>
      </div>
    </MobileLayout>
  )
}

