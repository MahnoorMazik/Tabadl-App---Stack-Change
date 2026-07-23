'use client'

import { WifiOff, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function OfflinePage() {
  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Icon */}
        <div className="mx-auto w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
          <WifiOff className="w-12 h-12 text-gray-500" />
        </div>

        {/* Content */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-gray-900">
            You&apos;re Offline
          </h1>
          <p className="text-gray-600 text-lg">
            It looks like you&apos;ve lost your internet connection. 
            Please check your network and try again.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={handleRefresh}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          
          <Link href="/">
            <Button variant="outline" className="w-full sm:w-auto">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </Link>
        </div>

        {/* Tips */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h2 className="font-semibold text-gray-900 mb-3">
            While you&apos;re offline:
          </h2>
          <ul className="text-left text-gray-600 space-y-2 text-sm">
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 mr-2 flex-shrink-0" />
              You can still view previously loaded pages
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 mr-2 flex-shrink-0" />
              Some features may be limited until you reconnect
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 mr-2 flex-shrink-0" />
              Your data will sync automatically when online
            </li>
          </ul>
        </div>

        {/* Footer */}
        <p className="text-sm text-gray-500">
          TK.sa - Company Formation Platform
        </p>
      </div>
    </div>
  )
}
