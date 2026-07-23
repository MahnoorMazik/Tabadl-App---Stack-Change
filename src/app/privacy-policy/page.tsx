'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Shield, Eye, Lock, Database, UserCheck } from 'lucide-react'
import Link from 'next/link'
import { MainHeader } from '@/components/MainHeader'
import { MainFooter } from '@/components/MainFooter'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white">
      <MainHeader />

      {/* Hero Section */}
      <section className="pt-32 pb-16 bg-gradient-to-br from-emerald-50 via-white to-amber-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-3 mb-6 bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full text-sm font-semibold">
              <Shield className="h-4 w-4" />
              Privacy & Data Protection
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-emerald-700 via-teal-600 to-amber-600">
              Privacy Policy
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Your privacy is important to us. This policy explains how we collect, use, and protect your personal information.
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
                  <Eye className="h-12 w-12 text-emerald-600 mx-auto mb-4" />
                  <h3 className="font-bold text-lg mb-2">Data Collection</h3>
                  <p className="text-sm text-gray-600">We collect only necessary information to provide our services</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6 text-center">
                  <Lock className="h-12 w-12 text-emerald-600 mx-auto mb-4" />
                  <h3 className="font-bold text-lg mb-2">Data Security</h3>
                  <p className="text-sm text-gray-600">Your data is protected with industry-standard security measures</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6 text-center">
                  <UserCheck className="h-12 w-12 text-amber-600 mx-auto mb-4" />
                  <h3 className="font-bold text-lg mb-2">Your Rights</h3>
                  <p className="text-sm text-gray-600">You have full control over your personal information</p>
                </CardContent>
              </Card>
            </div>

            <div className="prose prose-lg max-w-none">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Information We Collect</h2>
              <p className="text-gray-600 mb-6">
                We collect information you provide directly to us, such as when you create an account, use our services, or contact us for support.
              </p>
              
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Personal Information</h3>
              <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
                <li>Name and contact information (email, phone number, address)</li>
                <li>Business information (company name, registration details)</li>
                <li>Account credentials and preferences</li>
                <li>Payment and billing information</li>
                <li>Communication records and support interactions</li>
              </ul>

              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Usage Information</h3>
              <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
                <li>Website usage patterns and preferences</li>
                <li>Device information and browser type</li>
                <li>IP address and location data</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>

              <h2 className="text-3xl font-bold text-gray-900 mb-6 mt-12">How We Use Your Information</h2>
              <p className="text-gray-600 mb-6">
                We use the information we collect to provide, maintain, and improve our services, process transactions, and communicate with you.
              </p>
              
              <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
                <li>Provide and maintain our business formation services</li>
                <li>Process applications and manage your account</li>
                <li>Send important updates and notifications</li>
                <li>Improve our website and services</li>
                <li>Comply with legal obligations</li>
                <li>Prevent fraud and ensure security</li>
              </ul>

              <h2 className="text-3xl font-bold text-gray-900 mb-6 mt-12">Data Sharing and Disclosure</h2>
              <p className="text-gray-600 mb-6">
                We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
              </p>
              
              <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
                <li>With government authorities as required for business registration</li>
                <li>With trusted service providers who assist in our operations</li>
                <li>When required by law or to protect our rights</li>
                <li>With your explicit consent</li>
              </ul>

              <h2 className="text-3xl font-bold text-gray-900 mb-6 mt-12">Data Security</h2>
              <p className="text-gray-600 mb-6">
                We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
              </p>
              
              <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
                <li>Encryption of sensitive data in transit and at rest</li>
                <li>Regular security assessments and updates</li>
                <li>Access controls and authentication measures</li>
                <li>Secure data storage and backup procedures</li>
              </ul>

              <h2 className="text-3xl font-bold text-gray-900 mb-6 mt-12">Your Rights</h2>
              <p className="text-gray-600 mb-6">
                You have the right to access, update, or delete your personal information. You can also opt out of certain communications from us.
              </p>
              
              <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
                <li>Access your personal information</li>
                <li>Correct inaccurate or incomplete data</li>
                <li>Request deletion of your information</li>
                <li>Object to processing of your data</li>
                <li>Data portability</li>
                <li>Withdraw consent at any time</li>
              </ul>

              <h2 className="text-3xl font-bold text-gray-900 mb-6 mt-12">Cookies and Tracking</h2>
              <p className="text-gray-600 mb-6">
                We use cookies and similar technologies to enhance your experience on our website, analyze usage patterns, and provide personalized content.
              </p>

              <h2 className="text-3xl font-bold text-gray-900 mb-6 mt-12">Changes to This Policy</h2>
              <p className="text-gray-600 mb-6">
                We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.
              </p>

              <h2 className="text-3xl font-bold text-gray-900 mb-6 mt-12">Contact Us</h2>
              <p className="text-gray-600 mb-6">
                If you have any questions about this privacy policy or our data practices, please contact us:
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
