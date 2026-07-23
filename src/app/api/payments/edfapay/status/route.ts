import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/rbac-middleware'

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const orderId = request.nextUrl.searchParams.get('orderId')
  if (!orderId) {
    return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
  }

  const intent = await db.paymentIntent.findUnique({ where: { orderId } })
  if (intent) {
    return NextResponse.json({
      orderId,
      status: 'Pending',
      amount: intent.amount,
      invoiceId: intent.invoiceId,
    })
  }

  const payment = await db.payment.findFirst({
    where: { edfaPayOrderId: orderId },
    include: {
      invoice: { select: { id: true, invoiceNumber: true, status: true } },
    },
  })

  if (!payment) {
    return NextResponse.json({ orderId, status: 'Unknown' }, { status: 404 })
  }

  return NextResponse.json({
    orderId,
    status: payment.status,
    amount: payment.amount,
    invoiceId: payment.invoiceId,
    invoice: payment.invoice,
    transactionId: payment.edfaPayTransactionId,
    paymentDate: payment.paymentDate,
  })
}
