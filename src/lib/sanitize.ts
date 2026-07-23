// Simple regex-based sanitization for server-side use
const HTML_TAG_REGEX = /<[^>]*>/g
const SCRIPT_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi
const IMG_REGEX = /<img[^>]*>/gi
const ONERROR_REGEX = /onerror\s*=\s*["'][^"']*["']/gi

/**
 * Sanitize input to prevent XSS attacks
 * @param input - The input string to sanitize
 * @param options - Sanitization options
 * @returns Sanitized string
 */
export function sanitizeInput(
  input: string, 
  options: {
    allowTags?: string[]
    allowAttributes?: string[]
    stripHtml?: boolean
  } = {}
): string {
  if (!input || typeof input !== 'string') {
    return ''
  }

  const { stripHtml = true } = options

  if (stripHtml) {
    // Strip all HTML tags and return plain text
    return input
      .replace(SCRIPT_REGEX, '')
      .replace(IMG_REGEX, '')
      .replace(ONERROR_REGEX, '')
      .replace(HTML_TAG_REGEX, '')
      .trim()
  }

  // For now, always strip HTML for security
  return input
    .replace(SCRIPT_REGEX, '')
    .replace(IMG_REGEX, '')
    .replace(ONERROR_REGEX, '')
    .replace(HTML_TAG_REGEX, '')
    .trim()
}

/**
 * Sanitize role name - strip all HTML
 */
export function sanitizeRoleName(name: string): string {
  if (!name || typeof name !== 'string') return ''
  return name.replace(/<[^>]*>/g, '').trim()
}

/**
 * Sanitize role description - strip all HTML
 */
export function sanitizeRoleDescription(description: string): string {
  if (!description || typeof description !== 'string') return ''
  return description.replace(/<[^>]*>/g, '').trim()
}

/**
 * Sanitize user input for display
 */
export function sanitizeUserInput(input: string): string {
  return sanitizeInput(input, { stripHtml: true }).trim()
}

/**
 * Validate that input doesn't contain malicious content
 */
export function validateInput(input: string): { isValid: boolean; sanitized: string } {
  const sanitized = sanitizeInput(input, { stripHtml: true })
  const isValid = sanitized === input.trim()
  
  return { isValid, sanitized }
}
