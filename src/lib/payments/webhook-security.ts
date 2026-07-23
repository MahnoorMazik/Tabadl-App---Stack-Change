/**
 * Webhook security utilities for EdfaPay
 */

const EDFAPAY_IP_RANGES: string[] = []

function isIpInRange(ip: string, cidr: string): boolean {
  const [rangeIp, prefixLength] = cidr.split('/')
  const prefix = parseInt(prefixLength, 10)
  const ipToNumber = (value: string) =>
    value.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0
  const mask = ~(2 ** (32 - prefix) - 1)
  return (ipToNumber(ip) & mask) === (ipToNumber(rangeIp) & mask)
}

export function isIpWhitelisted(ip: string): boolean {
  if (EDFAPAY_IP_RANGES.length === 0) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[EdfaPay] IP whitelist empty — webhook IP check skipped')
    }
    return true
  }
  return EDFAPAY_IP_RANGES.some((range) => isIpInRange(ip, range))
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp
  return 'unknown'
}

export function validateWebhookIp(request: Request): boolean {
  const clientIp = getClientIp(request)
  if (clientIp === 'unknown') {
    return process.env.NODE_ENV !== 'production'
  }
  return isIpWhitelisted(clientIp)
}
