// Email validation utility
export const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false
  
  // Basic email regex pattern
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  
  return emailRegex.test(email.trim())
}

// Email validation with detailed error messages
export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  if (!email) {
    return { isValid: false, error: 'Email is required' }
  }
  
  if (typeof email !== 'string') {
    return { isValid: false, error: 'Email must be a valid string' }
  }
  
  const trimmedEmail = email.trim()
  
  if (trimmedEmail.length === 0) {
    return { isValid: false, error: 'Email cannot be empty' }
  }
  
  if (trimmedEmail.length > 254) {
    return { isValid: false, error: 'Email is too long (maximum 254 characters)' }
  }
  
  if (!isValidEmail(trimmedEmail)) {
    return { isValid: false, error: 'Please enter a valid email address' }
  }
  
  return { isValid: true }
}

// Email validation for forms with real-time feedback
export const useEmailValidation = () => {
  const validateEmailField = (email: string, options: { 
    required?: boolean; 
    onError?: (error: string) => void;
    onValid?: () => void;
  } = {}) => {
    const { required = true, onError, onValid } = options
    
    if (!required && !email) {
      onValid?.()
      return true
    }
    
    const validation = validateEmail(email)
    
    if (!validation.isValid) {
      onError?.(validation.error!)
      return false
    }
    
    onValid?.()
    return true
  }
  
  return { validateEmailField, isValidEmail, validateEmail }
}
