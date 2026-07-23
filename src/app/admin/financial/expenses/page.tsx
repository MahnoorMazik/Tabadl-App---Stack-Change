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
import { TrendingUp, Plus, Calendar, CheckCircle } from 'lucide-react'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'
import { format } from 'date-fns'
import { toast } from '@/hooks/use-toast'
import { PageUnderConstruction } from '@/components/PageUnderConstruction'
import { useLocale } from '@/contexts/LocaleContext'

export default function ExpensesPage() {
  const { token } = useAuth()
  const { t, formatNumber } = useLocale()
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: 0,
    category: 'OFFICE',
    vendor: '',
    expenseDate: new Date().toISOString().split('T')[0],
    notes: ''
  })

  useEffect(() => {
    fetchExpenses()
  }, [])

  const fetchExpenses = async () => {
    try {
      const response = await axios.get('/api/expenses', {
        headers: { Authorization: `Bearer ${token}` }
      })
      // Handle structured response format: { success: true, data: { expenses: [...] } }
      const expenses = response.data?.data?.expenses || response.data?.expenses || []
      setExpenses(expenses)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateExpense = async () => {
    try {
      await axios.post('/api/expenses', newExpense, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      toast({ title: t('common.success'), description: t('admin.financial.expenseCreated') })
      setShowDialog(false)
      fetchExpenses()
      
      setNewExpense({
        description: '',
        amount: 0,
        category: 'OFFICE',
        vendor: '',
        expenseDate: new Date().toISOString().split('T')[0],
        notes: ''
      })
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.response?.data?.error || t('admin.financial.expenseFailed'),
        variant: 'destructive'
      })
    }
  }

  const handleApprove = async (expenseId: string) => {
    try {
      await axios.post(`/api/expenses/${expenseId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      toast({ title: t('common.success'), description: t('admin.financial.expenseApproved') })
      fetchExpenses()
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.response?.data?.error || t('admin.financial.approveFailed'),
        variant: 'destructive'
      })
    }
  }

  const approvedExpenses = expenses.filter(e => e.approvedById)
  const pendingExpenses = expenses.filter(e => !e.approvedById)
  const totalApproved = approvedExpenses.reduce((sum, e) => sum + e.amount, 0)

  return (
    <AdminPageTemplate
      title={t('admin.sidebar.expenses')}
      description={t('admin.financial.expensesDescription') || 'Manage business expenses'}
      icon={<TrendingUp className="h-6 w-6" />}
      showConstruction={false}
    >
      <PageUnderConstruction
        title={t('admin.sidebar.expenses')}
        description={t('admin.financial.expensesUnderConstruction') || 'Expense tracking is under construction and will be available soon.'}
        backHref="/admin/dashboard"
        backLabel={t('common.backToDashboard')}
      />
      <div className="space-y-6 hidden">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">{t('admin.financial.totalExpenses')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(expenses.length)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">{t('admin.financial.approved')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{formatNumber(approvedExpenses.length)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">{t('admin.financial.pendingApproval')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{formatNumber(pendingExpenses.length)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">{t('admin.financial.totalAmount')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">SAR {formatNumber(totalApproved)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Create Expense Button */}
        <div className="flex justify-end">
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-2" />
                {t('admin.financial.newExpense')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('admin.financial.addNewExpense')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('admin.financial.description')} *</Label>
                  <Input
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                    placeholder={t('admin.financial.expenseDescription')}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('admin.financial.amount')} *</Label>
                    <Input
                      type="number"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('admin.financial.category')} *</Label>
                    <Select value={newExpense.category} onValueChange={(value) => setNewExpense({ ...newExpense, category: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OFFICE">{t('admin.financial.office')}</SelectItem>
                        <SelectItem value="TRAVEL">{t('admin.financial.travel')}</SelectItem>
                        <SelectItem value="SALARY">{t('admin.financial.salary')}</SelectItem>
                        <SelectItem value="UTILITIES">{t('admin.financial.utilities')}</SelectItem>
                        <SelectItem value="MARKETING">{t('admin.financial.marketing')}</SelectItem>
                        <SelectItem value="LEGAL">{t('admin.financial.legal')}</SelectItem>
                        <SelectItem value="OTHER">{t('admin.financial.other')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('admin.financial.vendor')}</Label>
                  <Input
                    value={newExpense.vendor}
                    onChange={(e) => setNewExpense({ ...newExpense, vendor: e.target.value })}
                    placeholder={t('admin.financial.vendorName')}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('admin.financial.expenseDate')}</Label>
                  <Input
                    type="date"
                    value={newExpense.expenseDate}
                    onChange={(e) => setNewExpense({ ...newExpense, expenseDate: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('admin.leads.notes')}</Label>
                  <Input
                    value={newExpense.notes}
                    onChange={(e) => setNewExpense({ ...newExpense, notes: e.target.value })}
                    placeholder={t('admin.financial.additionalNotes')}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDialog(false)}>{t('common.cancel')}</Button>
                <Button onClick={handleCreateExpense} className="bg-emerald-600 hover:bg-emerald-700">
                  {t('admin.financial.newExpense')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Expenses Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.financial.allExpenses')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">{t('admin.financial.loadingExpenses')}</div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-8 text-gray-500">{t('admin.financial.noExpenses')}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.financial.date')}</TableHead>
                    <TableHead>{t('admin.financial.description')}</TableHead>
                    <TableHead>{t('admin.financial.category')}</TableHead>
                    <TableHead>{t('admin.financial.vendor')}</TableHead>
                    <TableHead>{t('admin.financial.amount')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead>{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>
                        {format(new Date(expense.expenseDate), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="font-medium">{expense.description}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{expense.category}</Badge>
                      </TableCell>
                      <TableCell>{expense.vendor || '-'}</TableCell>
                      <TableCell className="font-semibold">SAR {formatNumber(expense.amount)}</TableCell>
                      <TableCell>
                        {expense.approvedById ? (
                          <Badge className="bg-emerald-100 text-emerald-700">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {t('admin.financial.approved')}
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700">{t('common.pending')}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {!expense.approvedById && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleApprove(expense.id)}
                          >
                            {t('common.approve')}
                          </Button>
                        )}
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
