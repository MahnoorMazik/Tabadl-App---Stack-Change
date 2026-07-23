import crypto from 'crypto'
import { db } from '@/lib/db'

export interface EdfaPayCredentials {
  merchantId: string
  password: string
  apiKey?: string
  environment: 'sandbox' | 'production'
}

export interface EdfaPayPaymentParams {
  orderId: string
  amount: number
  currency?: string
  orderDescription: string
  payerEmail: string
  payerFirstName: string
  payerLastName: string
  payerPhone: string
  payerIp: string
  payerAddress: string
  payerAddress2?: string
  payerCity: string
  payerState?: string
  payerCountry: string
  payerZip: string
  termUrl3ds: string
  callbackUrl?: string
  auth?: 'Y' | 'N'
  reqToken?: 'Y' | 'N'
  payerMiddleName?: string
  payerBirthDate?: string
  recurringInit?: 'Y' | 'N'
}

export interface EdfaPayWebhookPayload {
  order_id: string
  transaction_id?: string
  status: string
  amount?: string
  currency?: string
  hash: string
  [key: string]: string | undefined
}

const EDFAPAY_SANDBOX_URL = 'https://apidev.edfapay.com'
const EDFAPAY_PRODUCTION_URL = 'https://api.edfapay.com'

/** Load credentials from DB (admin settings) with env fallback. */
export async function getEdfaPayCredentials(): Promise<EdfaPayCredentials | null> {
  try {
    const settings = await db.paymentGatewaySettings.findFirst({
      orderBy: { updatedAt: 'desc' },
    })

    if (settings && !settings.enabled) {
      return null
    }

    const merchantId = settings?.merchantId?.trim() || process.env.EDFAPAY_MERCHANT_ID?.trim()
    const password = settings?.password?.trim() || process.env.EDFAPAY_PASSWORD?.trim()
    const apiKey = settings?.apiKey?.trim() || process.env.EDFAPAY_API_KEY?.trim()
    const environment = (
      settings?.environment ||
      process.env.EDFAPAY_ENVIRONMENT ||
      'sandbox'
    ) as 'sandbox' | 'production'

    if (!merchantId || !password) {
      return null
    }

    return { merchantId, password, apiKey, environment }
  } catch (error) {
    console.error('[EdfaPay] Failed to load credentials:', error)
    return null
  }
}

export function generateEdfaPayHash(
  _merchantId: string,
  orderId: string,
  amountStr: string,
  currency: string,
  orderDescription: string,
  password: string
): string {
  const combined = `${orderId.trim()}${amountStr.trim()}${currency.trim()}${orderDescription.trim()}${password.trim()}`
  const uppercased = combined.toUpperCase()
  const md5Hash = crypto.createHash('md5').update(uppercased, 'utf8').digest('hex')
  return crypto.createHash('sha1').update(md5Hash, 'utf8').digest('hex').toLowerCase()
}

export interface EdfaPayInitiateResponse {
  redirect_url?: string
  status?: string
  result?: string
  error?: string
  error_code?: string
  [key: string]: unknown
}

