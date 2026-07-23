'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Users, Target, Award, Globe, TrendingUp, Shield, Heart, Star, CheckCircle, FileText } from 'lucide-react'
import Link from 'next/link'
import { MainHeader } from '@/components/MainHeader'
import dynamic from 'next/dynamic'
import { useLocale } from '@/contexts/LocaleContext'

// Lazy load footer and WhatsApp button for better mobile performance
const MainFooter = dynamic(() => import('@/components/MainFooter').then(mod => ({ default: mod.MainFooter })), {
  ssr: true,
})

export default function AboutUs() {
  const { t } = useLocale()
  return (
    <div className="min-h-screen bg-white dark:bg-[#040404]">
      <MainHeader />

      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-white dark:bg-[#040404]">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-[#0B6B37]/10">
              <Heart className="h-4 w-4 text-[#0B6B37]" />
              <span className="text-sm font-semibold text-[#0B6B37]">{t('about.badge')}</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold mb-4">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600">
                {t('about.title')}
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-muted-foreground leading-relaxed max-w-3xl mx-auto">
              {t('about.subtitle')}
            </p>
            <div className="mt-6 flex justify-center">
              <div className="h-1 w-32 rounded-full bg-gradient-to-r from-emerald-600 to-[#CB8D31]" />
            </div>
          </div>
        </div>
      </section>

      {/* Company Profile Section */}
      <section className="py-20 bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:32px_32px]" />
        <div className="absolute inset-x-0 top-0 h-40 bg-white/10 blur-2xl opacity-60" />
        <div className="container mx-auto px-4 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-4xl font-bold">
                {t('about.profile.title')}
              </h2>
              <p className="text-lg text-white/90 leading-relaxed">
                {t('about.profile.desc')}
              </p>
              <ul className="space-y-3">
                {[
                  t('about.profile.point1'),
                  t('about.profile.point2'),
                  t('about.profile.point3'),
                  t('about.profile.point4')
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-white/90">
                    <CheckCircle className="h-5 w-5 text-[#F6D58F]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col sm:flex-row flex-wrap gap-4">
                <a
                  href="/tk-media/company_profile_tabadl_alkon.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex"
                >
                  <Button size="lg" className="bg-white text-emerald-700 hover:bg-white/90 px-8 py-6 text-lg font-semibold shadow-xl">
                    {t('about.profile.download')}
                  </Button>
                </a>
                <Link href="/contact">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-2 border-white/80 bg-white/10 text-white hover:bg-white hover:text-emerald-700 px-8 py-6 text-lg font-semibold backdrop-blur-sm"
                  >
                    {t('about.profile.talkExpert')}
                  </Button>
                </Link>
              </div>
            </div>

            <Card className="border-0 shadow-2xl bg-white dark:bg-card text-gray-900 dark:text-foreground">
              <CardContent className="p-8 space-y-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-lg">
                  <FileText className="h-8 w-8" />
                </div>
                <h3 className="text-3xl font-bold text-[#0B6B37]">{t('about.profile.whatsInside')}</h3>
                <p className="text-gray-600 dark:text-muted-foreground leading-relaxed">
                  {t('about.profile.whatsInsideDesc')}
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {[
                    { label: t('about.profile.industries'), value: '12+' },
                    { label: t('about.profile.coreServices'), value: '18' },
                    { label: t('about.profile.teamExperts'), value: '45+' },
                    { label: t('about.profile.caseStudies'), value: '10' }
                  ].map((item) => (
                    <div key={item.label} className="p-4 rounded-xl bg-gray-50 dark:bg-secondary border border-gray-100 dark:border-border text-center">
                      <div className="text-2xl font-bold text-[#0B6B37]">{item.value}</div>
                      <div className="text-gray-500 dark:text-muted-foreground">{item.label}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 bg-[radial-gradient(circle_at_top,_#f7f5f0,_#ffffff)] dark:bg-[#040404] dark:[background:#040404]">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 mb-16">
              <Card className="border-0 shadow-xl bg-white dark:bg-card">
                <CardContent className="p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                      <Target className="h-6 w-6 text-emerald-700 dark:text-emerald-400" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-foreground">{t('about.mission.title')}</h2>
                  </div>
                  <div className="space-y-4 text-lg text-gray-600 dark:text-muted-foreground leading-relaxed">
                    <p>
                      {t('about.mission.paragraph1')}
                    </p>
                    <p>
                      {t('about.mission.paragraph2')}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl bg-white dark:bg-card">
                <CardContent className="p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                      <Globe className="h-6 w-6 text-emerald-700 dark:text-emerald-400" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-foreground">{t('about.vision.title')}</h2>
                  </div>
                  <div className="space-y-4 text-lg text-gray-600 dark:text-muted-foreground leading-relaxed">
                    <p>
                      {t('about.vision.paragraph1')}
                    </p>
                    <p>
                      {t('about.vision.paragraph2')}                         ’s                     </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-20 bg-gray-50 dark:bg-[#040404]">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 dark:text-foreground mb-4">{t('about.story.title')}</h2>
              <p className="text-xl text-gray-600 dark:text-muted-foreground">{t('about.story.subtitle')}</p>
            </div>

            <div className="space-y-8">
              <div className="flex items-start gap-6">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">1</span>
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-foreground mb-3">{t('about.story.beginning.title')}</h3>
                  <p className="text-gray-600 dark:text-muted-foreground leading-relaxed">
                    {t('about.story.beginning.content')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-amber-700 dark:text-amber-400 font-bold">2</span>
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-foreground mb-3">{t('about.story.innovation.title')}</h3>
                  <p className="text-gray-600 dark:text-muted-foreground leading-relaxed">
                    {t('about.story.innovation.content')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">3</span>
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-foreground mb-3">{t('about.story.impact.title')}</h3>
                  <p className="text-gray-600 dark:text-muted-foreground leading-relaxed">
                    {t('about.story.impact.content')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-gradient-to-b from-white to-gray-50 dark:from-[#040404] dark:to-[#040404]">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 dark:text-foreground mb-4">{t('about.values.title')}</h2>
              <p className="text-xl text-gray-600 dark:text-muted-foreground">{t('about.values.subtitle')}</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-white dark:bg-card">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Shield className="h-8 w-8 text-emerald-700 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-foreground mb-4">{t('about.values.trust.title')}</h3>
                  <p className="text-gray-600 dark:text-muted-foreground leading-relaxed">
                    {t('about.values.trust.content')}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-white dark:bg-card">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <TrendingUp className="h-8 w-8 text-amber-700 dark:text-amber-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-foreground mb-4">{t('about.values.innovation.title')}</h3>
                  <p className="text-gray-600 dark:text-muted-foreground leading-relaxed">
                    {t('about.values.innovation.content')}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-white dark:bg-card">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Users className="h-8 w-8 text-emerald-700 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-foreground mb-4">{t('about.values.clientSuccess.title')}</h3>
                  <p className="text-gray-600 dark:text-muted-foreground leading-relaxed">
                    {t('about.values.clientSuccess.content')}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Achievements */}
      <section className="py-20 bg-white dark:bg-[#040404]">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 dark:text-foreground mb-4">{t('about.achievements.title')}</h2>
              <p className="text-xl text-gray-600 dark:text-muted-foreground">{t('about.achievements.subtitle')}</p>
            </div>

            <div className="grid md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-10 w-10 text-emerald-700 dark:text-emerald-400" />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-foreground mb-2">500+</h3>
                <p className="text-gray-600 dark:text-muted-foreground">{t('about.achievements.businessesRegistered')}</p>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="h-10 w-10 text-amber-700 dark:text-amber-400" />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-foreground mb-2">98%</h3>
                <p className="text-gray-600 dark:text-muted-foreground">{t('about.achievements.successRate')}</p>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="h-10 w-10 text-emerald-700 dark:text-emerald-400" />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-foreground mb-2">4.9/5</h3>
                <p className="text-gray-600 dark:text-muted-foreground">{t('about.achievements.clientRating')}</p>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-10 w-10 text-amber-700 dark:text-amber-400" />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-foreground mb-2">40 Days</h3>
                <p className="text-gray-600 dark:text-muted-foreground">{t('about.achievements.averageProcessing')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-emerald-600 to-teal-600">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-white mb-6">{t('about.cta.title')}</h2>
            <p className="text-xl text-emerald-100 mb-8 leading-relaxed">
              {t('about.cta.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button size="lg" className="bg-white text-emerald-700 hover:bg-gray-100 px-8 py-6 text-lg font-semibold">
                  {t('about.cta.getStarted')}
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-emerald-700 px-8 py-6 text-lg font-semibold">
                  {t('about.cta.contactUs')}
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
