'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { MobileLayout } from '@/lib/mobile-layout-utils'
import { useMobileSidebar } from '@/hooks/use-mobile-sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { CreditCard, Loader2, Receipt } from 'lucide-react'
import axios from 'axios'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/payments/utils'

interface Invoice {
  id: string
  invoiceNumber: string
  amount: number
  status: string
  dueDate: string | null
  createdAt: string
  payments: { amount: number; status: string }[]
}

const STATUS_COLORS: Record<string, string> = {
  PAID: 'bg-green-100 text-green-800',
  SENT: 'bg-blue-100 text-blue-800',
  DRAFT: 'bg-gray-100 text-gray-800',
  OVERDUE: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-500',
}

export default function ClientInvoicesPage() {
  const { user, token } = useAuth()
  const { toast } = useToast()
  const sidebar = useMobileSidebar()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [payDialogOpen, setPayDialogOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [paying, setPaying] = useState(false)
  const [form, setForm] = useState({
    payerEmail: '',
    payerName: '',
    payerPhone: '',
    payerAddress: '',
    payerCity: 'Riyadh',
    payerCountry: 'SA',
    payerZip: '12345',
  })

  const authHeaders = () => {
    const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null)
    return authToken ? { Authorization: `Bearer ${authToken}` } : {}
  }

  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        payerEmail: user.email || '',
        payerName: user.name || '',
      }))
    }
  }, [user])

  useEffect(() => {
    fetchInvoices()
  }, [token])

  const fetchInvoices = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/invoices', { headers: authHeaders() })
      const list = response.data?.data?.invoices || response.data?.invoices || []
      setInvoices(list)
    } catch (error) {
      console.error('Failed to load invoices:', error)
      toast({ title: 'Error', description: 'Failed to load invoices', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const getPaidAmount = (invoice: Invoice) =>
    invoice.payments
      .filter((p) => p.status === 'Success')
      .reduce((sum, p) => sum + p.amount, 0)

  const getRemaining = (invoice: Invoice) => Math.max(0, invoice.amount - getPaidAmount(invoice))

  const canPay = (invoice: Invoice) =>
    !['PAID', 'CANCELLED'].includes(invoice.status) && getRemaining(invoice) > 0

  const openPayDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setPayDialogOpen(true)
  }

  const handlePay = async () => {
    if (!selectedInvoice) return

    setPaying(true)
    try {
      const response = await axios.post(
        '/api/payments/edfapay/initiate',
        {
          invoiceId: selectedInvoice.id,
          payerEmail: form.payerEmail,
          payerName: form.payerName,
          payerPhone: form.payerPhone,
          payerAddress: form.payerAddress,
          payerCity: form.payerCity,
          payerCountry: form.payerCountry,
          payerZip: form.payerZip,
        },
        { headers: authHeaders() }
      )

      const paymentUrl = response.data.paymentUrl
      if (paymentUrl) {
        window.location.href = paymentUrl
      } else {
        throw new Error('No payment URL returned')
      }
    } catch (error: any) {
      toast({
        title: 'Payment Failed',
        description: error.response?.data?.error || error.message || 'Could not start payment',
        variant: 'destructive',
      })
    } finally {
      setPaying(false)
    }
  }

  return (
    <MobileLayout
      isSidebarCollapsed={sidebar.isSidebarCollapsed}
      isMobileSidebarOpen={sidebar.isMobileSidebarOpen}
      onToggleMobile={sidebar.toggleMobileSidebar}
      onToggleDesktop={sidebar.toggleDesktopSidebar}
      onCloseMobile={sidebar.closeMobileSidebar}
      title="My Invoices"
      description="View and pay your invoices online"
      icon={<Receipt className="h-5 w-5 text-emerald-600" />}
    >
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : invoices.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No invoices found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => {
                    const remaining = getRemaining(invoice)
                    return (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                        <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                        <TableCell>{formatCurrency(getPaidAmount(invoice))}</TableCell>
                        <TableCell>
                          {invoice.dueDate
                            ? format(new Date(invoice.dueDate), 'MMM d, yyyy')
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[invoice.status] || 'bg-gray-100'}>
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {canPay(invoice) ? (
                            <Button size="sm" onClick={() => openPayDialog(invoice)}>
                              <CreditCard className="h-4 w-4 mr-1" />
                              Pay {formatCurrency(remaining)}
                            </Button>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pay Invoice</DialogTitle>
            <DialogDescription>
              {selectedInvoice
                ? `Pay ${formatCurrency(getRemaining(selectedInvoice))} for ${selectedInvoice.invoiceNumber}`
                : 'Enter payment details'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="payerEmail">Email *</Label>
              <Input
                id="payerEmail"
                type="email"
                value={form.payerEmail}
                onChange={(e) => setForm((f) => ({ ...f, payerEmail: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="payerName">Full Name *</Label>
              <Input
                id="payerName"
                value={form.payerName}
                onChange={(e) => setForm((f) => ({ ...f, payerName: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="payerPhone">Phone *</Label>
              <Input
                id="payerPhone"
                value={form.payerPhone}
                onChange={(e) => setForm((f) => ({ ...f, payerPhone: e.target.value }))}
                placeholder="+966501234567"
              />
            </div>
            <div>
              <Label htmlFor="payerAddress">Address *</Label>
              <Input
                id="payerAddress"
                value={form.payerAddress}
                onChange={(e) => setForm((f) => ({ ...f, payerAddress: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="payerCity">City *</Label>
                <Input
                  id="payerCity"
                  value={form.payerCity}
                  onChange={(e) => setForm((f) => ({ ...f, payerCity: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="payerZip">Postal Code *</Label>
                <Input
                  id="payerZip"
                  value={form.payerZip}
                  onChange={(e) => setForm((f) => ({ ...f, payerZip: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialogOpen(false)} disabled={paying}>
              Cancel
            </Button>
            <Button onClick={handlePay} disabled={paying}>
              {paying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Proceed to Payment'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  )
}
