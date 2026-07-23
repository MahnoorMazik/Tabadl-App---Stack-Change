/**
 * Countries list utility
 * Provides a standardized list of countries for use across the application
 */

export interface Country {
  code: string
  name: string
}

// Comprehensive list of all countries (excluding Israel)
export const countryCodes: Country[] = [
  { code: '+966', name: 'Saudi Arabia' },
  { code: '+971', name: 'United Arab Emirates' },
  { code: '+973', name: 'Bahrain' },
  { code: '+974', name: 'Qatar' },
  { code: '+965', name: 'Kuwait' },
  { code: '+968', name: 'Oman' },
  { code: '+967', name: 'Yemen' },
  { code: '+962', name: 'Jordan' },
  { code: '+961', name: 'Lebanon' },
  { code: '+963', name: 'Syria' },
  { code: '+964', name: 'Iraq' },
  { code: '+20', name: 'Egypt' },
  { code: '+212', name: 'Morocco' },
  { code: '+213', name: 'Algeria' },
  { code: '+216', name: 'Tunisia' },
  { code: '+218', name: 'Libya' },
  { code: '+249', name: 'Sudan' },
  { code: '+1', name: 'United States' },
  { code: '+1', name: 'Canada' },
  { code: '+44', name: 'United Kingdom' },
  { code: '+33', name: 'France' },
  { code: '+49', name: 'Germany' },
  { code: '+39', name: 'Italy' },
  { code: '+34', name: 'Spain' },
  { code: '+31', name: 'Netherlands' },
  { code: '+32', name: 'Belgium' },
  { code: '+41', name: 'Switzerland' },
  { code: '+43', name: 'Austria' },
  { code: '+45', name: 'Denmark' },
  { code: '+46', name: 'Sweden' },
  { code: '+47', name: 'Norway' },
  { code: '+358', name: 'Finland' },
  { code: '+351', name: 'Portugal' },
  { code: '+30', name: 'Greece' },
  { code: '+353', name: 'Ireland' },
  { code: '+48', name: 'Poland' },
  { code: '+420', name: 'Czechia' },
  { code: '+36', name: 'Hungary' },
  { code: '+40', name: 'Romania' },
  { code: '+7', name: 'Russia' },
  { code: '+380', name: 'Ukraine' },
  { code: '+90', name: 'Turkey' },
  { code: '+91', name: 'India' },
  { code: '+86', name: 'China' },
  { code: '+81', name: 'Japan' },
  { code: '+82', name: 'South Korea' },
  { code: '+65', name: 'Singapore' },
  { code: '+60', name: 'Malaysia' },
  { code: '+62', name: 'Indonesia' },
  { code: '+66', name: 'Thailand' },
  { code: '+84', name: 'Vietnam' },
  { code: '+63', name: 'Philippines' },
  { code: '+64', name: 'New Zealand' },
  { code: '+61', name: 'Australia' },
  { code: '+27', name: 'South Africa' },
  { code: '+234', name: 'Nigeria' },
  { code: '+254', name: 'Kenya' },
  { code: '+233', name: 'Ghana' },
  { code: '+52', name: 'Mexico' },
  { code: '+55', name: 'Brazil' },
  { code: '+54', name: 'Argentina' },
  { code: '+56', name: 'Chile' },
  { code: '+57', name: 'Colombia' },
  { code: '+51', name: 'Peru' },
  { code: '+58', name: 'Venezuela' },
  { code: '+886', name: 'Taiwan' },
  { code: '+852', name: 'Hong Kong' },
  { code: '+853', name: 'Macau' },
  { code: '+855', name: 'Cambodia' },
  { code: '+856', name: 'Laos' },
  { code: '+95', name: 'Myanmar' },
  { code: '+880', name: 'Bangladesh' },
  { code: '+92', name: 'Pakistan' },
  { code: '+93', name: 'Afghanistan' },
  { code: '+94', name: 'Sri Lanka' },
  { code: '+977', name: 'Nepal' },
  { code: '+975', name: 'Bhutan' },
  { code: '+960', name: 'Maldives' },
  { code: '+850', name: 'North Korea' },
  { code: '+268', name: 'Swaziland' },
  { code: '+266', name: 'Lesotho' },
  { code: '+260', name: 'Zambia' },
  { code: '+255', name: 'Tanzania' },
  { code: '+256', name: 'Uganda' },
  { code: '+250', name: 'Rwanda' },
  { code: '+257', name: 'Burundi' },
  { code: '+251', name: 'Ethiopia' },
  { code: '+252', name: 'Somalia' },
  { code: '+253', name: 'Djibouti' },
  { code: '+245', name: 'Guinea-Bissau' },
  { code: '+238', name: 'Cape Verde' },
  { code: '+221', name: 'Senegal' },
  { code: '+223', name: 'Mali' },
  { code: '+224', name: 'Guinea' },
  { code: '+225', name: 'Ivory Coast' },
  { code: '+226', name: 'Burkina Faso' },
  { code: '+227', name: 'Niger' },
  { code: '+228', name: 'Togo' },
  { code: '+229', name: 'Benin' },
  { code: '+230', name: 'Mauritius' },
  { code: '+231', name: 'Liberia' },
  { code: '+232', name: 'Sierra Leone' },
  { code: '+235', name: 'Chad' },
  { code: '+236', name: 'CAR' },
  { code: '+237', name: 'Cameroon' },
  { code: '+240', name: 'Equatorial Guinea' },
  { code: '+241', name: 'Gabon' },
  { code: '+242', name: 'Congo' },
  { code: '+243', name: 'DR Congo' },
  { code: '+244', name: 'Angola' },
  { code: '+258', name: 'Mozambique' },
  { code: '+263', name: 'Zimbabwe' },
  { code: '+264', name: 'Namibia' },
  { code: '+265', name: 'Malawi' },
  { code: '+267', name: 'Botswana' },
  { code: '+269', name: 'Comoros' },
  { code: '+291', name: 'Eritrea' },
  { code: '+298', name: 'Faroe Islands' },
  { code: '+299', name: 'Greenland' },
  { code: '+500', name: 'Falkland Islands' },
  { code: '+501', name: 'Belize' },
  { code: '+502', name: 'Guatemala' },
  { code: '+503', name: 'El Salvador' },
  { code: '+504', name: 'Honduras' },
  { code: '+505', name: 'Nicaragua' },
  { code: '+506', name: 'Costa Rica' },
  { code: '+507', name: 'Panama' },
  { code: '+509', name: 'Haiti' },
  { code: '+590', name: 'Guadeloupe' },
  { code: '+591', name: 'Bolivia' },
  { code: '+592', name: 'Guyana' },
  { code: '+593', name: 'Ecuador' },
  { code: '+594', name: 'French Guiana' },
  { code: '+595', name: 'Paraguay' },
  { code: '+596', name: 'Martinique' },
  { code: '+597', name: 'Suriname' },
  { code: '+598', name: 'Uruguay' },
  { code: '+599', name: 'Netherlands Antilles' },
  { code: '+675', name: 'Papua New Guinea' },
  { code: '+676', name: 'Tonga' },
  { code: '+677', name: 'Solomon Islands' },
  { code: '+678', name: 'Vanuatu' },
  { code: '+679', name: 'Fiji' },
  { code: '+680', name: 'Palau' },
  { code: '+681', name: 'Wallis and Futuna' },
  { code: '+682', name: 'Cook Islands' },
  { code: '+683', name: 'Niue' },
  { code: '+685', name: 'Samoa' },
  { code: '+686', name: 'Kiribati' },
  { code: '+687', name: 'New Caledonia' },
  { code: '+688', name: 'Tuvalu' },
  { code: '+689', name: 'French Polynesia' },
  { code: '+690', name: 'Tokelau' },
  { code: '+691', name: 'Micronesia' },
  { code: '+692', name: 'Marshall Islands' },
  { code: '+970', name: 'Palestine' },
  { code: '+975', name: 'Bhutan' },
  { code: '+976', name: 'Mongolia' },
  { code: '+992', name: 'Tajikistan' },
  { code: '+993', name: 'Turkmenistan' },
  { code: '+994', name: 'Azerbaijan' },
  { code: '+995', name: 'Georgia' },
  { code: '+996', name: 'Kyrgyzstan' },
  { code: '+998', name: 'Uzbekistan' }
].filter(country => country.code !== '+972') // Exclude Israel

