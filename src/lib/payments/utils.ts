import { db } from '@/lib/db'
import { InvoiceStatus } from '@prisma/client'

export function formatCurrency(amount: number, currency = 'SAR'): string {
  return `${amount.toLocaleString('en-US')} ${currency}`
}

export function mapEdfaPayStatus(edfaPayStatus: string): 'Pending' | 'Success' | 'Failed' {
  const statusMap: Record<string, 'Pending' | 'Success' | 'Failed'> = {
    settled: 'Success',
    completed: 'Success',
    success: 'Success',
    approved: 'Success',
    captured: 'Success',
    txn_failure: 'Failed',
    failed: 'Failed',
    declined: 'Failed',
    cancelled: 'Failed',
    error: 'Failed',
    rejected: 'Failed',
    voided: 'Failed',
    pending: 'Pending',
    processing: 'Pending',
    authorized: 'Pending',
  }
  return statusMap[edfaPayStatus.toLowerCase().trim()] || 'Pending'
}

export function generateOrderId(invoiceId: string): string {
  return `TK-${invoiceId.substring(0, 8)}-${Date.now()}`
}

export async function getInvoiceRemainingAmount(invoiceId: string): Promise<number> {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: { where: { status: 'Success' } } },
  })
  if (!invoice) return 0
  const paid = invoice.payments.reduce((sum, p) => sum + p.amount, 0)
  return Math.max(0, invoice.amount - paid)
}

export async function hasPendingIntentForInvoice(invoiceId: string): Promise<boolean> {
  const intent = await db.paymentIntent.findFirst({ where: { invoiceId } })
  return !!intent
}

export function extractClientIpv4(request: Request): string | null {
  const headers = request.headers
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/

  const extractIPv4 = (ipString: string | null): string | null => {
    if (!ipString) return null
    for (const ip of ipString.split(',').map((s) => s.trim())) {
      if (ipv4Regex.test(ip)) return ip
      if (ip.startsWith('::ffff:')) {
        const v4 = ip.substring(7)
        if (ipv4Regex.test(v4)) return v4
      }
    }
    return null
  }

  return (
    extractIPv4(headers.get('cf-pseudo-ipv4')) ||
    extractIPv4(headers.get('cf-connecting-ip')) ||
    extractIPv4(headers.get('x-forwarded-for')) ||
    extractIPv4(headers.get('x-real-ip')) ||
    null
  )
}

export function formatPhoneForEdfaPay(phone: string | null | undefined): string {
  const digits = (phone || '').replace(/[^\d]/g, '')
  return digits || '966501234567'
}

export function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: 'Client', lastName: 'User' }
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

export async function markInvoicePaidIfFullyPaid(invoiceId: string): Promise<void> {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: { where: { status: 'Success' } } },
  })
  if (!invoice) return

  const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0)
  if (totalPaid >= invoice.amount) {
    await db.invoice.update({
      where: { id: invoiceId },
      data: { status: InvoiceStatus.PAID, paidAt: new Date() },
    })
  } else if (invoice.status === InvoiceStatus.DRAFT) {
    await db.invoice.update({
      where: { id: invoiceId },
      data: { status: InvoiceStatus.SENT },
    })
  }
}

export function isMockPaymentEnabled(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.ENABLE_MOCK_PAYMENT === 'true'
}
