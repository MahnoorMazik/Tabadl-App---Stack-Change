'use client'

import localFont from 'next/font/local'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Home, ArrowLeft, Search, Mail, Info } from 'lucide-react'
import Link from 'next/link'
import { MainHeader } from '@/components/MainHeader'
import { MainFooter } from '@/components/MainFooter'

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

export default function NotFound() {
  return (
    <div className={`${montserrat.className} min-h-screen bg-[radial-gradient(circle_at_top,_#f7f5f0,_#ffffff)] flex flex-col`}>
      <MainHeader />

      <main className="flex-1 flex items-center justify-center px-4 pt-28 pb-16 md:pt-32">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-8">
            {/* Logo */}
            <Link href="/">
              <img
                src="/logo-horizontal.png"
                alt="TABADL ALKON"
                className="h-10 w-auto mx-auto mb-6 cursor-pointer"
              />
            </Link>

            {/* 404 Heading */}
            <div className="relative mb-6">
              <h1 className="text-[120px] md:text-[160px] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-600 leading-none select-none drop-shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
                404
              </h1>
              <div className="absolute inset-0 flex items-center justify-center">
                <Search className="h-10 w-10 md:h-12 md:w-12 text-[#CB8D31] animate-bounce drop-shadow-[0_10px_25px_rgba(0,0,0,0.35)]" />
              </div>
            </div>

            {/* Error Message */}
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Page not found
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              The page you&apos;re trying to reach doesn&apos;t exist or may have been moved. Let&apos;s get you
              back to building your business in Saudi Arabia.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/">
                <Button size="lg" className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg border-0 px-8 py-5 text-base font-semibold">
                  <Home className="mr-2 h-5 w-5" />
                  Back to Home
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-emerald-600 text-emerald-700 bg-white hover:bg-emerald-50 px-8 py-5 text-base font-semibold"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Go Back
              </Button>
            </div>
          </div>

          {/* Helpful Links */}
          <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
            <CardContent className="p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
                Quick navigation
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <Link href="/" className="group">
                  <div className="flex items-center gap-4 p-4 rounded-xl hover:bg-emerald-50 transition-all border border-gray-200 hover:border-emerald-300">
                    <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Home className="h-6 w-6 text-emerald-700" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Home</div>
                      <div className="text-sm text-gray-600">Back to the main landing page</div>
                    </div>
                  </div>
                </Link>

                <Link href="/about-us" className="group">
                  <div className="flex items-center gap-4 p-4 rounded-xl hover:bg-[#FFF6E8] transition-all border border-gray-200 hover:border-[#F1C678]">
                    <div className="w-12 h-12 bg-[#FFF3D6] rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Info className="h-6 w-6 text-[#CB8D31]" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">About TABADL ALKON</div>
                      <div className="text-sm text-gray-600">Learn more about our story and team</div>
                    </div>
                  </div>
                </Link>

                <Link href="/contact" className="group">
                  <div className="flex items-center gap-4 p-4 rounded-xl hover:bg-emerald-50 transition-all border border-gray-200 hover:border-emerald-300">
                    <div className="w-12 h-12 bg-[#FFF3D6] rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Mail className="h-6 w-6 text-[#CB8D31]" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Contact us</div>
                      <div className="text-sm text-gray-600">Talk to our business advisory team</div>
                    </div>
                  </div>
                </Link>

                <Link href="/login" className="group">
                  <div className="flex items-center gap-4 p-4 rounded-xl hover:bg-emerald-50 transition-all border border-gray-200 hover:border-emerald-300">
                    <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="h-6 w-6 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                        />
                      </svg>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Login</div>
                      <div className="text-sm text-gray-600">Access your TK.sa account</div>
                    </div>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Support Message */}
          <div className="text-center mt-8 text-gray-600">
            <p className="text-sm">
              Still need help?{' '}
              <Link href="/contact" className="text-emerald-700 hover:text-emerald-800 font-semibold">
                Contact our support team
              </Link>
            </p>
          </div>
        </div>
      </main>

      <MainFooter />
    </div>
  )
}


