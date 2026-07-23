'use client'

import localFont from 'next/font/local'
import Image from 'next/image'
import Link from 'next/link'
import { MainHeader } from '@/components/MainHeader'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, Award, Briefcase, Building2, Users, ShieldCheck } from 'lucide-react'
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
const GOLD_SOFT = '#F1C678'
const GOLD_LIGHT = '#F8DCA6'

export default function PremiumResidencyPage() {
  const { t } = useLocale()
  
  const categories = [
    {
      title: t('premiumResidency.category.specialTalent.title'),
      icon: Award,
      accent: GREEN,
      bullets: [
        t('premiumResidency.category.specialTalent.bullet1'),
        t('premiumResidency.category.specialTalent.bullet2'),
        t('premiumResidency.category.specialTalent.bullet3'),
        t('premiumResidency.category.specialTalent.bullet4'),
        t('premiumResidency.category.specialTalent.bullet5')
      ]
    },
    {
      title: t('premiumResidency.category.gifted.title'),
      icon: Users,
      accent: GOLD,
      bullets: [
        t('premiumResidency.category.gifted.bullet1'),
        t('premiumResidency.category.gifted.bullet2'),
        t('premiumResidency.category.gifted.bullet3'),
        t('premiumResidency.category.gifted.bullet4'),
        t('premiumResidency.category.gifted.bullet5'),
        t('premiumResidency.category.gifted.bullet6'),
        t('premiumResidency.category.gifted.bullet7'),
        t('premiumResidency.category.gifted.bullet8')
      ]
    },
    {
      title: t('premiumResidency.category.investor.title'),
      icon: Briefcase,
      accent: GREEN,
      bullets: [
        t('premiumResidency.category.investor.bullet1'),
        t('premiumResidency.category.investor.bullet2'),
        t('premiumResidency.category.investor.bullet3'),
        t('premiumResidency.category.investor.bullet4'),
        t('premiumResidency.category.investor.bullet5')
      ]
    },
    {
      title: t('premiumResidency.category.entrepreneur.title'),
      icon: Building2,
      accent: GOLD,
      bullets: [
        t('premiumResidency.category.entrepreneur.bullet1'),
        t('premiumResidency.category.entrepreneur.bullet2'),
        t('premiumResidency.category.entrepreneur.bullet3'),
        t('premiumResidency.category.entrepreneur.bullet4'),
        t('premiumResidency.category.entrepreneur.bullet5')
      ]
    },
    {
      title: t('premiumResidency.category.realEstate.title'),
      icon: ShieldCheck,
      accent: GREEN,
      bullets: [
        t('premiumResidency.category.realEstate.bullet1'),
        t('premiumResidency.category.realEstate.bullet2'),
        t('premiumResidency.category.realEstate.bullet3'),
        t('premiumResidency.category.realEstate.bullet4'),
        t('premiumResidency.category.realEstate.bullet5')
      ]
    },
    {
      title: t('premiumResidency.category.limitedUnlimited.title'),
      icon: Users,
      accent: GOLD,
      bullets: [
        t('premiumResidency.category.limitedUnlimited.bullet1'),
        t('premiumResidency.category.limitedUnlimited.bullet2'),
        t('premiumResidency.category.limitedUnlimited.bullet3')
      ]
    }
  ]
  
  const heroBenefits = [
    t('premiumResidency.hero.benefit1'),
    t('premiumResidency.hero.benefit2'),
    t('premiumResidency.hero.benefit3'),
    t('premiumResidency.hero.benefit4')
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
                  {t('premiumResidency.badge')}
                </span>
              </div>

              <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight text-[#0B6B37] mb-2">
                {t('premiumResidency.hero.title')}
                <span className="block text-[#CB8D31]">{t('premiumResidency.hero.subtitle')}</span>
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

              {/* CTAs removed per request */}
            </div>

            {/* Right: Image */}
            <div className="flex justify-center lg:justify-end">
              <div className="rounded-3xl overflow-hidden shadow-[0_18px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_18px_40px_rgba(0,0,0,0.3)] bg-white dark:bg-card">
                <Image
                  src="/tk-media/premium-residency-card-wallpaper.png"
                  alt={t('premiumResidency.image.alt')}
                  width={1100}
                  height={400}
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 550px"
                  className="w-full h-auto"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Eligibility Grid */}
      <section id="eligibility" className="py-16 bg-[#FDF9F1] dark:bg-[#040404]">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ color: GREEN }}
            >
              {t('premiumResidency.section.title')}
            </h2>
            <p className="text-base md:text-lg text-[#414042] dark:text-muted-foreground">
              {t('premiumResidency.section.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {categories.map((category) => {
              const Icon = category.icon
              return (
                <Card
                  key={category.title}
                  className="border-0 shadow-[0_18px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_18px_40px_rgba(0,0,0,0.2)] rounded-2xl overflow-hidden bg-white dark:bg-card"
                >
                  <div className="h-1.5 w-full bg-gradient-to-r from-emerald-600 to-teal-600" />
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center dark:bg-secondary/50"
                        style={{
                          backgroundColor: GOLD_LIGHT,
                          border: `1px solid ${category.accent}`
                        }}
                      >
                        <Icon className="h-6 w-6" style={{ color: category.accent }} />
                      </div>
                      <h3 className="text-lg font-semibold leading-snug text-[#231F20] dark:text-foreground">
                        {category.title}
                      </h3>
                    </div>
                    <ul className="space-y-2.5 text-sm text-[#414042] dark:text-muted-foreground">
                      {category.bullets.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span
                            className="mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: category.accent }}
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Support CTA */}
      <section className="py-16 md:py-20 bg-gradient-to-r from-emerald-600 to-teal-600">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center text-white">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">
              {t('premiumResidency.cta.title')}
            </h3>
            <p className="text-sm md:text-base mb-8 text-white/90">
              {t('premiumResidency.cta.subtitle')}
            </p>
            <div className="flex justify-center">
              <Link href="/contact">
                <Button
                  size="lg"
                  className="px-8 py-5 text-base font-semibold border-0 shadow-lg hover:shadow-xl bg-white text-emerald-700 hover:bg-white/90"
                >
                  {t('premiumResidency.cta.requestConsultation')}
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


