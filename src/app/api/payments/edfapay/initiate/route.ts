import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/rbac-middleware'
import { UserRole, PaymentMethod, InvoiceStatus } from '@prisma/client'
import { initiateInvoicePaymentSchema } from '@/lib/payments/validations'
import { initiateEdfaPayPayment, getEdfaPayCredentials } from '@/lib/payments/edfapay-service'
import {
  generateOrderId,
  getInvoiceRemainingAmount,
  hasPendingIntentForInvoice,
  extractClientIpv4,
  formatPhoneForEdfaPay,
  splitName,
  isMockPaymentEnabled,
} from '@/lib/payments/utils'

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { user } = authResult
  if (user.role !== UserRole.CLIENT) {
    return NextResponse.json({ error: 'Only clients can pay invoices online' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = initiateInvoicePaymentSchema.parse(body)

    const client = await db.client.findUnique({ where: { userId: user.userId } })
    if (!client) {
      return NextResponse.json({ error: 'Client profile not found' }, { status: 404 })
    }

    const invoice = await db.invoice.findFirst({
      where: { id: data.invoiceId, clientId: client.id, isDeleted: false },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    if (invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.CANCELLED) {
      return NextResponse.json({ error: 'This invoice cannot be paid' }, { status: 400 })
    }

    const remaining = await getInvoiceRemainingAmount(invoice.id)
    if (remaining <= 0) {
      return NextResponse.json({ error: 'Invoice is already fully paid' }, { status: 400 })
    }

    if (await hasPendingIntentForInvoice(invoice.id)) {
      return NextResponse.json(
        { error: 'A payment is already in progress for this invoice' },
        { status: 409 }
      )
    }

    const orderId = generateOrderId(invoice.id)

    if (isMockPaymentEnabled()) {
      await db.paymentIntent.create({
        data: {
          orderId,
          invoiceId: invoice.id,
          clientId: client.id,
          userId: user.userId,
          amount: remaining,
          gateway: 'Mock',
        },
      })

      setTimeout(async () => {
        try {
          const intent = await db.paymentIntent.findUnique({ where: { orderId } })
          if (!intent) return

          await db.$transaction(async (tx) => {
            await tx.payment.create({
              data: {
                amount: intent.amount,
                method: PaymentMethod.CREDIT_CARD,
                reference: `MOCK-${crypto.randomBytes(4).toString('hex')}`,
                clientId: intent.clientId,
                invoiceId: intent.invoiceId,
                status: 'Success',
                gateway: 'Mock',
                edfaPayOrderId: orderId,
                paymentDate: new Date(),
              },
            })

            const inv = await tx.invoice.findUnique({
              where: { id: intent.invoiceId },
              include: { payments: { where: { status: 'Success' } } },
            })
            if (inv) {
              const paid = inv.payments.reduce((s, p) => s + p.amount, 0) + intent.amount
              if (paid >= inv.amount) {
                await tx.invoice.update({
                  where: { id: inv.id },
                  data: { status: InvoiceStatus.PAID, paidAt: new Date() },
                })
              }
            }

            await tx.paymentIntent.delete({ where: { id: intent.id } })
          })
        } catch (e) {
          console.error('[MockPayment] Failed:', e)
        }
      }, 2500)

      return NextResponse.json({
        orderId,
        paymentUrl: `/client/payment-status?status=success&orderId=${orderId}&mock=true`,
        isMock: true,
        message: 'Mock payment initiated — will complete in a few seconds.',
      })
    }

    const credentials = await getEdfaPayCredentials()
    if (!credentials) {
      return NextResponse.json(
        { error: 'Online payment is not available. Please contact support.' },
        { status: 503 }
      )
    }

    const payerIp = extractClientIpv4(request)
    if (!payerIp) {
      return NextResponse.json(
        {
          error:
            'Unable to process payment: IPv4 address required by payment gateway. Try a different network or contact support.',
        },
        { status: 400 }
      )
    }

    let payerFirstName: string
    let payerLastName: string
    if (data.payerFirstName && data.payerLastName) {
      payerFirstName = data.payerFirstName
      payerLastName = data.payerLastName
    } else if (data.payerName) {
      const split = splitName(data.payerName)
      payerFirstName = split.firstName
      payerLastName = split.lastName
    } else {
      const split = splitName(client.name)
      payerFirstName = split.firstName
      payerLastName = split.lastName
    }

    let baseUrl =
      process.env.NEXTAUTH_URL?.trim() ||
      process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      request.nextUrl.origin
    if (process.env.NODE_ENV === 'production' && baseUrl.startsWith('http://')) {
      baseUrl = baseUrl.replace('http://', 'https://')
    }

    const orderDescription = `Invoice ${invoice.invoiceNumber} - Tabadl Alkon CRM`

    const paymentResult = await initiateEdfaPayPayment({
      orderId,
      amount: remaining,
      currency: 'SAR',
      orderDescription,
      payerEmail: data.payerEmail,
      payerFirstName,
      payerLastName,
      payerPhone: formatPhoneForEdfaPay(data.payerPhone || client.phone),
      payerIp,
      payerAddress: data.payerAddress,
      payerAddress2: data.payerAddress2,
      payerCity: data.payerCity,
      payerState: data.payerState,
      payerCountry: data.payerCountry,
      payerZip: data.payerZip,
      termUrl3ds: new URL(
        `/client/payment-status?status=success&orderId=${orderId}`,
        baseUrl
      ).toString(),
      callbackUrl: new URL('/api/payments/edfapay/webhook', baseUrl).toString(),
    })

    await db.paymentIntent.create({
      data: {
        orderId,
        invoiceId: invoice.id,
        clientId: client.id,
        userId: user.userId,
        amount: remaining,
        gateway: 'EdfaPay',
      },
    })

    return NextResponse.json({
      paymentUrl: paymentResult.redirectUrl,
      orderId,
    })
  } catch (error) {
    console.error('[EdfaPay Initiate]', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid payment details' }, { status: 400 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Payment initiation failed' },
      { status: 500 }
    )
  }
}
