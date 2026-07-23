'use client'

import { useState, useEffect } from 'react'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DollarSign, Plus, Calendar } from 'lucide-react'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'
import { format } from 'date-fns'
import { toast } from '@/hooks/use-toast'
import { PageUnderConstruction } from '@/components/PageUnderConstruction'
import { useLocale } from '@/contexts/LocaleContext'

export default function PaymentsPage() {
  const { token } = useAuth()
  const { t, formatNumber } = useLocale()
  const [payments, setPayments] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [newPayment, setNewPayment] = useState({
    invoiceId: '',
    amount: 0,
    paymentMethod: 'Bank Transfer',
    transactionId: '',
    notes: ''
  })

  useEffect(() => {
    fetchPayments()
    fetchInvoices()
  }, [])

  const fetchPayments = async () => {
    try {
      const response = await axios.get('/api/payments', {
        headers: { Authorization: `Bearer ${token}` }
      })
      // Handle structured response format: { success: true, data: { payments: [...] } }
      const payments = response.data?.data?.payments || response.data?.payments || []
      setPayments(payments)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchInvoices = async () => {
    try {
      const response = await axios.get('/api/invoices', {
        headers: { Authorization: `Bearer ${token}` }
      })
      // Handle structured response format: { success: true, data: { invoices: [...] } }
      const invoices = response.data?.data?.invoices || response.data?.invoices || []
      // Only show unpaid invoices
      setInvoices(invoices.filter((i: any) => i.status !== 'PAID'))
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleRecordPayment = async () => {
    try {
      await axios.post('/api/payments', newPayment, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      toast({ title: t('common.success'), description: t('admin.financial.paymentRecorded') })
      setShowDialog(false)
      fetchPayments()
      fetchInvoices()
      
      setNewPayment({
        invoiceId: '',
        amount: 0,
        paymentMethod: 'Bank Transfer',
        transactionId: '',
        notes: ''
      })
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.response?.data?.error || t('admin.financial.paymentFailed'),
        variant: 'destructive'
      })
    }
  }

  return (
    <AdminPageTemplate
      title={t('admin.sidebar.payments')}
      description={t('admin.financial.paymentsDescription') || 'Track payments and transactions'}
      icon={<DollarSign className="h-6 w-6" />}
      showConstruction={false}
    >
      <PageUnderConstruction
        title={t('admin.sidebar.payments')}
        description={t('admin.financial.paymentsUnderConstruction') || 'Payment tracking is under construction and will be available soon.'}
        backHref="/admin/dashboard"
        backLabel={t('common.backToDashboard')}
      />
      <div className="space-y-6 hidden">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">{t('admin.financial.totalPayments')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(payments.length)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">{t('admin.financial.amountReceived')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                SAR {formatNumber(payments.reduce((sum, p) => sum + p.amount, 0))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">{t('admin.financial.pendingInvoices')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{formatNumber(invoices.length)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Record Payment Button */}
        <div className="flex justify-end">
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-2" />
                {t('admin.financial.recordPayment')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('admin.financial.recordNewPayment')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('admin.sidebar.invoices')} *</Label>
                  <Select value={newPayment.invoiceId} onValueChange={(value) => setNewPayment({ ...newPayment, invoiceId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('admin.financial.selectInvoice')} />
                    </SelectTrigger>
                    <SelectContent>
                      {invoices.map((invoice) => (
                        <SelectItem key={invoice.id} value={invoice.id}>
                          {invoice.invoiceNumber} - {invoice.client?.companyName} (SAR {formatNumber(invoice.totalAmount)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('admin.financial.amount')} *</Label>
                  <Input
                    type="number"
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment({ ...newPayment, amount: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('admin.financial.paymentMethod')} *</Label>
                  <Select value={newPayment.paymentMethod} onValueChange={(value) => setNewPayment({ ...newPayment, paymentMethod: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bank Transfer">{t('admin.financial.bankTransfer')}</SelectItem>
                      <SelectItem value="Cash">{t('admin.financial.cash')}</SelectItem>
                      <SelectItem value="Credit Card">{t('admin.financial.creditCard')}</SelectItem>
                      <SelectItem value="Cheque">{t('admin.financial.cheque')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('admin.financial.transactionId')}</Label>
                  <Input
                    value={newPayment.transactionId}
                    onChange={(e) => setNewPayment({ ...newPayment, transactionId: e.target.value })}
                    placeholder="TXN-123456"
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('admin.leads.notes')}</Label>
                  <Input
                    value={newPayment.notes}
                    onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                    placeholder={t('admin.financial.additionalNotes')}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDialog(false)}>{t('common.cancel')}</Button>
                <Button onClick={handleRecordPayment} className="bg-emerald-600 hover:bg-emerald-700">
                  {t('admin.financial.recordPayment')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Payments Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.financial.paymentHistory')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">{t('admin.financial.loadingPayments')}</div>
            ) : payments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">{t('admin.financial.noPayments')}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.financial.date')}</TableHead>
                    <TableHead>{t('admin.sidebar.invoices')}</TableHead>
                    <TableHead>{t('admin.clients.client')}</TableHead>
                    <TableHead>{t('admin.financial.method')}</TableHead>
                    <TableHead>{t('admin.financial.transactionId')}</TableHead>
                    <TableHead>{t('admin.financial.amount')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {format(new Date(payment.paymentDate), 'MMM dd, yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="font-medium">{payment.invoice?.invoiceNumber}</TableCell>
                      <TableCell>{payment.invoice?.client?.companyName}</TableCell>
                      <TableCell>{payment.paymentMethod}</TableCell>
                      <TableCell className="font-mono text-sm">{payment.transactionId || '-'}</TableCell>
                      <TableCell className="font-semibold">SAR {formatNumber(payment.amount)}</TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-100 text-emerald-700">
                          {payment.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminPageTemplate>
  )
}
