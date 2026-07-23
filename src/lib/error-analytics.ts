import { ErrorCodes } from './error-handler'

interface ErrorAnalytics {
  timestamp: string
  code: ErrorCodes
  endpoint: string
  method: string
  userId?: string
  requestId: string
  message: string
  context?: Record<string, any>
}

class ErrorAnalyticsService {
  private errors: ErrorAnalytics[] = []
  private readonly maxErrors = 1000 // Keep last 1000 errors

  logError(error: ErrorAnalytics): void {
    this.errors.push(error)
    
    // Keep only the most recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors)
    }

    // Log to console for development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Analytics:', JSON.stringify(error, null, 2))
    }
  }

  getErrorStats(timeframe: 'hour' | 'day' | 'week' = 'day'): {
    total: number
    byCode: Record<ErrorCodes, number>
    byEndpoint: Record<string, number>
    recentErrors: ErrorAnalytics[]
  } {
    const now = new Date()
    const cutoff = new Date()
    
    switch (timeframe) {
      case 'hour':
        cutoff.setHours(now.getHours() - 1)
        break
      case 'day':
        cutoff.setDate(now.getDate() - 1)
        break
      case 'week':
        cutoff.setDate(now.getDate() - 7)
        break
    }

    const recentErrors = this.errors.filter(
      error => new Date(error.timestamp) > cutoff
    )

    const byCode: Record<ErrorCodes, number> = {} as Record<ErrorCodes, number>
    const byEndpoint: Record<string, number> = {}

    recentErrors.forEach(error => {
      byCode[error.code] = (byCode[error.code] || 0) + 1
      byEndpoint[error.endpoint] = (byEndpoint[error.endpoint] || 0) + 1
    })

    return {
      total: recentErrors.length,
      byCode,
      byEndpoint,
      recentErrors: recentErrors.slice(-10) // Last 10 errors
    }
  }

  getTopErrors(limit: number = 5): Array<{
    code: ErrorCodes
    count: number
    percentage: number
  }> {
    const stats = this.getErrorStats()
    const total = stats.total
    
    if (total === 0) return []

    return Object.entries(stats.byCode)
      .map(([code, count]) => ({
        code: code as ErrorCodes,
        count,
        percentage: (count / total) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  }

  getEndpointErrors(limit: number = 5): Array<{
    endpoint: string
    count: number
    percentage: number
  }> {
    const stats = this.getErrorStats()
    const total = stats.total
    
    if (total === 0) return []

    return Object.entries(stats.byEndpoint)
      .map(([endpoint, count]) => ({
        endpoint,
        count,
        percentage: (count / total) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  }

  clearErrors(): void {
    this.errors = []
  }

  exportErrors(): ErrorAnalytics[] {
    return [...this.errors]
  }
}

// Singleton instance
export const errorAnalytics = new ErrorAnalyticsService()

// Helper function to log errors with analytics
export function logErrorWithAnalytics(
  error: Error,
  context: {
    code: ErrorCodes
    requestId: string
    userId?: string
    endpoint?: string
    method?: string
    additionalContext?: Record<string, any>
  }
): void {
  const errorEntry: ErrorAnalytics = {
    timestamp: new Date().toISOString(),
    code: context.code,
    endpoint: context.endpoint || 'unknown',
    method: context.method || 'unknown',
    userId: context.userId,
    requestId: context.requestId,
    message: error.message,
    context: context.additionalContext
  }
  
  errorAnalytics.logError(errorEntry)
}
