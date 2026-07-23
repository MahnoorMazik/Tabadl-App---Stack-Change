import { z } from 'zod'

export const initiateInvoicePaymentSchema = z.object({
  invoiceId: z.string().min(1),
  payerEmail: z.string().email().max(256),
  payerFirstName: z.string().min(1).max(32).optional(),
  payerLastName: z.string().min(1).max(32).optional(),
  payerName: z.string().min(1).max(255).optional(),
  payerPhone: z.string().min(1),
  payerAddress: z.string().min(1).max(255),
  payerCity: z.string().min(1).max(32),
  payerCountry: z.string().length(2),
  payerZip: z.string().min(1).max(10),
  payerState: z.string().max(32).optional(),
  payerAddress2: z.string().max(255).optional(),
}).refine(
  (data) => data.payerName || (data.payerFirstName && data.payerLastName),
  { message: 'Provide payerName or both payerFirstName and payerLastName' }
)

export const webhookSchema = z.object({
  order_id: z.string(),
  transaction_id: z.string().optional(),
  status: z.string(),
  amount: z.string().optional(),
  currency: z.string().optional(),
  hash: z.string(),
})

export const paymentGatewaySettingsSchema = z.object({
  merchantId: z.string().min(1, 'Merchant ID is required'),
  password: z.string().optional(),
  apiKey: z.string().optional(),
  environment: z.enum(['sandbox', 'production']),
  enabled: z.boolean(),
})
