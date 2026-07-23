/**
 * Normalize phone number: remove spaces, dashes, parentheses, ensure consistent format
 * Converts various phone formats to a standard format: +[country code][number]
 * 
 * Examples:
 * - "+966 50 123 4567" → "+966501234567"
 * - "0501234567" → "+0501234567"
 * - "966501234567" → "+966501234567"
 * - "(966) 50-123-4567" → "+966501234567"
 */
export function normalizePhone(phone: string): string {
  if (!phone || typeof phone !== 'string') {
    return ''
  }
  
  // Remove all non-digit characters except leading +
  let normalized = phone.replace(/[^\d+]/g, '')
  
  // Ensure it starts with +
  if (!normalized.startsWith('+')) {
    normalized = '+' + normalized
  }
  
  return normalized
}

/**
 * Parse phone number into country code and local number
 * Returns { countryCode, localNumber, warning } or null if parsing fails
 * 
 * Examples:
 * - "+966501234567" → { countryCode: "+966", localNumber: "501234567", warning: null }
 * - "+966 50 123 4567" → { countryCode: "+966", localNumber: "501234567", warning: null }
 * - "invalid" → { countryCode: "+966", localNumber: "", warning: "Could not parse phone number" }
 */
export function parsePhoneNumber(phone: string | null | undefined): {
  countryCode: string
  localNumber: string
  warning: string | null
} | null {
  if (!phone || typeof phone !== 'string' || phone.trim() === '') {
    return { countryCode: '+966', localNumber: '', warning: null }
  }

  // List of known country codes (longest first to avoid partial matches)
  // Must match the complete list from signup page
  const countryCodes = [
    '+886', '+852', '+853', '+855', '+856', '+880', '+977', '+975', '+960', '+850', '+976',
    '+998', '+992', '+996', '+993', '+994', '+995', '+374', '+372', '+371', '+370', '+375',
    '+381', '+382', '+387', '+385', '+386', '+389', '+355', '+383', '+359', '+352', '+377',
    '+378', '+356', '+357', '+98', '+268', '+266', '+260', '+255', '+256', '+250', '+257',
    '+251', '+252', '+253', '+245', '+238', '+221', '+223', '+224', '+225', '+226', '+227',
    '+228', '+229', '+230', '+231', '+232', '+235', '+236', '+237', '+240', '+241', '+242',
    '+243', '+244', '+258', '+263', '+264', '+265', '+267', '+269', '+291', '+298', '+299',
    '+500', '+501', '+502', '+503', '+504', '+505', '+506', '+507', '+509', '+590', '+591',
    '+592', '+593', '+594', '+595', '+596', '+597', '+598', '+599', '+675', '+676', '+677',
    '+678', '+679', '+680', '+681', '+682', '+683', '+685', '+686', '+687', '+688', '+689',
    '+690', '+691', '+692', '+970', '+966', '+971', '+973', '+974', '+965', '+968', '+967',
    '+962', '+961', '+963', '+964', '+212', '+213', '+216', '+218', '+249', '+234', '+254',
    '+233', '+20', '+1', '+44', '+33', '+49', '+39', '+34', '+31', '+32', '+41', '+43',
    '+45', '+46', '+47', '+358', '+351', '+30', '+353', '+48', '+420', '+36', '+40', '+7',
    '+380', '+90', '+91', '+86', '+81', '+82', '+65', '+60', '+62', '+66', '+84', '+63',
    '+64', '+61', '+27', '+52', '+55', '+54', '+56', '+57', '+51', '+58', '+95', '+92',
    '+93', '+94'
  ].sort((a, b) => b.length - a.length) // Sort by length descending to match longest codes first

  // Normalize the phone number
  const normalized = normalizePhone(phone)
  
  // Try to find matching country code
  for (const code of countryCodes) {
    if (normalized.startsWith(code)) {
      const localNumber = normalized.substring(code.length).replace(/\D/g, '')
      return {
        countryCode: code,
        localNumber,
        warning: null
      }
    }
  }

  // If no country code found, default to +966 and show warning
  const digitsOnly = normalized.replace(/\D/g, '')
  const localNumber = digitsOnly.length > 3 ? digitsOnly.substring(digitsOnly.length - 10) : digitsOnly
  
  return {
    countryCode: '+966',
    localNumber,
    warning: 'Could not detect country code from stored phone number. Defaulted to +966.'
  }
}

