'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { MobileLayout } from '@/lib/mobile-layout-utils'
import { useMobileSidebar } from '@/hooks/use-mobile-sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Loader2, CreditCard } from 'lucide-react'
import axios from 'axios'
import { formatCurrency } from '@/lib/payments/utils'

function PaymentStatusContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sidebar = useMobileSidebar()
  const orderId = searchParams.get('orderId')
  const urlStatus = searchParams.get('status')
  const isMock = searchParams.get('mock') === 'true'

  const [status, setStatus] = useState<'Pending' | 'Success' | 'Failed' | 'Unknown'>('Pending')
  const [amount, setAmount] = useState<number | null>(null)
  const [polling, setPolling] = useState(true)

  useEffect(() => {
    if (!orderId) {
      setStatus('Unknown')
      setPolling(false)
      return
    }

    let attempts = 0
    const maxAttempts = isMock ? 10 : 30

    const checkStatus = async () => {
      try {
        const token = localStorage.getItem('auth-token')
        const headers = token ? { Authorization: `Bearer ${token}` } : {}
        const response = await axios.get(`/api/payments/edfapay/status?orderId=${orderId}`, { headers })
        const data = response.data

        setAmount(data.amount ?? null)

        if (data.status === 'Success') {
          setStatus('Success')
          setPolling(false)
          return
        }

        if (data.status === 'Unknown') {
          setStatus(urlStatus === 'success' ? 'Pending' : 'Unknown')
        } else if (data.status === 'Failed') {
          setStatus('Failed')
          setPolling(false)
          return
        }

        attempts++
        if (attempts >= maxAttempts) {
          setStatus(urlStatus === 'success' ? 'Success' : 'Pending')
          setPolling(false)
        }
      } catch {
        attempts++
        if (attempts >= maxAttempts) {
          setStatus('Unknown')
          setPolling(false)
        }
      }
    }

    checkStatus()
    const interval = setInterval(() => {
      if (polling) checkStatus()
    }, 2000)

    return () => clearInterval(interval)
  }, [orderId, urlStatus, isMock, polling])

  const statusConfig = {
    Success: {
      icon: <CheckCircle className="h-16 w-16 text-green-500" />,
      title: 'Payment Successful',
      message: 'Your payment has been processed successfully.',
      color: 'text-green-700',
    },
    Failed: {
      icon: <XCircle className="h-16 w-16 text-red-500" />,
      title: 'Payment Failed',
      message: 'Your payment could not be processed. Please try again.',
      color: 'text-red-700',
    },
    Pending: {
      icon: <Loader2 className="h-16 w-16 text-amber-500 animate-spin" />,
      title: 'Processing Payment',
      message: 'Please wait while we confirm your payment...',
      color: 'text-amber-700',
    },
    Unknown: {
      icon: <XCircle className="h-16 w-16 text-gray-400" />,
      title: 'Payment Status Unknown',
      message: 'We could not verify your payment status. Contact support if you were charged.',
      color: 'text-gray-700',
    },
  }

  const config = statusConfig[status]

  return (
    <MobileLayout
      isSidebarCollapsed={sidebar.isSidebarCollapsed}
      isMobileSidebarOpen={sidebar.isMobileSidebarOpen}
      onToggleMobile={sidebar.toggleMobileSidebar}
      onToggleDesktop={sidebar.toggleDesktopSidebar}
      onCloseMobile={sidebar.closeMobileSidebar}
      title="Payment Status"
      icon={<CreditCard className="h-5 w-5 text-emerald-600" />}
    >
      <div className="max-w-lg mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">{config.icon}</div>
            <CardTitle className={config.color}>{config.title}</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">{config.message}</p>
            {amount !== null && (
              <p className="text-lg font-semibold">{formatCurrency(amount)}</p>
            )}
            {orderId && (
              <p className="text-xs text-muted-foreground">Order: {orderId}</p>
            )}
            {isMock && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded p-2">Mock payment mode</p>
            )}
            <div className="flex gap-3 justify-center pt-4">
              <Button variant="outline" onClick={() => router.push('/client/invoices')}>
                View Invoices
              </Button>
              {status === 'Failed' && (
                <Button onClick={() => router.push('/client/invoices')}>Try Again</Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  )
}

export default function PaymentStatusPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <PaymentStatusContent />
    </Suspense>
  )
}
