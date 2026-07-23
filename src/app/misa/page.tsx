'use client'

import localFont from 'next/font/local'
import Image from 'next/image'
import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import { MainHeader } from '@/components/MainHeader'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useLocale } from '@/contexts/LocaleContext'

// Lazy load footer for better mobile performance
const MainFooter = dynamic(() => import('@/components/MainFooter').then(mod => ({ default: mod.MainFooter })), {
  ssr: true,
})

const montserrat = localFont({
  src: [
    {
      path: '../../../public/fonts/Montserrat/Montserrat-VariableFont_wght.ttf',
      style: 'normal',
      weight: '100 900'
    },
    {
      path: '../../../public/fonts/Montserrat/Montserrat-Italic-VariableFont_wght.ttf',
      style: 'italic',
      weight: '100 900'
    }
  ],
  variable: '--font-montserrat',
  display: 'swap'
})

const GREEN = '#0B6B37'
const GOLD = '#CB8D31'

export default function MisaPage() {
  const { t } = useLocale()
  
  const heroBenefits = [
    t('misa.hero.benefit1'),
    t('misa.hero.benefit2'),
    t('misa.hero.benefit3'),
    t('misa.hero.benefit4')
  ]

  const contentBlocks = [
    {
      title: t('misa.content.whatIs.title'),
      body: t('misa.content.whatIs.body')
    },
    {
      title: t('misa.content.whoIsFor.title'),
      body: t('misa.content.whoIsFor.body')
    },
    {
      title: t('misa.content.howWeHelp.title'),
      body: t('misa.content.howWeHelp.body')
    }
  ]
  return (
    <div className={`${montserrat.className} min-h-screen bg-white dark:bg-background`}>
      <MainHeader />

      {/* Hero Section */}
      <section className="bg-white dark:bg-background pt-32 pb-20 md:pt-40">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            {/* Left: Content */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800/50">
                <span className="inline-flex h-2 w-2 rounded-full bg-[#CB8D31]" />
                <span className="text-xs font-semibold tracking-[0.18em] uppercase text-emerald-800 dark:text-emerald-400">
                  {t('misa.badge')}
                </span>
              </div>

              <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight text-[#0B6B37] mb-2">
                {t('misa.hero.title')}
                <span className="block text-[#CB8D31]">{t('misa.hero.subtitle')}</span>
              </h1>

              <div className="grid gap-3 sm:grid-cols-2 max-w-xl mt-2">
                {heroBenefits.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50">
                      <CheckCircle className="h-3.5 w-3.5 text-[#0B6B37]" />
                    </div>
                    <p className="text-sm md:text-base text-[#414042] dark:text-muted-foreground">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Image */}
            <div className="flex justify-center lg:justify-end">
              <div className="rounded-3xl overflow-hidden shadow-[0_18px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_18px_40px_rgba(0,0,0,0.3)] bg-white dark:bg-card">
                <Image
                  src="/tk-media/misa-wallpaper.png"
                  alt={t('misa.image.alt')}
                  width={1200}
                  height={600}
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 600px"
                  className="w-full h-auto"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16 bg-[#FDF9F1] dark:bg-[#040404]">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ color: GREEN }}
            >
              {t('misa.section.title')}
            </h2>
            <p className="text-base md:text-lg text-[#414042] dark:text-muted-foreground">
              {t('misa.section.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {contentBlocks.map((block) => (
              <Card
                key={block.title}
                className="border-0 shadow-[0_18px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_18px_40px_rgba(0,0,0,0.2)] rounded-2xl overflow-hidden bg-white dark:bg-card"
              >
                <div className="h-1.5 w-full bg-gradient-to-r from-emerald-600 to-teal-600" />
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-3 text-[#231F20] dark:text-foreground">
                    {block.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#414042] dark:text-muted-foreground">
                    {block.body}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Get Started / Contact Section */}
      <section className="py-16 md:py-20 bg-gradient-to-r from-emerald-600 to-teal-600">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center text-white">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">
              {t('misa.cta.title')}
            </h3>
            <p className="text-sm md:text-base mb-8 text-white/90">
              {t('misa.cta.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact">
                <Button
                  size="lg"
                  className="px-8 py-5 text-base font-semibold border-0 shadow-lg hover:shadow-xl bg-white text-emerald-700 hover:bg-white/90"
                >
                  {t('misa.cta.requestConsultation')}
                </Button>
              </Link>
              <Link href="/signup">
                <Button
                  size="lg"
                  className="px-8 py-5 text-base font-semibold border border-white/80 text-white bg-transparent hover:bg-white/10"
                >
                  {t('misa.cta.getStarted')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <MainFooter />
    </div>
  )
}


