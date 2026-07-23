import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/rbac-middleware'
import { paymentGatewaySettingsSchema } from '@/lib/payments/validations'
import { z } from 'zod'

export const GET = withAuth(async (request) => {
  const user = request.user!
  if (user.role !== 'STAFF') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const settings = await db.paymentGatewaySettings.findFirst({
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json({
    merchantId: settings?.merchantId ?? process.env.EDFAPAY_MERCHANT_ID ?? '',
    password: settings?.password ? '••••••••••••••••' : '',
    apiKey: settings?.apiKey ? '••••••••••••••••' : (process.env.EDFAPAY_API_KEY ? '••••••••••••••••' : ''),
    environment: settings?.environment ?? process.env.EDFAPAY_ENVIRONMENT ?? 'sandbox',
    enabled: settings?.enabled ?? false,
    configured: !!(settings?.merchantId && settings?.password),
  })
})

export const PUT = withAuth(async (request) => {
  const user = request.user!
  if (user.role !== 'STAFF' || !user.permissions?.includes('settings.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = paymentGatewaySettingsSchema.parse(body)

    const existing = await db.paymentGatewaySettings.findFirst({
      orderBy: { updatedAt: 'desc' },
    })

    const password =
      data.password && data.password.trim() !== '' && !data.password.startsWith('••')
        ? data.password
        : existing?.password ?? process.env.EDFAPAY_PASSWORD ?? ''

    const apiKey =
      data.apiKey && data.apiKey.trim() !== '' && !data.apiKey.startsWith('••')
        ? data.apiKey
        : existing?.apiKey ?? process.env.EDFAPAY_API_KEY ?? null

    if (!data.merchantId || !password) {
      return NextResponse.json(
        { error: 'Merchant ID and password are required' },
        { status: 400 }
      )
    }

    const saved = existing
      ? await db.paymentGatewaySettings.update({
          where: { id: existing.id },
          data: {
            merchantId: data.merchantId.trim(),
            password,
            apiKey: apiKey || null,
            environment: data.environment,
            enabled: data.enabled,
          },
        })
      : await db.paymentGatewaySettings.create({
          data: {
            merchantId: data.merchantId.trim(),
            password,
            apiKey: apiKey || null,
            environment: data.environment,
            enabled: data.enabled,
          },
        })

    return NextResponse.json({
      success: true,
      enabled: saved.enabled,
      environment: saved.environment,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('[PaymentGatewaySettings] Save failed:', error)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
})