/**
 * Get unique list of countries sorted alphabetically with Saudi Arabia first
 */
export function getCountriesList(): Country[] {
  const uniqueCountries = Array.from(
    new Map(countryCodes.map(item => [item.name, item])).values()
  ).sort((a, b) => {
    // Put Saudi Arabia first, then sort alphabetically
    if (a.name === 'Saudi Arabia') return -1
    if (b.name === 'Saudi Arabia') return 1
    return a.name.localeCompare(b.name)
  })
  return uniqueCountries
}

/**
 * Validate if a country name is valid
 */
export function isValidCountry(countryName: string): boolean {
  const countries = getCountriesList()
  return countries.some(country => country.name === countryName)
}

/**
 * Find closest matching country name (case-insensitive)
 */
export function findClosestCountry(countryName: string): string | null {
  const countries = getCountriesList()
  const normalized = countryName.trim().toLowerCase()
  
  // Exact match (case-insensitive)
  const exactMatch = countries.find(c => c.name.toLowerCase() === normalized)
  if (exactMatch) return exactMatch.name
  
  // Partial match
  const partialMatch = countries.find(c => 
    c.name.toLowerCase().includes(normalized) || 
    normalized.includes(c.name.toLowerCase())
  )
  if (partialMatch) return partialMatch.name
  
  return null
}

