'use client'

import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { HelpCircle } from 'lucide-react'
import { useLocale } from '@/contexts/LocaleContext'

const FAQ_KEYS = [
  { q: 'admin.help.faqQ1', a: 'admin.help.faqA1' },
  { q: 'admin.help.faqQ2', a: 'admin.help.faqA2' },
  { q: 'admin.help.faqQ3', a: 'admin.help.faqA3' },
  { q: 'admin.help.faqQ4', a: 'admin.help.faqA4' },
  { q: 'admin.help.faqQ5', a: 'admin.help.faqA5' },
  { q: 'admin.help.faqQ6', a: 'admin.help.faqA6' },
] as const

export default function FAQPage() {
  const { t } = useLocale()

  return (
    <AdminPageTemplate
      title={t('admin.help.faq')}
      description={t('admin.help.faqDescription')}
      icon={<HelpCircle className="h-6 w-6" />}
      showConstruction={false}
    >
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.help.faqCardTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {FAQ_KEYS.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger>{t(faq.q)}</AccordionTrigger>
                  <AccordionContent>{t(faq.a)}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </AdminPageTemplate>
  )
}