export async function initiateEdfaPayPayment(
  params: EdfaPayPaymentParams
): Promise<{ redirectUrl: string; hash: string }> {
  const credentials = await getEdfaPayCredentials()
  if (!credentials) {
    throw new Error('EdfaPay is not configured. Contact your administrator.')
  }

  const baseUrl =
    credentials.environment === 'production' ? EDFAPAY_PRODUCTION_URL : EDFAPAY_SANDBOX_URL
  const initiateUrl = new URL('/payment/initiate', baseUrl).toString()

  const amountStr =
    params.amount % 1 === 0 ? params.amount.toString() : params.amount.toFixed(2)
  const currencyStr = params.currency || 'SAR'

  const hashOrderId = params.orderId.trim()
  const hashAmount = amountStr.trim()
  const hashCurrency = currencyStr.trim()
  const hashDescription = params.orderDescription.trim()
  const hashPassword = credentials.password.trim()

  const hash = generateEdfaPayHash(
    credentials.merchantId,
    hashOrderId,
    hashAmount,
    hashCurrency,
    hashDescription,
    hashPassword
  )

  const formData = new FormData()
  formData.append('action', 'SALE')
  formData.append('edfa_merchant_id', credentials.merchantId.trim())
  formData.append('order_id', hashOrderId)
  formData.append('order_amount', hashAmount)
  formData.append('order_currency', hashCurrency)
  formData.append('order_description', hashDescription)
  formData.append('payer_first_name', params.payerFirstName)
  formData.append('payer_last_name', params.payerLastName)
  formData.append('payer_address', params.payerAddress)
  formData.append('payer_country', params.payerCountry)
  formData.append('payer_city', params.payerCity)
  formData.append('payer_zip', params.payerZip)
  formData.append('payer_email', params.payerEmail)
  formData.append('payer_phone', params.payerPhone)
  formData.append('payer_ip', params.payerIp)
  formData.append('term_url_3ds', params.termUrl3ds)
  formData.append('hash', hash)
  formData.append('auth', params.auth || 'N')

  if (params.payerAddress2) formData.append('payer_address2', params.payerAddress2)
  if (params.payerState) formData.append('payer_state', params.payerState)
  if (params.callbackUrl) formData.append('callback_url', params.callbackUrl)

  const response = await fetch(initiateUrl, { method: 'POST', body: formData })

  if (!response.ok) {
    const errorText = await response.text()
    let errorData: Record<string, unknown> = {}
    try {
      errorData = JSON.parse(errorText)
    } catch {
      errorData = { raw: errorText }
    }
    const msg =
      (errorData.error_message as string) ||
      `EdfaPay API error: ${response.status} ${response.statusText}`
    throw new Error(msg)
  }

  const result: EdfaPayInitiateResponse = await response.json()

  if (result.redirect_url) {
    return { redirectUrl: result.redirect_url, hash }
  }

  if (result.error || result.error_code) {
    throw new Error(result.error || `EdfaPay error: ${result.error_code}`)
  }

  throw new Error('Unexpected response from EdfaPay: no redirect URL')
}

export async function verifyEdfaPayWebhookHash(payload: EdfaPayWebhookPayload): Promise<boolean> {
  const credentials = await getEdfaPayCredentials()
  if (!credentials || !payload.hash) return false

  const hashString = `${payload.order_id || ''}${payload.transaction_id || ''}${payload.status || ''}${payload.amount || ''}${payload.currency || 'SAR'}${credentials.password.trim()}`
  const calculatedHash = crypto.createHash('md5').update(hashString).digest('hex').toUpperCase()
  return receivedHashUpper(payload.hash) === calculatedHash
}

function receivedHashUpper(hash: string) {
  return hash.toUpperCase()
}

export async function checkEdfaPayStatus(orderId: string, gwayPaymentId: string) {
  const credentials = await getEdfaPayCredentials()
  if (!credentials || !gwayPaymentId) return null

  const baseUrl =
    credentials.environment === 'production' ? EDFAPAY_PRODUCTION_URL : EDFAPAY_SANDBOX_URL
  const statusUrl = new URL('/payment/status', baseUrl).toString()

  const hashString = `${gwayPaymentId}${credentials.password.trim()}`
  const uppercased = hashString.toUpperCase()
  const md5Hash = crypto.createHash('md5').update(uppercased, 'utf8').digest('hex')
  const hash = crypto.createHash('sha1').update(md5Hash, 'utf8').digest('hex').toLowerCase()

  const response = await fetch(statusUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order_id: orderId.trim(),
      merchant_id: credentials.merchantId.trim(),
      gway_Payment_id: gwayPaymentId,
      hash,
    }),
  })

  if (!response.ok) return null
  return response.json()
}
