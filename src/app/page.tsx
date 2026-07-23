'use client'

import { useState, useEffect } from 'react'
import localFont from 'next/font/local'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmailInput } from '@/components/ui/email-input'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { validateEmail } from '@/lib/email-validation'
import { 
  CheckCircle, 
  TrendingUp, 
  Clock, 
  ArrowRight, 
  Star, 
  Building, 
  Globe, 
  HeadphonesIcon,
  Zap,
  Shield,
  Award,
  Users,
  FileText,
  PlayCircle,
  ChevronRight,
  Sparkles,
  BarChart3,
  Rocket,
  Factory,
  UserCheck,
  Briefcase
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { MainHeader } from '@/components/MainHeader'
import dynamic from 'next/dynamic'
import { useLocale } from '@/contexts/LocaleContext'

// Lazy load footer and WhatsApp button for better mobile performance
const MainFooter = dynamic(() => import('@/components/MainFooter').then(mod => ({ default: mod.MainFooter })), {
  ssr: true, // Keep SSR for SEO
})

const montserrat = localFont({
  src: [
    {
      path: '../../public/fonts/Montserrat/Montserrat-VariableFont_wght.ttf',
      style: 'normal',
      weight: '100 900'
    },
    {
      path: '../../public/fonts/Montserrat/Montserrat-Italic-VariableFont_wght.ttf',
      style: 'italic',
      weight: '100 900'
    }
  ],
  variable: '--font-montserrat',
  display: 'swap'
})

export default function LandingPage() {
  const { t } = useLocale()
  const [scrollY, setScrollY] = useState(0)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  })
  const [emailError, setEmailError] = useState('')

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate email before submitting
    const emailValidation = validateEmail(formData.email)
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error!)
      return
    }
    
    // Here you would typically send the form data to your backend
    console.log('Contact form submitted:', formData)
    alert('Thank you for your message! We will get back to you soon.')
  }
  const [activeTestimonial, setActiveTestimonial] = useState(0)

  useEffect(() => {
    // Throttle scroll handler for better performance on mobile
    let ticking = false
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrollY(window.scrollY)
          ticking = false
        })
        ticking = true
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % 3)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const stats = [
    { label: t('home.stats.companies'), value: '500+', icon: Factory, bg: 'bg-[#0B6B37]/10', iconColor: '#0B6B37' },
    { label: t('home.stats.success'), value: '98%', icon: TrendingUp, bg: 'bg-[#CB8D31]/15', iconColor: '#CB8D31' },
    { label: t('home.stats.processing'), value: '40 Days', icon: Clock, bg: 'bg-[#0B6B37]/10', iconColor: '#0B6B37' },
    { label: t('home.stats.satisfaction'), value: '4.9/5', icon: Star, bg: 'bg-[#CB8D31]/10', iconColor: '#CB8D31' },
  ]

  const features = [
    {
      icon: Zap,
      title: t('home.features.fast.title'),
      description: t('home.features.fast.desc'),
      tile: 'bg-[#F5F5F5]',
      iconColor: '#0B6B37'
    },
    {
      icon: Shield,
      title: t('home.features.secure.title'),
      description: t('home.features.secure.desc'),
      tile: 'bg-[#F5F5F5]',
      iconColor: '#CB8D31'
    },
    {
      icon: UserCheck,
      title: t('home.features.expert.title'),
      description: t('home.features.expert.desc'),
      tile: 'bg-[#F5F5F5]',
      iconColor: '#0B6B37'
    },
    {
      icon: BarChart3,
      title: t('home.features.tracking.title'),
      description: t('home.features.tracking.desc'),
      tile: 'bg-[#F5F5F5]',
      iconColor: '#0B6B37'
    }
  ]

  const services = [
    {
      title: t('home.services.registration.title'),
      description: t('home.services.registration.desc'),
      icon: Briefcase,
      features: [
        t('home.services.registration.feature1'),
        t('home.services.registration.feature2'),
        t('home.services.registration.feature3'),
        t('home.services.registration.feature4')
      ]
    },
    {
      title: t('home.services.setup.title'),
      description: t('home.services.setup.desc'),
      icon: Factory,
      features: [
        t('home.services.setup.feature1'),
        t('home.services.setup.feature2'),
        t('home.services.setup.feature3'),
        t('home.services.setup.feature4')
      ]
    },
    {
      title: t('home.services.support.title'),
      description: t('home.services.support.desc'),
      icon: HeadphonesIcon,
      features: [
        t('home.services.support.feature1'),
        t('home.services.support.feature2'),
        t('home.services.support.feature3'),
        t('home.services.support.feature4')
      ]
    }
  ]

  const testimonials = [
    {
      name: 'Sarah Khan',
      company: 'CEO, Horizon IT Services',
      content:
        'Partnering with Tabadl Alkon gave our team a true local ally in Saudi Arabia. They handled every step of the licensing and setup with clarity and precision, so we could stay focused on our core technology. Thanks to their guidance, we launched our IT operations in Saudi Arabia faster than our internal roadmap predicted.',
      rating: 5,
      image: '👩‍💼'
    },
    {
      name: 'Royam Ibrahim Ansari',
      company: 'Director of Transport & Logistics, Serene Latitude Co.',
      content:
        'Saudi Arabia was a strategic market for us, but the regulatory landscape felt complex. Tabadl Alkon simplified everything—from company registration to ongoing compliance. Their team is responsive, transparent, and genuinely committed to our success.',
      rating: 5,
      image: '👨‍💼'
    },
    {
      name: 'Samia Khan',
      company: 'Founder & Director, Elite Enrichment Services',
      content:
        'Tabadl Alkon removed the stress of establishing our enrichment programs in Saudi Arabia. They managed licensing, tax, and legal requirements, and connected us with trusted local partners. Because of their support, we were able to launch on schedule and start serving families without delays.',
      rating: 5,
      image: '👩‍💼'
    }
  ]

  const licenses = [
    {
      name: 'Saudi Business Center',
      src: '/licences-images/Saudi Business Center logo.webp'
    },
    {
      name: 'Ministry of Investment of Saudi Arabia (MISA)',
      src: '/licences-images/misa-wallpaper.svg'
    },
    {
      name: 'GOSI - Social Insurance',
      src: '/licences-images/General Organization for Social Insurance (GOSI) logo.png'
    },
    {
      name: 'Zakat, Tax and Customs Authority',
      src: '/licences-images/ZATCA_Logo.svg'
    },
    {
      name: 'Qiwa',
      src: '/licences-images/Qiwa-Logo.webp'
    },
    {
      name: 'Absher',
      src: '/licences-images/absher_logo.png'
    },
    {
      name: 'Mudad',
      src: '/licences-images/mudad_logo.png'
    },
    {
      name: 'Muqeem',
      src: '/licences-images/Muqeem logo.png'
    }
  ]

  return (
    <div className={`${montserrat.className} min-h-screen bg-white dark:bg-background`}>
      <MainHeader />

      {/* Hero Section */}
      <section 
        id="home" 
        className="relative pt-32 pb-20 overflow-hidden"
        style={{
          backgroundImage: 'url(/riyadh-skyline.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Light Overlay for text readability */}
        <div className="absolute inset-0 bg-[rgba(0,0,0,0.65)]" />
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:32px_32px]" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="text-6xl md:text-7xl font-extrabold mb-6 text-white animate-in fade-in slide-in-from-bottom-4 duration-1000">
              {t('home.hero.title')} <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600">KSA</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-white leading-relaxed max-w-3xl mx-auto mb-10 drop-shadow-[0_10px_35px_rgba(0,0,0,0.9)] animate-in fade-in slide-in-from-bottom-5 duration-1000 delay-100">
              {t('home.hero.subtitle')} <span className="font-semibold text-white">{t('home.hero.transparent')}</span>
            </p>
            
            <div className="flex flex-col md:flex-row flex-wrap gap-4 md:gap-5 justify-center items-stretch mb-12 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200">
              <Link href="/signup" className="w-full md:w-auto">
                <Button size="lg" className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-xl hover:shadow-2xl transition-all px-8 py-6 text-lg border-0 focus-visible:ring-4 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent">
                  <Rocket className="mr-2 h-5 w-5" />
                  {t('home.hero.registerNow')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/contact" className="w-full md:w-auto">
                <Button
                  size="lg"
                  className="w-full bg-white/5 border-2 border-white/60 text-white hover:border-[#F6D58F] hover:text-[#F6D58F] hover:bg-white/15 px-8 py-6 text-lg shadow-lg transition-all backdrop-blur-sm focus-visible:ring-4 focus-visible:ring-[#F6D58F]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                >
                  <HeadphonesIcon className="mr-2 h-5 w-5" />
                  {t('home.hero.bookConsultation')}
                </Button>
              </Link>
              <a
                href="/tk-media/company_profile_tabadl_alkon.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full md:w-auto"
              >
                <Button
                  size="lg"
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-8 py-6 text-lg shadow-xl border-0 focus-visible:ring-4 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                >
                  <FileText className="mr-2 h-5 w-5" />
                  {t('home.hero.companyProfile')}
                </Button>
              </a>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center gap-6 text-sm text-white/80 animate-in fade-in duration-1000 delay-300">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                <CheckCircle className="h-4 w-4 text-[#CB8D31]" />
                {t('home.hero.noHiddenFees')}
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                <CheckCircle className="h-4 w-4 text-[#CB8D31]" />
                {t('home.hero.support24')}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Saudi Arabia Section */}
      <section className="py-20 bg-white dark:bg-background">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Images */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="aspect-[4/3] bg-gray-200 dark:bg-card rounded-lg overflow-hidden">
                    <Image
                      src="/tk-media/image_006.webp"
                      alt="Business presentation in Saudi Arabia"
                      width={400}
                      height={300}
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 400px"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="aspect-[4/3] bg-gray-200 dark:bg-card rounded-lg overflow-hidden">
                    <Image
                      src="/tk-media/image_007.webp"
                      alt="Business meeting in Saudi Arabia"
                      width={400}
                      height={300}
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 400px"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </div>
                <div className="aspect-[0.643] bg-gray-200 dark:bg-card rounded-lg overflow-hidden">
                  <Image
                    src="/tk-media/image_014.webp"
                    alt="Saudi business professionals"
                    width={400}
                    height={400}
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 400px"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>

            {/* Right Column - Content */}
            <div className="space-y-6">
              <h2 className="text-4xl lg:text-5xl font-bold text-[#0B6B37] mb-6">
                {t('home.whySaudi.title')}
              </h2>
              
              <div className="prose prose-lg text-gray-700 dark:text-foreground">
                <p>
                  {t('home.whySaudi.founded')}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-[#CB8D31] rounded-full flex items-center justify-center">
                    <ArrowRight className="w-3 h-3 text-white" />
                  </div>
                  <p className="text-gray-700 dark:text-foreground">{t('home.whySaudi.point1')}</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-[#CB8D31] rounded-full flex items-center justify-center">
                    <ArrowRight className="w-3 h-3 text-white" />
                  </div>
                  <p className="text-gray-700 dark:text-foreground">{t('home.whySaudi.point2')}</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-[#CB8D31] rounded-full flex items-center justify-center">
                    <ArrowRight className="w-3 h-3 text-white" />
                  </div>
                  <p className="text-gray-700 dark:text-foreground">{t('home.whySaudi.point3')}</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-[#CB8D31] rounded-full flex items-center justify-center">
                    <ArrowRight className="w-3 h-3 text-white" />
                  </div>
                  <p className="text-gray-700 dark:text-foreground">{t('home.whySaudi.point4')}</p>
                </div>
              </div>

              <div className="bg-[#CB8D31] text-white p-6 rounded-lg">
                <h3 className="text-xl font-bold mb-3 uppercase">{t('home.whySaudi.objective')}</h3>
                <p className="text-lg">
                  {t('home.whySaudi.objectiveText')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white dark:bg-background border-y dark:border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon
              return (
                <div key={index} className="text-center group hover:scale-105 transition-transform duration-300">
                  <div className={`inline-flex items-center justify-center w-16 h-16 ${stat.bg} rounded-2xl mb-4 shadow-lg group-hover:shadow-xl transition-shadow`}>
                    <Icon className="h-8 w-8" style={{ color: stat.iconColor }} />
                  </div>
                  <div className="text-4xl font-bold text-[#231F20] dark:text-foreground mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm text-[#414042] dark:text-muted-foreground font-medium">{stat.label}</div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gradient-to-b from-white to-gray-50 dark:from-background dark:to-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-gray-900 dark:text-foreground mb-4">
              {t('home.features.title')}
            </h2>
            <p className="text-xl text-gray-600 dark:text-muted-foreground max-w-3xl mx-auto">
              {t('home.features.subtitle')}
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <Card key={index} className="group hover:shadow-2xl transition-all duration-300 border border-[#E6E6E6] dark:border-border bg-white dark:bg-card hover:-translate-y-2">
                  <CardContent className="p-6">
                    <div className={`inline-flex items-center justify-center w-14 h-14 ${feature.tile} dark:bg-card rounded-xl mb-4 border border-[#E3E0DA] dark:border-border`}>
                      <Icon className="h-7 w-7" strokeWidth={1.6} style={{ color: feature.iconColor }} />
                    </div>
                    <h3 className="text-lg font-bold mb-2 text-[#231F20] dark:text-foreground">{feature.title}</h3>
                    <p className="text-sm text-[#414042] dark:text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-24 bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600 relative overflow-hidden text-white">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:32px_32px]" />
        <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-white/20 to-transparent opacity-60" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[140%] bg-white/10 blur-[180px] opacity-40 pointer-events-none" />
        <div className="container mx-auto px-4 relative">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-white mb-4 drop-shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
              {t('home.services.title')}
            </h2>
            <p className="text-xl text-white/90 max-w-3xl mx-auto">
              {t('home.services.subtitle')}
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {services.map((service, index) => {
              const Icon = service.icon
              return (
                <Card
                  key={index}
                  className="group relative overflow-hidden border border-white/15 bg-white/10 backdrop-blur-xl text-white shadow-[0_20px_45px_rgba(4,47,46,0.35)] hover:-translate-y-2 hover:border-white/30 transition-all duration-500"
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-white/15 via-transparent to-transparent" />
                  <CardContent className="p-8 relative">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white/90 rounded-2xl mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Icon className="h-8 w-8 text-emerald-700" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-white">{service.title}</h3>
                    <p className="text-white/80 mb-6">{service.description}</p>
                    <ul className="space-y-3">
                      {service.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center text-sm text-white/90">
                          <CheckCircle className="h-4 w-4 text-[#F6D58F] mr-3 flex-shrink-0 drop-shadow-[0_0_8px_rgba(0,0,0,0.25)]" />
                          {feature}
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

      {/* Our Services Section */}
      <section className="py-20 bg-white dark:bg-background relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] dark:bg-grid-white/[0.02] bg-[size:32px_32px]" />
        <div className="container mx-auto px-4 relative">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-gray-900 dark:text-foreground mb-4">
              {t('home.ourServices.title')}
            </h2>
            <p className="text-xl text-gray-600 dark:text-muted-foreground max-w-3xl mx-auto">
              {t('home.ourServices.subtitle')}
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {/* Service 1 - Business Incorporation */}
            <div className="group bg-white dark:bg-card rounded-2xl p-6 text-[#231F20] dark:text-foreground hover:bg-[#F7F5F0] dark:hover:bg-secondary transition-all duration-300 hover:scale-105 hover:shadow-2xl border border-[#F1C678]/60 dark:border-border">
              <div className="text-4xl font-bold mb-4 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">1.</div>
              <h3 className="text-xl font-bold mb-3">{t('home.ourServices.incorporate.title')}</h3>
              <p className="text-gray-600 dark:text-muted-foreground mb-4">{t('home.ourServices.incorporate.desc')}</p>
              <div className="aspect-video bg-gray-100 dark:bg-secondary rounded-lg overflow-hidden">
                <Image
                  src="/service-incorporation.jpg"
                  alt="Business incorporation and licensing documents"
                  width={400}
                  height={225}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
              </div>
            </div>
            
            {/* Service 2 - Legal Compliance */}
            <div className="group bg-white dark:bg-card rounded-2xl p-6 text-[#231F20] dark:text-foreground hover:bg-[#F7F5F0] dark:hover:bg-secondary transition-all duration-300 hover:scale-105 hover:shadow-2xl border border-[#F1C678]/60 dark:border-border">
              <div className="text-4xl font-bold mb-4 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">2.</div>
              <h3 className="text-xl font-bold mb-3">{t('home.ourServices.compliance.title')}</h3>
              <p className="text-gray-600 dark:text-muted-foreground mb-4">{t('home.ourServices.compliance.desc')}</p>
              <div className="aspect-video bg-gray-100 dark:bg-secondary rounded-lg overflow-hidden">
                <Image
                  src="/service-legal-compliance.jpg"
                  alt="Legal compliance and regulations documentation"
                  width={400}
                  height={225}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
              </div>
            </div>
            
            {/* Service 3 - Support Operations */}
            <div className="group bg-white dark:bg-card rounded-2xl p-6 text-[#231F20] dark:text-foreground hover:bg-[#F7F5F0] dark:hover:bg-secondary transition-all duration-300 hover:scale-105 hover:shadow-2xl border border-[#F1C678]/60 dark:border-border">
              <div className="text-4xl font-bold mb-4 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">3.</div>
              <h3 className="text-xl font-bold mb-3">{t('home.ourServices.operations.title')}</h3>
              <p className="text-gray-600 dark:text-muted-foreground mb-4">{t('home.ourServices.operations.desc')}</p>
              <div className="aspect-video bg-gray-100 dark:bg-secondary rounded-lg overflow-hidden">
                <Image
                  src="/service-support.jpg"
                  alt="Customer support and business operations"
                  width={400}
                  height={225}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
              </div>
            </div>
            
            {/* Service 4 - Visas & Work Permits */}
            <div className="group bg-white dark:bg-card rounded-2xl p-6 text-[#231F20] dark:text-foreground hover:bg-[#F7F5F0] dark:hover:bg-secondary transition-all duration-300 hover:scale-105 hover:shadow-2xl border border-[#F1C678]/60 dark:border-border">
              <div className="text-4xl font-bold mb-4 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">4.</div>
              <h3 className="text-xl font-bold mb-3">{t('home.ourServices.visas.title')}</h3>
              <p className="text-gray-600 dark:text-muted-foreground mb-4">{t('home.ourServices.visas.desc')}</p>
              <div className="aspect-video bg-gray-100 dark:bg-secondary rounded-lg overflow-hidden">
                <Image
                  src="/service-visa.jpg"
                  alt="Visa and work permit processing"
                  width={400}
                  height={225}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
              </div>
            </div>
            
            {/* Service 5 - VAT & Tax Registration */}
            <div className="group bg-white dark:bg-card rounded-2xl p-6 text-[#231F20] dark:text-foreground hover:bg-[#F7F5F0] dark:hover:bg-secondary transition-all duration-300 hover:scale-105 hover:shadow-2xl border border-[#F1C678]/60 dark:border-border">
              <div className="text-4xl font-bold mb-4 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">5.</div>
              <h3 className="text-xl font-bold mb-3">{t('home.ourServices.tax.title')}</h3>
              <p className="text-gray-600 dark:text-muted-foreground mb-4">{t('home.ourServices.tax.desc')}</p>
              <div className="aspect-video bg-gray-100 dark:bg-secondary rounded-lg overflow-hidden">
                <Image
                  src="/service-tax.webp"
                  alt="Tax and VAT registration documents"
                  width={400}
                  height={225}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
              </div>
            </div>
            
            {/* Service 6 - Business Bank Accounts */}
            <div className="group bg-white dark:bg-card rounded-2xl p-6 text-[#231F20] dark:text-foreground hover:bg-[#F7F5F0] dark:hover:bg-secondary transition-all duration-300 hover:scale-105 hover:shadow-2xl border border-[#F1C678]/60 dark:border-border">
              <div className="text-4xl font-bold mb-4 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">6.</div>
              <h3 className="text-xl font-bold mb-3">{t('home.ourServices.bank.title')}</h3>
              <p className="text-gray-600 dark:text-muted-foreground mb-4">{t('home.ourServices.bank.desc')}</p>
              <div className="aspect-video bg-gray-100 dark:bg-secondary rounded-lg overflow-hidden">
                <Image
                  src="/service-bank.jpg"
                  alt="Business banking and financial services"
                  width={400}
                  height={225}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20 bg-gradient-to-br from-emerald-600 to-teal-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:32px_32px]" />
        <div className="absolute inset-x-0 top-0 h-32 bg-white/20 blur-[120px] opacity-40" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-black/25 blur-[120px] opacity-20" />
        <div className="container mx-auto px-4 relative">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-4">{t('home.process.title')}</h2>
            <p className="text-xl text-white/85 max-w-3xl mx-auto">
              {t('home.process.subtitle')}
            </p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              { step: '01', title: t('home.process.step1.title'), description: t('home.process.step1.desc'), icon: Users },
              { step: '02', title: t('home.process.step2.title'), description: t('home.process.step2.desc'), icon: FileText },
              { step: '03', title: t('home.process.step3.title'), description: t('home.process.step3.desc'), icon: Zap },
              { step: '04', title: t('home.process.step4.title'), description: t('home.process.step4.desc'), icon: Rocket }
            ].map((item, index) => (
              <div key={index} className="relative h-full">
                <div className="h-full bg-white/20 backdrop-blur-xl rounded-2xl p-6 border border-white/40 shadow-[0_25px_45px_rgba(0,0,0,0.35)] hover:bg-white/30 transition-all duration-300 group flex flex-col justify-between min-h-[240px]">
                  <div>
                    <div className="text-5xl font-bold text-white mb-4 drop-shadow-[0_10px_20px_rgba(0,0,0,0.4)]">{item.step}</div>
                  <div className="flex items-center gap-3 mb-3">
                      <item.icon className="h-6 w-6 text-[#F6D58F]" />
                    <h3 className="text-xl font-bold">{item.title}</h3>
                  </div>
                    <p className="text-white/90 text-base leading-relaxed">{item.description}</p>
                  </div>
                  <div className="mt-4 h-1 w-16 bg-gradient-to-r from-[#F6D58F] via-white to-[#F1C678] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {index < 3 && (
                  <ChevronRight className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 text-white/40" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-gray-50 dark:bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-gray-900 dark:text-foreground mb-4">
              {t('home.testimonials.title')}
            </h2>
            <p className="text-xl text-gray-600 dark:text-muted-foreground max-w-3xl mx-auto">
              {t('home.testimonials.subtitle')}
            </p>
          </div>
          
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <Card 
                  key={index} 
                  className={`p-8 border border-[#E6E6E6] dark:border-border shadow-xl hover:shadow-2xl transition-all duration-500 ${
                    index === activeTestimonial ? 'ring-2 ring-[#0B6B37] scale-105 bg-white dark:bg-card' : 'bg-white/90 dark:bg-card/90'
                  }`}
                  onMouseEnter={() => setActiveTestimonial(index)}
                >
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-[#CB8D31] fill-[#CB8D31]" />
                    ))}
                  </div>
                  <p className="text-gray-700 dark:text-foreground mb-6 italic leading-relaxed">"{testimonial.content}"</p>
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{testimonial.image}</div>
                    <div>
                      <div className="font-bold text-gray-900 dark:text-foreground">{testimonial.name}</div>
                      <div className="text-sm text-gray-600 dark:text-muted-foreground">{testimonial.company}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            
            <div className="flex justify-center gap-2 mt-8">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveTestimonial(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === activeTestimonial ? 'w-8 bg-[#0B6B37]' : 'w-2 bg-gray-300 dark:bg-border'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Licenses & Standards */}
      <section className="py-20 bg-gradient-to-r from-emerald-600 to-teal-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:40px_40px]" />
        <div className="absolute inset-x-0 top-0 h-32 bg-white/10 blur-[120px] opacity-60" />
        <div className="container mx-auto px-4 relative">
          <div className="mb-12 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/30 mb-4 backdrop-blur-sm">
                <span className="h-2 w-2 rounded-full bg-[#F6D58F]" />
                <span className="text-xs font-semibold tracking-[0.22em] uppercase text-white/90">
                  {t('home.licenses.badge')}
                </span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-3">
                {t('home.licenses.title')}
              </h2>
              <p className="text-base md:text-lg text-white/85 max-w-2xl">
                {t('home.licenses.subtitle')}
              </p>
            </div>
            <div className="hidden md:flex flex-col items-end text-right text-sm text-white/85">
              <span className="font-semibold text-[#F6D58F]">{t('home.licenses.licensed')}</span>
              <span>Saudi Business Center • MISA • GOSI • ZATCA • Qiwa • Absher • Mudad • Muqeem</span>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-4 sm:grid-cols-2">
            {licenses.map((license) => (
              <div
                key={license.name}
                className="group flex items-center justify-center bg-white/95 rounded-2xl border border-white/60 shadow-[0_18px_40px_rgba(0,0,0,0.25)] px-6 py-6 hover:shadow-[0_22px_50px_rgba(0,0,0,0.4)] hover:border-[#F6D58F] transition-all duration-300 backdrop-blur-sm"
              >
                <Image
                  src={license.src}
                  alt={license.name}
                  width={220}
                  height={120}
                  className={`object-contain w-auto opacity-90 group-hover:opacity-100 transition-opacity duration-300 ${
                    (license.name.includes('Ministry of Investment') ||
                      license.name.includes('Saudi Business Center') ||
                      license.name.includes('GOSI'))
                      ? 'h-20 md:h-28'
                      : 'h-16 md:h-24'
                  }`}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose TK.SA Section */}
      <section className="py-16 bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-card dark:via-background dark:to-card relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-gray-200/[0.05] dark:bg-grid-white/[0.02] bg-[size:40px_40px]" />
        <div className="container mx-auto px-4 relative">
          {/* Header */}
          <div className="text-center mb-12">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-foreground mb-4 leading-tight">
              {t('home.whyChoose.title')}
            </h2>
            <p className="text-lg text-gray-600 dark:text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              {t('home.whyChoose.subtitle')}
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 items-center">
            {/* Left Side - 3 Points */}
            <div className="space-y-4">
              {[
                {
                  title: t('home.whyChoose.point1.title'),
                  description: t('home.whyChoose.point1.desc')
                },
                {
                  title: t('home.whyChoose.point2.title'),
                  description: t('home.whyChoose.point2.desc')
                },
                {
                  title: t('home.whyChoose.point3.title'),
                  description: t('home.whyChoose.point3.desc')
                }
              ].map((item, idx) => (
                <div key={idx} className="group flex items-start space-x-4 p-5 bg-white dark:bg-card rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-border hover:border-[#CB8D31]/40">
                  <div className="flex-shrink-0 w-11 h-11 bg-[#F7F5F0] dark:bg-secondary rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-[#E3E0DA] dark:border-border">
                    <CheckCircle className="w-5 h-5 text-[#CB8D31]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-foreground mb-1 group-hover:text-[#0B6B37] transition-colors">{item.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Center - Logo */}
            <div className="hidden lg:flex flex-col items-center justify-center">
              <div className="relative group max-w-sm mx-auto">
                <div className="bg-white dark:bg-card rounded-3xl p-8 shadow-[0_25px_60px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.3)] border border-[#F1C678]/50 dark:border-border group-hover:scale-105 transition-transform duration-300 flex items-center justify-center">
                  <Image
                    src="/logo-vertical.png"
                    alt="Tabadl Alkon official logo"
                    width={160}
                    height={200}
                    sizes="(max-width: 768px) 128px, 160px"
                    className="w-32 md:w-40 h-auto object-contain"
                    loading="lazy"
                  />
                  </div>
                <div className="absolute -top-4 -right-4 w-10 h-10 bg-gradient-to-br from-[#CB8D31] to-[#8C5A1F] rounded-full opacity-20 group-hover:opacity-50 transition-opacity" />
                <div className="absolute -bottom-4 -left-4 w-8 h-8 bg-gradient-to-br from-[#0B6B37] to-[#094F2A] rounded-full opacity-20 group-hover:opacity-50 transition-opacity" />
              </div>
            </div>
            
            {/* Right Side - 3 Points */}
            <div className="space-y-4">
              {[
                {
                  title: t('home.whyChoose.point4.title'),
                  description: t('home.whyChoose.point4.desc')
                },
                {
                  title: t('home.whyChoose.point5.title'),
                  description: t('home.whyChoose.point5.desc')
                },
                {
                  title: t('home.whyChoose.point6.title'),
                  description: t('home.whyChoose.point6.desc')
                }
              ].map((item, idx) => (
                <div key={idx} className="group flex items-start space-x-4 p-5 bg-white dark:bg-card rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-border hover:border-[#CB8D31]/40">
                  <div className="flex-shrink-0 w-11 h-11 bg-[#F7F5F0] dark:bg-secondary rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-[#E3E0DA] dark:border-border">
                    <CheckCircle className="w-5 h-5 text-[#CB8D31]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-foreground mb-1 group-hover:text-[#0B6B37] transition-colors">{item.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-emerald-600 to-teal-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:32px_32px]" />
        <div className="container mx-auto px-4 text-center relative">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
            {t('home.cta.title')}
          </h2>
          <p className="text-xl text-white/85 mb-10 max-w-3xl mx-auto">
            {t('home.cta.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="bg-white text-[#0B6B37] hover:bg-gray-100 shadow-xl hover:shadow-2xl transition-all px-10 py-6 text-lg">
                {t('home.cta.getStarted')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" className="bg-transparent border-2 border-white text-white hover:bg-white/10 px-10 py-6 text-lg">
                {t('home.cta.contactSales')}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <MainFooter />
    </div>
  )
}
