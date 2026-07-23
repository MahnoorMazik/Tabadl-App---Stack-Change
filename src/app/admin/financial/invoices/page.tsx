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
import { FileText, Plus, Eye, DollarSign, Calendar, Trash2 } from 'lucide-react'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'
import { format } from 'date-fns'
import { toast } from '@/hooks/use-toast'
import { PageUnderConstruction } from '@/components/PageUnderConstruction'
import { useLocale } from '@/contexts/LocaleContext'

export default function InvoicesPage() {
  const { token } = useAuth()
  const { t, formatNumber } = useLocale()
  const [invoices, setInvoices] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  
  const [newInvoice, setNewInvoice] = useState({
    clientId: '',
    applicationId: '',
    items: [{ description: '', quantity: 1, unitPrice: 0 }],
    taxAmount: 0,
    dueDate: ''
  })

  useEffect(() => {
    fetchInvoices()
    fetchClients()
  }, [])

  const fetchInvoices = async () => {
    try {
      const response = await axios.get('/api/invoices', {
        headers: { Authorization: `Bearer ${token}` }
      })
      // Handle structured response format: { success: true, data: { invoices: [...] } }
      const invoices = response.data?.data?.invoices || response.data?.invoices || []
      setInvoices(invoices)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchClients = async () => {
    try {
      const response = await axios.get('/api/applications', {
        headers: { Authorization: `Bearer ${token}` }
      })
      // Handle structured response format
      const applications = response.data.data?.applications || response.data.applications || []
      const uniqueClients = Array.from(
        new Map(applications.map((app: any) => [app.user.id, app.user])).values()
      )
      setClients(uniqueClients as any[])
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleCreateInvoice = async () => {
    try {
      await axios.post('/api/invoices', newInvoice, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      toast({ title: t('common.success'), description: t('admin.financial.invoiceCreated') || 'Invoice created successfully' })
      setShowCreateDialog(false)
      fetchInvoices()
      
      // Reset form
      setNewInvoice({
        clientId: '',
        applicationId: '',
        items: [{ description: '', quantity: 1, unitPrice: 0 }],
        taxAmount: 0,
        dueDate: ''
      })
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.response?.data?.error || t('admin.financial.invoiceCreateFailed') || 'Failed to create invoice',
        variant: 'destructive'
      })
    }
  }

  const addItem = () => {
    setNewInvoice({
      ...newInvoice,
      items: [...newInvoice.items, { description: '', quantity: 1, unitPrice: 0 }]
    })
  }

  const removeItem = (index: number) => {
    const items = newInvoice.items.filter((_, i) => i !== index)
    setNewInvoice({ ...newInvoice, items })
  }

  const updateItem = (index: number, field: string, value: any) => {
    const items = [...newInvoice.items]
    items[index] = { ...items[index], [field]: value }
    setNewInvoice({ ...newInvoice, items })
  }

  const getStatusBadge = (status: string) => {
    const colors: any = {
      DRAFT: 'bg-gray-100 text-gray-700',
      SENT: 'bg-blue-100 text-blue-700',
      PAID: 'bg-emerald-100 text-emerald-700',
      OVERDUE: 'bg-red-100 text-red-700',
      CANCELLED: 'bg-gray-100 text-gray-700'
    }
    return <Badge className={colors[status] || ''}>{status}</Badge>
  }

  const totalAmount = newInvoice.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)

  return (
    <AdminPageTemplate
      title={t('admin.sidebar.invoices')}
      description={t('admin.financial.invoicesDescription') || 'Manage client invoices'}
      icon={<FileText className="h-6 w-6" />}
      showConstruction={false}
    >
      <PageUnderConstruction
        title={t('admin.sidebar.invoices')}
        description={t('admin.financial.invoicesUnderConstruction') || 'Invoice management is under construction and will be available soon.'}
        backHref="/admin/dashboard"
        backLabel={t('common.backToDashboard')}
      />
      <div className="space-y-6 hidden">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">{t('admin.financial.totalInvoices') || 'Total Invoices'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(invoices.length)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">{t('admin.financial.paid') || 'Paid'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {formatNumber(invoices.filter(i => i.status === 'PAID').length)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">{t('common.pending')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {formatNumber(invoices.filter(i => i.status === 'SENT').length)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">{t('admin.financial.totalRevenue') || 'Total Revenue'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                SAR {formatNumber(invoices.reduce((sum, i) => sum + i.totalAmount, 0))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Create Invoice Button */}
        <div className="flex justify-end">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-2" />
                {t('admin.financial.newInvoice')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('admin.financial.createInvoice') || 'Create New Invoice'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('admin.clients.client')} *</Label>
                    <Select value={newInvoice.clientId} onValueChange={(value) => setNewInvoice({ ...newInvoice, clientId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('admin.clients.selectClient') || 'Select client'} />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.companyName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>{t('admin.financial.dueDate') || 'Due Date'} *</Label>
                    <Input
                      type="date"
                      value={newInvoice.dueDate}
                      onChange={(e) => setNewInvoice({ ...newInvoice, dueDate: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">{t('admin.financial.lineItems') || 'Line Items'}</Label>
                  {newInvoice.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                      <Input
                        className="col-span-5"
                        placeholder={t('admin.financial.description') || 'Description'}
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                      />
                      <Input
                        className="col-span-2"
                        type="number"
                        placeholder={t('admin.financial.quantity') || 'Qty'}
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      />
                      <Input
                        className="col-span-3"
                        type="number"
                        placeholder={t('admin.financial.unitPrice') || 'Unit Price'}
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      />
                      <div className="col-span-2 flex items-center">
                        <span className="text-sm font-medium">SAR {formatNumber((item.quantity * item.unitPrice).toFixed(2))}</span>
                        {newInvoice.items.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                            className="ml-2"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('admin.financial.addItem') || 'Add Item'}
                  </Button>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>{t('admin.financial.subtotal') || 'Subtotal'}:</span>
                    <span className="font-medium">SAR {formatNumber(totalAmount.toFixed(2))}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <Label htmlFor="taxAmount">{t('admin.financial.taxAmount') || 'Tax Amount (15% VAT)'}:</Label>
                    <Input
                      id="taxAmount"
                      type="number"
                      className="w-32"
                      value={newInvoice.taxAmount}
                      onChange={(e) => setNewInvoice({ ...newInvoice, taxAmount: parseFloat(e.target.value) || 0 })}
                      placeholder={formatNumber((totalAmount * 0.15).toFixed(2))}
                    />
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>{t('admin.financial.total') || 'Total'}:</span>
                    <span>SAR {formatNumber((totalAmount + newInvoice.taxAmount).toFixed(2))}</span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>{t('common.cancel')}</Button>
                <Button onClick={handleCreateInvoice} className="bg-emerald-600 hover:bg-emerald-700">
                  {t('admin.financial.createInvoice') || 'Create Invoice'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Invoices Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.financial.allInvoices') || 'All Invoices'}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">{t('admin.financial.loadingInvoices') || 'Loading invoices...'}</div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-8 text-gray-500">{t('admin.financial.noInvoices') || 'No invoices yet'}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.financial.invoiceNumber') || 'Invoice #'}</TableHead>
                    <TableHead>{t('admin.clients.client')}</TableHead>
                    <TableHead>{t('admin.financial.amount')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead>{t('admin.financial.dueDate') || 'Due Date'}</TableHead>
                    <TableHead>{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>{invoice.client?.companyName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          SAR {formatNumber(invoice.totalAmount)}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {format(new Date(invoice.dueDate), 'MMM dd, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setSelectedInvoice(invoice)}>
                              <Eye className="h-4 w-4 mr-2" />
                              {t('common.view')}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>{t('admin.financial.invoiceDetails') || 'Invoice Details'}</DialogTitle>
                            </DialogHeader>
                            {selectedInvoice && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm font-medium text-gray-600">{t('admin.financial.invoiceNumber') || 'Invoice Number'}</label>
                                    <p className="text-lg font-semibold">{selectedInvoice.invoiceNumber}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-gray-600">{t('common.status')}</label>
                                    <div className="mt-1">{getStatusBadge(selectedInvoice.status)}</div>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-gray-600">{t('admin.clients.client')}</label>
                                    <p>{selectedInvoice.client?.companyName}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-gray-600">{t('admin.financial.dueDate') || 'Due Date'}</label>
                                    <p>{format(new Date(selectedInvoice.dueDate), 'MMMM dd, yyyy')}</p>
                                  </div>
                                </div>

                                <div>
                                  <h4 className="font-semibold mb-2">{t('admin.financial.lineItems') || 'Line Items'}</h4>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>{t('admin.financial.description') || 'Description'}</TableHead>
                                        <TableHead>{t('admin.financial.quantity') || 'Qty'}</TableHead>
                                        <TableHead>{t('admin.financial.unitPrice') || 'Unit Price'}</TableHead>
                                        <TableHead>{t('admin.financial.amount')}</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {selectedInvoice.items?.map((item: any) => (
                                        <TableRow key={item.id}>
                                          <TableCell>{item.description}</TableCell>
                                          <TableCell>{formatNumber(item.quantity)}</TableCell>
                                          <TableCell>SAR {formatNumber(item.unitPrice.toFixed(2))}</TableCell>
                                          <TableCell>SAR {formatNumber(item.amount.toFixed(2))}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>

                                <div className="border-t pt-4 space-y-2">
                                  <div className="flex justify-between">
                                    <span>{t('admin.financial.subtotal') || 'Subtotal'}:</span>
                                    <span>SAR {formatNumber(selectedInvoice.amount.toFixed(2))}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>{t('admin.financial.tax') || 'Tax (15%)'}:</span>
                                    <span>SAR {formatNumber(selectedInvoice.taxAmount.toFixed(2))}</span>
                                  </div>
                                  <div className="flex justify-between text-lg font-bold">
                                    <span>{t('admin.financial.total') || 'Total'}:</span>
                                    <span>SAR {formatNumber(selectedInvoice.totalAmount.toFixed(2))}</span>
                                  </div>
                                </div>

                                {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                                  <div>
                                    <h4 className="font-semibold mb-2">{t('admin.financial.paymentsReceived') || 'Payments Received'}</h4>
                                    {selectedInvoice.payments.map((payment: any) => (
                                      <div key={payment.id} className="flex justify-between p-2 border rounded">
                                        <div>
                                          <p className="text-sm">{payment.paymentMethod}</p>
                                          <p className="text-xs text-gray-600">
                                            {format(new Date(payment.paymentDate), 'MMM dd, yyyy')}
                                          </p>
                                        </div>
                                        <p className="font-medium">SAR {formatNumber(payment.amount.toFixed(2))}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
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
