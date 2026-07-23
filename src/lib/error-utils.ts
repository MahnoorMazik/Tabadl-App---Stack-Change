// Helper function to safely extract error messages from API responses
export function getErrorMessage(error: any): string {
  // Handle structured error responses
  if (error.response?.data?.error?.message) {
    return error.response.data.error.message
  }
  
  // Handle simple error responses
  if (error.response?.data?.error) {
    return typeof error.response.data.error === 'string' 
      ? error.response.data.error 
      : 'An error occurred'
  }
  
  // Handle direct error messages
  if (error.message) {
    return error.message
  }
  
  // Fallback
  return 'An unexpected error occurred'
}

