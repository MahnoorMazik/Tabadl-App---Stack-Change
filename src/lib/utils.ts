import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extracts error message from API error response
 * Handles both standardized error format (error.message) and legacy format (error as string)
 */
export function getErrorMessage(error: any, defaultMessage: string = 'An error occurred'): string {
  // Handle axios error response
  if (error?.response?.data) {
    const errorData = error.response.data
    
    // Check for standardized error format: { success: false, error: { message: "...", ... } }
    if (errorData.error && typeof errorData.error === 'object' && errorData.error.message) {
      return errorData.error.message
    }
    
    // Check for legacy format: { error: "string message" }
    if (typeof errorData.error === 'string') {
      return errorData.error
    }
    
    // Check for direct message property
    if (typeof errorData.message === 'string') {
      return errorData.message
    }
  }
  
  // Handle generic error object
  if (error?.message && typeof error.message === 'string') {
    return error.message
  }
  
  // Handle string errors
  if (typeof error === 'string') {
    return error
  }
  
  return defaultMessage
}
