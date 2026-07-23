import { useState, useCallback } from 'react'

interface RetryableMessage {
  id: string
  tempId: string
  content: string
  retryCount: number
  maxRetries: number
  lastError?: string
}

interface UseMessageRetryOptions {
  maxRetries?: number
  retryDelay?: number
  onRetrySuccess?: (tempId: string, message: any) => void
  onRetryFailed?: (tempId: string, error: string) => void
}

export function useMessageRetry(options: UseMessageRetryOptions = {}) {
  const {
    maxRetries = 3,
    retryDelay = 2000,
    onRetrySuccess,
    onRetryFailed,
  } = options

  const [retryingMessages, setRetryingMessages] = useState<Map<string, RetryableMessage>>(
    new Map()
  )

  const addFailedMessage = useCallback(
    (tempId: string, content: string, error: string) => {
      setRetryingMessages((prev) => {
        const newMap = new Map(prev)
        newMap.set(tempId, {
          id: '',
          tempId,
          content,
          retryCount: 0,
          maxRetries,
          lastError: error,
        })
        return newMap
      })
    },
    [maxRetries]
  )

  const retryMessage = useCallback(
    async (tempId: string, sendFn: () => Promise<any>) => {
      const message = retryingMessages.get(tempId)
      if (!message) return

      if (message.retryCount >= message.maxRetries) {
        onRetryFailed?.(tempId, 'Max retries exceeded')
        setRetryingMessages((prev) => {
          const newMap = new Map(prev)
          newMap.delete(tempId)
          return newMap
        })
        return
      }

      // Update retry count
      setRetryingMessages((prev) => {
        const newMap = new Map(prev)
        const msg = newMap.get(tempId)
        if (msg) {
          msg.retryCount++
          newMap.set(tempId, msg)
        }
        return newMap
      })

      try {
        // Wait before retrying (exponential backoff)
        const delay = retryDelay * Math.pow(2, message.retryCount)
        await new Promise((resolve) => setTimeout(resolve, delay))

        // Attempt to send
        const result = await sendFn()
        
        // Success - remove from retry queue
        setRetryingMessages((prev) => {
          const newMap = new Map(prev)
          newMap.delete(tempId)
          return newMap
        })

        onRetrySuccess?.(tempId, result)
      } catch (error: any) {
        // Failed - update error
        setRetryingMessages((prev) => {
          const newMap = new Map(prev)
          const msg = newMap.get(tempId)
          if (msg) {
            msg.lastError = error.message || 'Retry failed'
            newMap.set(tempId, msg)
          }
          return newMap
        })

        // Retry again if under limit
        if (message.retryCount + 1 < message.maxRetries) {
          setTimeout(() => retryMessage(tempId, sendFn), 1000)
        } else {
          onRetryFailed?.(tempId, 'Max retries exceeded')
        }
      }
    },
    [retryingMessages, retryDelay, maxRetries, onRetrySuccess, onRetryFailed]
  )

  const cancelRetry = useCallback((tempId: string) => {
    setRetryingMessages((prev) => {
      const newMap = new Map(prev)
      newMap.delete(tempId)
      return newMap
    })
  }, [])

  const clearAllRetries = useCallback(() => {
    setRetryingMessages(new Map())
  }, [])

  return {
    retryingMessages: Array.from(retryingMessages.values()),
    addFailedMessage,
    retryMessage,
    cancelRetry,
    clearAllRetries,
  }
}

