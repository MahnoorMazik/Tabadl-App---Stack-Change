import { NextRequest, NextResponse } from 'next/server'

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store for rate limiting
// In production, use Redis or similar distributed cache
const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

export interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  message?: string
}

/**
 * Rate limiting middleware
 * @param identifier - Unique identifier for the request (e.g., IP, user ID)
 * @param config - Rate limit configuration
 * @returns NextResponse if rate limit exceeded, null otherwise
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): NextResponse | null {
  const now = Date.now()
  const key = `ratelimit:${identifier}`
  
  const entry = rateLimitStore.get(key)

  if (!entry || entry.resetTime < now) {
    // First request or window expired
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    })
    return null
  }

  if (entry.count >= config.maxRequests) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
    return NextResponse.json(
      {
        error: config.message || 'Too many requests. Please try again later.',
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': entry.resetTime.toString(),
        },
      }
    )
  }

  // Increment counter
  entry.count++
  return null
}

/**
 * Get rate limit identifier from request
 */
export function getRateLimitIdentifier(request: NextRequest, userId?: string): string {
  if (userId) {
    return `user:${userId}`
  }

  // Use IP address as fallback
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
  return `ip:${ip}`
}

/**
 * Rate limit configurations for different endpoints
 */
export const rateLimitConfigs = {
  messages: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 30 messages per minute
    message: 'Too many messages sent. Please slow down.',
  },
  supportMessages: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 20 messages per minute
    message: 'Too many messages sent. Please wait before sending more.',
  },
  auth: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 5 attempts per 15 minutes
    message: 'Too many authentication attempts. Please try again later.',
  },
  api: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 100 requests per minute
    message: 'Too many API requests. Please slow down.',
  },
}

