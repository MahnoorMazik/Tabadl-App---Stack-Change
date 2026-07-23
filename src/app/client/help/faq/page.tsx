'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { HelpCircle } from 'lucide-react'
import { PageUnderConstruction } from '@/components/PageUnderConstruction'
import { useMobileSidebar } from '@/hooks/use-mobile-sidebar'
import { MobileLayout } from '@/lib/mobile-layout-utils'
import { useLocale } from '@/contexts/LocaleContext'

const FAQ_KEYS = [
  { q: 'client.help.faqQ1', a: 'client.help.faqA1' },
  { q: 'client.help.faqQ2', a: 'client.help.faqA2' },
  { q: 'client.help.faqQ3', a: 'client.help.faqA3' },
  { q: 'client.help.faqQ4', a: 'client.help.faqA4' },
  { q: 'client.help.faqQ5', a: 'client.help.faqA5' },
] as const

export default function FAQPage() {
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
      title={t('client.help.faq')}
      description={t('client.help.faqDescription')}
      icon={<HelpCircle className="h-5 w-5 text-emerald-600" />}
    >
      <div className="max-w-3xl mx-auto">
        <PageUnderConstruction
          title={t('client.help.faq')}
          description={t('client.help.constructionDesc')}
        />
        <div className="hidden">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  {t('client.help.faqCardTitle')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {FAQ_KEYS.map((faq, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className="text-left hover:no-underline">
                        {t(faq.q)}
                      </AccordionTrigger>
                      <AccordionContent className="text-gray-600 dark:text-gray-400">
                        {t(faq.a)}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
        </div>
      </div>
    </MobileLayout>
  )
}

