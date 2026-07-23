'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Cookie, Settings, BarChart, Shield, Eye } from 'lucide-react'
import Link from 'next/link'
import { MainHeader } from '@/components/MainHeader'
import { MainFooter } from '@/components/MainFooter'

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-white">
      <MainHeader />

      {/* Hero Section */}
      <section className="pt-32 pb-16 bg-gradient-to-br from-emerald-50 via-white to-amber-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-3 mb-6 bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full text-sm font-semibold">
              <Cookie className="h-4 w-4" />
              Cookie & Tracking Policy
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-emerald-700 via-teal-600 to-amber-600">
              Cookie Policy
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Learn about how we use cookies and similar technologies to enhance your experience on our website.
            </p>
            <p className="text-sm text-gray-500 mt-4">
              Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6 text-center">
                  <Settings className="h-12 w-12 text-emerald-600 mx-auto mb-4" />
                  <h3 className="font-bold text-lg mb-2">Essential Cookies</h3>
                  <p className="text-sm text-gray-600">Required for basic website functionality</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6 text-center">
                  <BarChart className="h-12 w-12 text-emerald-600 mx-auto mb-4" />
                  <h3 className="font-bold text-lg mb-2">Analytics Cookies</h3>
                  <p className="text-sm text-gray-600">Help us understand how you use our site</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6 text-center">
                  <Shield className="h-12 w-12 text-amber-600 mx-auto mb-4" />
                  <h3 className="font-bold text-lg mb-2">Privacy First</h3>
                  <p className="text-sm text-gray-600">Your privacy and preferences are respected</p>
                </CardContent>
              </Card>
            </div>

            <div className="prose prose-lg max-w-none">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">What Are Cookies?</h2>
              <p className="text-gray-600 mb-6">
                Cookies are small text files that are stored on your device when you visit our website. They help us provide you with a better experience by remembering your preferences and understanding how you use our site.
              </p>

              <h2 className="text-3xl font-bold text-gray-900 mb-6 mt-12">Types of Cookies We Use</h2>
              
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Essential Cookies</h3>
              <p className="text-gray-600 mb-4">
                These cookies are necessary for the website to function properly. They enable basic functions like page navigation, access to secure areas, and remembering your login status.
              </p>
              <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
                <li>Authentication cookies to keep you logged in</li>
                <li>Security cookies to protect against fraud</li>
                <li>Session cookies for basic website functionality</li>
                <li>Load balancing cookies for performance</li>
              </ul>

              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Analytics Cookies</h3>
              <p className="text-gray-600 mb-4">
                These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously.
              </p>
              <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
                <li>Google Analytics for website traffic analysis</li>
                <li>Page view tracking and user behavior</li>
                <li>Performance monitoring and optimization</li>
                <li>Error tracking and debugging</li>
              </ul>

              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Functional Cookies</h3>
              <p className="text-gray-600 mb-4">
                These cookies enable enhanced functionality and personalization, such as remembering your preferences and settings.
              </p>
              <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
                <li>Language and region preferences</li>
                <li>Theme and display settings</li>
                <li>Form data and user preferences</li>
                <li>Customization options</li>
              </ul>

              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Marketing Cookies</h3>
              <p className="text-gray-600 mb-4">
                These cookies are used to track visitors across websites to display relevant and engaging advertisements.
              </p>
              <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
                <li>Social media integration cookies</li>
                <li>Advertising and remarketing cookies</li>
                <li>Conversion tracking</li>
                <li>Campaign performance measurement</li>
              </ul>

              <h2 className="text-3xl font-bold text-gray-900 mb-6 mt-12">Cookie Duration</h2>
              <p className="text-gray-600 mb-6">
                Cookies have different lifespans depending on their purpose:
              </p>
              
              <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
                <li><strong>Session Cookies:</strong> Deleted when you close your browser</li>
                <li><strong>Persistent Cookies:</strong> Remain on your device for a set period</li>
                <li><strong>Authentication Cookies:</strong> Typically expire after 30 days</li>
                <li><strong>Analytics Cookies:</strong> May persist for up to 2 years</li>
              </ul>

              <h2 className="text-3xl font-bold text-gray-900 mb-6 mt-12">Managing Your Cookie Preferences</h2>
              <p className="text-gray-600 mb-6">
                You have control over which cookies you accept. You can manage your preferences through:
              </p>
              
              <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
                <li>Our cookie consent banner when you first visit</li>
                <li>Your browser settings to block or delete cookies</li>
                <li>Third-party opt-out tools for advertising cookies</li>
                <li>Contacting us directly to update your preferences</li>
              </ul>

              <h2 className="text-3xl font-bold text-gray-900 mb-6 mt-12">Browser Settings</h2>
              <p className="text-gray-600 mb-6">
                Most web browsers allow you to control cookies through their settings. You can:
              </p>
              
              <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
                <li>Block all cookies</li>
                <li>Block third-party cookies only</li>
                <li>Delete existing cookies</li>
                <li>Set up notifications for new cookies</li>
              </ul>

              <h2 className="text-3xl font-bold text-gray-900 mb-6 mt-12">Third-Party Cookies</h2>
              <p className="text-gray-600 mb-6">
                Some cookies on our site are set by third-party services that appear on our pages. These include:
              </p>
              
              <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
                <li>Google Analytics for website analytics</li>
                <li>Social media platforms for sharing features</li>
                <li>Payment processors for secure transactions</li>
                <li>Customer support tools for live chat</li>
              </ul>

              <h2 className="text-3xl font-bold text-gray-900 mb-6 mt-12">Impact of Disabling Cookies</h2>
              <p className="text-gray-600 mb-6">
                If you choose to disable cookies, some features of our website may not function properly:
              </p>
              
              <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
                <li>You may need to log in repeatedly</li>
                <li>Your preferences may not be saved</li>
                <li>Some interactive features may not work</li>
                <li>Personalized content may not be available</li>
              </ul>

              <h2 className="text-3xl font-bold text-gray-900 mb-6 mt-12">Updates to This Policy</h2>
              <p className="text-gray-600 mb-6">
                We may update this cookie policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any material changes.
              </p>

              <h2 className="text-3xl font-bold text-gray-900 mb-6 mt-12">Contact Us</h2>
              <p className="text-gray-600 mb-6">
                If you have any questions about our use of cookies or this policy, please contact us:
              </p>
              
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="text-gray-700 mb-2"><strong>Email:</strong> privacy@tk.sa</p>
                <p className="text-gray-700 mb-2"><strong>Phone:</strong> +966 50 123 4567</p>
                <p className="text-gray-700"><strong>Address:</strong> Tabadl Alkon, Riyadh, Saudi Arabia</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <MainFooter />
    </div>
  )
}
