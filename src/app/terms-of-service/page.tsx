'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, FileText, Scale, Users, Shield, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { MainHeader } from '@/components/MainHeader'
import { MainFooter } from '@/components/MainFooter'

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-white">
      <MainHeader />

      {/* Hero Section */}
      <section className="pt-32 pb-16 bg-gradient-to-br from-emerald-50 via-white to-amber-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-3 mb-6 bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full text-sm font-semibold">
              <FileText className="h-4 w-4" />
              Legal Terms & Conditions
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-emerald-700 via-teal-600 to-amber-600">
              Terms of Service
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Please read these terms carefully before using our services. By using our platform, you agree to be bound by these terms.
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
                  <Scale className="h-12 w-12 text-emerald-600 mx-auto mb-4" />
                  <h3 className="font-bold text-lg mb-2">Legal Compliance</h3>
                  <p className="text-sm text-gray-600">All services comply with Saudi Arabian business laws</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6 text-center">
                  <Users className="h-12 w-12 text-emerald-600 mx-auto mb-4" />
                  <h3 className="font-bold text-lg mb-2">User Rights</h3>
                  <p className="text-sm text-gray-600">Clear terms protecting your rights and interests</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6 text-center">
                  <Shield className="h-12 w-12 text-amber-600 mx-auto mb-4" />
                  <h3 className="font-bold text-lg mb-2">Service Protection</h3>
                  <p className="text-sm text-gray-600">Terms that protect both parties in our relationship</p>
                </CardContent>
              </Card>
            </div>

            <div className="prose prose-lg max-w-none">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Acceptance of Terms</h2>
              <p className="text-gray-600 mb-6">
                By accessing and using TABADL ALKON's services, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>

              <h2 className="text-3xl font-bold text-gray-900 mb-6 mt-12">Description of Service</h2>
              <p className="text-gray-600 mb-6">
                TABADL ALKON provides business formation and registration services in Saudi Arabia, including but not limited to:
              </p>
              
              <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
                <li>Company registration and incorporation services</li>
                <li>Business license acquisition and renewal</li>
                <li>Chamber of Commerce registration</li>
                <li>MOMRA license applications</li>
                <li>Ongoing business support and compliance services</li>
                <li>Document preparation and filing assistance</li>
              </ul>

              <h2 className="text-3xl font-bold text-gray-900 mb-6 mt-12">User Responsibilities</h2>
              <p className="text-gray-600 mb-6">
                As a user of our services, you agree to:
              </p>
              
              <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
                <li>Provide accurate and complete information</li>
                <li>Maintain the confidentiality of your account credentials</li>
                <li>Comply with all applicable laws and regulations</li>
                <li>Use our services only for lawful purposes</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
                <li>Pay all fees and charges in a timely manner</li>
              </ul>

              <h2 className="text-3xl font-bold text-gray-900 mb-6 mt-12">Service Availability</h2>
              <p className="text-gray-600 mb-6">
                We strive to provide continuous service availability, but we do not guarantee uninterrupted access. We may temporarily suspend services for maintenance, updates, or other operational reasons.
              </p>

              <h2 className="text-3xl font-bold text-gray-900 mb-6 mt-12">Payment Terms</h2>
              <p className="text-gray-600 mb-6">
                Payment for our services is due as specified in your service agreement. We accept various payment methods and all fees are non-refundable unless otherwise specified.
              </p>
              
              <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
                <li>All fees must be paid in advance or as agreed</li>
                <li>Late payments may result in service suspension</li>
                <li>Refunds are subject to our refund policy</li>
                <li>Additional fees may apply for expedited services</li>
              </ul>

              <h2 className="text-3xl font-bold text-gray-900 mb-6 mt-12">Intellectual Property</h2>
              <p className="text-gray-600 mb-6">
                All content, trademarks, and intellectual property on our platform are owned by TABADL ALKON or our licensors. You may not use our content without written permission.
              </p>

              <h2 className="text-3xl font-bold text-gray-900 mb-6 mt-12">Limitation of Liability</h2>
              <p className="text-gray-600 mb-6">
                To the maximum extent permitted by law, TABADL ALKON shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of our services.
              </p>

              <h2 className="text-3xl font-bold text-gray-900 mb-6 mt-12">Service Guarantees</h2>
              <p className="text-gray-600 mb-6">
                While we strive to provide accurate and timely services, we cannot guarantee specific outcomes. Government processing times and requirements may vary and are beyond our control.
              </p>

              <h2 className="text-3xl font-bold text-gray-900 mb-6 mt-12">Termination</h2>
              <p className="text-gray-600 mb-6">
                We may terminate or suspend your account and access to our services at our sole discretion, without prior notice, for conduct that we believe violates these terms or is harmful to other users.
              </p>

              <h2 className="text-3xl font-bold text-gray-900 mb-6 mt-12">Governing Law</h2>
              <p className="text-gray-600 mb-6">
                These terms shall be governed by and construed in accordance with the laws of the Kingdom of Saudi Arabia. Any disputes shall be resolved in the courts of Saudi Arabia.
              </p>

              <h2 className="text-3xl font-bold text-gray-900 mb-6 mt-12">Changes to Terms</h2>
              <p className="text-gray-600 mb-6">
                We reserve the right to modify these terms at any time. We will notify users of any material changes via email or through our platform. Continued use of our services constitutes acceptance of the modified terms.
              </p>

              <h2 className="text-3xl font-bold text-gray-900 mb-6 mt-12">Contact Information</h2>
              <p className="text-gray-600 mb-6">
                If you have any questions about these terms of service, please contact us:
              </p>
              
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="text-gray-700 mb-2"><strong>Email:</strong> legal@tk.sa</p>
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
