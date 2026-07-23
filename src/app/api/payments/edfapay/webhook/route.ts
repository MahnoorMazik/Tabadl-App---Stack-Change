import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { webhookSchema } from '@/lib/payments/validations'
import { verifyEdfaPayWebhookHash } from '@/lib/payments/edfapay-service'
import { mapEdfaPayStatus, markInvoicePaidIfFullyPaid } from '@/lib/payments/utils'
import { validateWebhookIp, getClientIp } from '@/lib/payments/webhook-security'
import { PaymentMethod } from '@prisma/client'
import { dispatchEvent } from '@/lib/notifications/service'
import type { z } from 'zod'

type WebhookPayload = z.infer<typeof webhookSchema>

export async function POST(request: NextRequest) {
  let validatedData: WebhookPayload | undefined

  try {
    const clientIp = getClientIp(request)
    console.log('[EdfaPay Webhook] Received', { ip: clientIp })

    if (!validateWebhookIp(request)) {
      return NextResponse.json({ error: 'Unauthorized IP address' }, { status: 403 })
    }

    const body = await request.json()
    const payload = webhookSchema.parse(body)
    validatedData = payload

    const intent = await db.paymentIntent.findUnique({
      where: { orderId: payload.order_id },
    })

    if (!intent) {
      console.error('[EdfaPay Webhook] PaymentIntent not found', { orderId: payload.order_id })
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    const isValidHash = await verifyEdfaPayWebhookHash(payload)
    if (!isValidHash) {
      console.error('[EdfaPay Webhook] Invalid hash', { orderId: payload.order_id })
      return NextResponse.json({ error: 'Invalid hash' }, { status: 401 })
    }

    const internalStatus = mapEdfaPayStatus(payload.status)

    if (internalStatus === 'Failed') {
      await db.paymentIntent.delete({ where: { id: intent.id } })
      return NextResponse.json({ message: 'Webhook processed' })
    }

    if (internalStatus === 'Success') {
      await db.$transaction(async (tx) => {
        await tx.payment.create({
          data: {
            amount: intent.amount,
            method: PaymentMethod.CREDIT_CARD,
            reference: payload.transaction_id || payload.order_id,
            clientId: intent.clientId,
            invoiceId: intent.invoiceId,
            status: 'Success',
            gateway: 'EdfaPay',
            edfaPayOrderId: payload.order_id,
            edfaPayTransactionId: payload.transaction_id ?? undefined,
            edfaPayResponse: JSON.stringify(payload),
            paymentDate: new Date(),
          },
        })

        await tx.paymentIntent.delete({ where: { id: intent.id } })
      })

      await markInvoicePaidIfFullyPaid(intent.invoiceId)

      const invoice = await db.invoice.findUnique({
        where: { id: intent.invoiceId },
        select: { invoiceNumber: true, clientId: true },
      })

      if (invoice) {
        try {
          await dispatchEvent({
            eventType: 'PAYMENT_RECEIVED',
            title: 'Payment Received',
            message: `Online payment of ${intent.amount} SAR received for invoice ${invoice.invoiceNumber}.`,
            entityType: 'Invoice',
            entityId: intent.invoiceId,
            url: '/admin/financial/payments',
          })
        } catch (e) {
          console.error('[EdfaPay Webhook] Notification failed:', e)
        }
      }

      console.log('[EdfaPay Webhook] Payment completed', {
        orderId: payload.order_id,
        amount: intent.amount,
      })
    }

    return NextResponse.json({ message: 'Webhook processed successfully' })
  } catch (error) {
    console.error('[EdfaPay Webhook] Error:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
