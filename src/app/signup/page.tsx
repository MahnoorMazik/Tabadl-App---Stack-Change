'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EmailInput } from '@/components/ui/email-input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { validateEmail } from '@/lib/email-validation'
import { normalizePhone } from '@/lib/phone-normalization'
import Link from 'next/link'
import { Building2, User, Lock, Phone, Building, AlertCircle, Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLocale } from '@/contexts/LocaleContext'

// Helper function to get flag emoji from country code
function getCountryFlag(code: string, name?: string): string {
  // Map country codes to ISO country codes for flag generation
  const codeToISO: Record<string, string> = {
    '+966': 'SA', '+971': 'AE', '+973': 'BH', '+974': 'QA', '+965': 'KW', '+968': 'OM',
    '+967': 'YE', '+962': 'JO', '+961': 'LB', '+963': 'SY', '+964': 'IQ', '+20': 'EG',
    '+212': 'MA', '+213': 'DZ', '+216': 'TN', '+218': 'LY', '+249': 'SD', 
    '+1': 'US', // US/Canada - will need special handling
    '+44': 'GB', '+33': 'FR', '+49': 'DE', '+39': 'IT', '+34': 'ES', '+31': 'NL',
    '+32': 'BE', '+41': 'CH', '+43': 'AT', '+45': 'DK', '+46': 'SE', '+47': 'NO',
    '+358': 'FI', '+351': 'PT', '+30': 'GR', '+353': 'IE', '+48': 'PL', '+420': 'CZ',
    '+36': 'HU', '+40': 'RO', '+7': 'RU', '+380': 'UA', '+90': 'TR', '+91': 'IN',
    '+86': 'CN', '+81': 'JP', '+82': 'KR', '+65': 'SG', '+60': 'MY', '+62': 'ID',
    '+66': 'TH', '+84': 'VN', '+63': 'PH', '+64': 'NZ', '+61': 'AU', '+27': 'ZA',
    '+234': 'NG', '+254': 'KE', '+233': 'GH', '+52': 'MX', '+55': 'BR', '+54': 'AR',
    '+56': 'CL', '+57': 'CO', '+51': 'PE', '+58': 'VE', '+886': 'TW', '+852': 'HK',
    '+853': 'MO', '+855': 'KH', '+856': 'LA', '+95': 'MM', '+880': 'BD', '+92': 'PK',
    '+93': 'AF', '+94': 'LK', '+977': 'NP', '+975': 'BT', '+960': 'MV', '+673': 'BN',
    '+670': 'TL', '+850': 'KP', '+976': 'MN', '+998': 'UZ', '+992': 'TJ', '+996': 'KG',
    '+993': 'TM', '+374': 'AM', '+995': 'GE', '+994': 'AZ', '+372': 'EE', '+371': 'LV',
    '+370': 'LT', '+375': 'BY', '+381': 'RS', '+382': 'ME', '+387': 'BA', '+385': 'HR',
    '+386': 'SI', '+389': 'MK', '+355': 'AL', '+383': 'XK', '+359': 'BG', '+352': 'LU',
    '+377': 'MC', '+378': 'SM', '+356': 'MT', '+357': 'CY', '+98': 'IR', '+268': 'SZ',
    '+266': 'LS', '+260': 'ZM', '+255': 'TZ', '+256': 'UG', '+250': 'RW', '+257': 'BI',
    '+251': 'ET', '+252': 'SO', '+253': 'DJ', '+245': 'GW', '+238': 'CV', '+221': 'SN',
    '+223': 'ML', '+224': 'GN', '+225': 'CI', '+226': 'BF', '+227': 'NE', '+228': 'TG',
    '+229': 'BJ', '+230': 'MU', '+231': 'LR', '+232': 'SL', '+235': 'TD', '+236': 'CF',
    '+237': 'CM', '+240': 'GQ', '+241': 'GA', '+242': 'CG', '+243': 'CD', '+244': 'AO',
    '+258': 'MZ', '+263': 'ZW', '+264': 'NA', '+265': 'MW', '+267': 'BW', '+269': 'KM',
    '+291': 'ER', '+298': 'FO', '+299': 'GL', '+500': 'FK', '+501': 'BZ', '+502': 'GT',
    '+503': 'SV', '+504': 'HN', '+505': 'NI', '+506': 'CR', '+507': 'PA', '+509': 'HT',
    '+590': 'GP', '+591': 'BO', '+592': 'GY', '+593': 'EC', '+594': 'GF', '+595': 'PY',
    '+596': 'MQ', '+597': 'SR', '+598': 'UY', '+599': 'AN', '+675': 'PG', '+676': 'TO',
    '+677': 'SB', '+678': 'VU', '+679': 'FJ', '+680': 'PW', '+681': 'WF', '+682': 'CK',
    '+683': 'NU', '+685': 'WS', '+686': 'KI', '+687': 'NC', '+688': 'TV', '+689': 'PF',
    '+690': 'TK', '+691': 'FM', '+692': 'MH', '+970': 'PS'
  }
  
  // Special handling for +1 (US/Canada)
  if (code === '+1' && name) {
    if (name.includes('Canada')) return '🇨🇦'
    return '🇺🇸'
  }
  
  const iso = codeToISO[code] || 'SA'
  // Convert ISO country code to flag emoji
  try {
    return String.fromCodePoint(...iso.split('').map(char => 127397 + char.charCodeAt(0)))
  } catch {
    // Fallback to empty string if flag generation fails
    return ''
  }
}

export default function ClientSignupPage() {
  const [formData, setFormData] = useState({
    name: '',
    nameAr: '',
    email: '',
    password: '',
    companyName: '',
    phoneCountryCode: '+966', // Default to Saudi Arabia
    phone: '',
  })
  const [countryCodeOpen, setCountryCodeOpen] = useState(false)
  const [error, setError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { register } = useAuth()
  const { t } = useLocale()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setEmailError('')
    
    // Validate email before submitting
    const emailValidation = validateEmail(formData.email)
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error!)
      return
    }
    
    // Validate phone number
    if (!formData.phone || formData.phone.trim() === '') {
      setError(t('auth.phoneRequired'))
      return
    }
    
    if (formData.phone.length !== 10) {
      setError(t('auth.phoneInvalid'))
      return
    }
    
    setLoading(true)

    try {
      // Combine country code and phone number
      const fullPhoneNumber = `${formData.phoneCountryCode}${formData.phone}`
      const result = await register({
        ...formData,
        phone: fullPhoneNumber, // Send combined phone number to API
      }, 'client')
      if (result.requiresEmailVerification) {
        router.push(`/check-email?email=${encodeURIComponent(result.email)}`)
        return
      }
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || t('auth.registrationFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.id]: e.target.value
    }))
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits and limit to 10 characters
    const value = e.target.value.replace(/\D/g, '').slice(0, 10)
    setFormData(prev => ({ ...prev, phone: value }))
  }

  // Country codes list (same as consultation form)
  const countryCodes = [
    { code: '+966', name: 'Saudi Arabia', flag: getCountryFlag('+966') },
    { code: '+971', name: 'United Arab Emirates', flag: getCountryFlag('+971') },
    { code: '+973', name: 'Bahrain', flag: getCountryFlag('+973') },
    { code: '+974', name: 'Qatar', flag: getCountryFlag('+974') },
    { code: '+965', name: 'Kuwait', flag: getCountryFlag('+965') },
    { code: '+968', name: 'Oman', flag: getCountryFlag('+968') },
    { code: '+967', name: 'Yemen', flag: getCountryFlag('+967') },
    { code: '+962', name: 'Jordan', flag: getCountryFlag('+962') },
    { code: '+961', name: 'Lebanon', flag: getCountryFlag('+961') },
    { code: '+963', name: 'Syria', flag: getCountryFlag('+963') },
    { code: '+964', name: 'Iraq', flag: getCountryFlag('+964') },
    { code: '+20', name: 'Egypt', flag: getCountryFlag('+20') },
    { code: '+212', name: 'Morocco', flag: getCountryFlag('+212') },
    { code: '+213', name: 'Algeria', flag: getCountryFlag('+213') },
    { code: '+216', name: 'Tunisia', flag: getCountryFlag('+216') },
    { code: '+218', name: 'Libya', flag: getCountryFlag('+218') },
    { code: '+249', name: 'Sudan', flag: getCountryFlag('+249') },
    { code: '+1', name: 'United States', flag: getCountryFlag('+1', 'United States') },
    { code: '+1', name: 'Canada', flag: getCountryFlag('+1', 'Canada') },
    { code: '+44', name: 'United Kingdom', flag: getCountryFlag('+44') },
    { code: '+33', name: 'France', flag: getCountryFlag('+33') },
    { code: '+49', name: 'Germany', flag: getCountryFlag('+49') },
    { code: '+39', name: 'Italy', flag: getCountryFlag('+39') },
    { code: '+34', name: 'Spain', flag: getCountryFlag('+34') },
    { code: '+31', name: 'Netherlands', flag: getCountryFlag('+31') },
    { code: '+32', name: 'Belgium', flag: getCountryFlag('+32') },
    { code: '+41', name: 'Switzerland', flag: getCountryFlag('+41') },
    { code: '+43', name: 'Austria', flag: getCountryFlag('+43') },
    { code: '+45', name: 'Denmark', flag: getCountryFlag('+45') },
    { code: '+46', name: 'Sweden', flag: getCountryFlag('+46') },
    { code: '+47', name: 'Norway', flag: getCountryFlag('+47') },
    { code: '+358', name: 'Finland', flag: getCountryFlag('+358') },
    { code: '+351', name: 'Portugal', flag: getCountryFlag('+351') },
    { code: '+30', name: 'Greece', flag: getCountryFlag('+30') },
    { code: '+353', name: 'Ireland', flag: getCountryFlag('+353') },
    { code: '+48', name: 'Poland', flag: getCountryFlag('+48') },
    { code: '+420', name: 'Czechia', flag: getCountryFlag('+420') },
    { code: '+36', name: 'Hungary', flag: getCountryFlag('+36') },
    { code: '+40', name: 'Romania', flag: getCountryFlag('+40') },
    { code: '+7', name: 'Russia', flag: getCountryFlag('+7', 'Russia') },
    { code: '+380', name: 'Ukraine', flag: getCountryFlag('+380') },
    { code: '+90', name: 'Turkey', flag: getCountryFlag('+90') },
    { code: '+91', name: 'India', flag: getCountryFlag('+91') },
    { code: '+86', name: 'China', flag: getCountryFlag('+86') },
    { code: '+81', name: 'Japan', flag: getCountryFlag('+81') },
    { code: '+82', name: 'South Korea', flag: getCountryFlag('+82') },
    { code: '+65', name: 'Singapore', flag: getCountryFlag('+65') },
    { code: '+60', name: 'Malaysia', flag: getCountryFlag('+60') },
    { code: '+62', name: 'Indonesia', flag: getCountryFlag('+62') },
    { code: '+66', name: 'Thailand', flag: getCountryFlag('+66') },
    { code: '+84', name: 'Vietnam', flag: getCountryFlag('+84') },
    { code: '+63', name: 'Philippines', flag: getCountryFlag('+63') },
    { code: '+64', name: 'New Zealand', flag: getCountryFlag('+64') },
    { code: '+61', name: 'Australia', flag: getCountryFlag('+61') },
    { code: '+27', name: 'South Africa', flag: getCountryFlag('+27') },
    { code: '+234', name: 'Nigeria', flag: getCountryFlag('+234') },
    { code: '+254', name: 'Kenya', flag: getCountryFlag('+254') },
    { code: '+233', name: 'Ghana', flag: getCountryFlag('+233') },
    { code: '+52', name: 'Mexico', flag: getCountryFlag('+52') },
    { code: '+55', name: 'Brazil', flag: getCountryFlag('+55') },
    { code: '+54', name: 'Argentina', flag: getCountryFlag('+54') },
    { code: '+56', name: 'Chile', flag: getCountryFlag('+56') },
    { code: '+57', name: 'Colombia', flag: getCountryFlag('+57') },
    { code: '+51', name: 'Peru', flag: getCountryFlag('+51') },
    { code: '+58', name: 'Venezuela', flag: getCountryFlag('+58') },
    { code: '+886', name: 'Taiwan', flag: getCountryFlag('+886') },
    { code: '+852', name: 'Hong Kong', flag: getCountryFlag('+852') },
    { code: '+853', name: 'Macau', flag: getCountryFlag('+853') },
    { code: '+855', name: 'Cambodia', flag: getCountryFlag('+855') },
    { code: '+856', name: 'Laos', flag: getCountryFlag('+856') },
    { code: '+95', name: 'Myanmar', flag: getCountryFlag('+95') },
    { code: '+880', name: 'Bangladesh', flag: getCountryFlag('+880') },
    { code: '+92', name: 'Pakistan', flag: getCountryFlag('+92') },
    { code: '+93', name: 'Afghanistan', flag: getCountryFlag('+93') },
    { code: '+94', name: 'Sri Lanka', flag: getCountryFlag('+94') },
    { code: '+977', name: 'Nepal', flag: getCountryFlag('+977') },
    { code: '+975', name: 'Bhutan', flag: getCountryFlag('+975') },
    { code: '+960', name: 'Maldives', flag: getCountryFlag('+960') },
    { code: '+850', name: 'North Korea', flag: getCountryFlag('+850') },
    { code: '+268', name: 'Swaziland', flag: getCountryFlag('+268') },
    { code: '+266', name: 'Lesotho', flag: getCountryFlag('+266') },
    { code: '+260', name: 'Zambia', flag: getCountryFlag('+260') },
    { code: '+255', name: 'Tanzania', flag: getCountryFlag('+255') },
    { code: '+256', name: 'Uganda', flag: getCountryFlag('+256') },
    { code: '+250', name: 'Rwanda', flag: getCountryFlag('+250') },
    { code: '+257', name: 'Burundi', flag: getCountryFlag('+257') },
    { code: '+251', name: 'Ethiopia', flag: getCountryFlag('+251') },
    { code: '+252', name: 'Somalia', flag: getCountryFlag('+252') },
    { code: '+253', name: 'Djibouti', flag: getCountryFlag('+253') },
    { code: '+245', name: 'Guinea-Bissau', flag: getCountryFlag('+245') },
    { code: '+238', name: 'Cape Verde', flag: getCountryFlag('+238') },
    { code: '+221', name: 'Senegal', flag: getCountryFlag('+221') },
    { code: '+223', name: 'Mali', flag: getCountryFlag('+223') },
    { code: '+224', name: 'Guinea', flag: getCountryFlag('+224') },
    { code: '+225', name: 'Ivory Coast', flag: getCountryFlag('+225') },
    { code: '+226', name: 'Burkina Faso', flag: getCountryFlag('+226') },
    { code: '+227', name: 'Niger', flag: getCountryFlag('+227') },
    { code: '+228', name: 'Togo', flag: getCountryFlag('+228') },
    { code: '+229', name: 'Benin', flag: getCountryFlag('+229') },
    { code: '+230', name: 'Mauritius', flag: getCountryFlag('+230') },
    { code: '+231', name: 'Liberia', flag: getCountryFlag('+231') },
    { code: '+232', name: 'Sierra Leone', flag: getCountryFlag('+232') },
    { code: '+235', name: 'Chad', flag: getCountryFlag('+235') },
    { code: '+236', name: 'CAR', flag: getCountryFlag('+236') },
    { code: '+237', name: 'Cameroon', flag: getCountryFlag('+237') },
    { code: '+240', name: 'Equatorial Guinea', flag: getCountryFlag('+240') },
    { code: '+241', name: 'Gabon', flag: getCountryFlag('+241') },
    { code: '+242', name: 'Congo', flag: getCountryFlag('+242') },
    { code: '+243', name: 'DR Congo', flag: getCountryFlag('+243') },
    { code: '+244', name: 'Angola', flag: getCountryFlag('+244') },
    { code: '+258', name: 'Mozambique', flag: getCountryFlag('+258') },
    { code: '+263', name: 'Zimbabwe', flag: getCountryFlag('+263') },
    { code: '+264', name: 'Namibia', flag: getCountryFlag('+264') },
    { code: '+265', name: 'Malawi', flag: getCountryFlag('+265') },
    { code: '+267', name: 'Botswana', flag: getCountryFlag('+267') },
    { code: '+269', name: 'Comoros', flag: getCountryFlag('+269') },
    { code: '+291', name: 'Eritrea', flag: getCountryFlag('+291') },
    { code: '+298', name: 'Faroe Islands', flag: getCountryFlag('+298') },
    { code: '+299', name: 'Greenland', flag: getCountryFlag('+299') },
    { code: '+500', name: 'Falkland Islands', flag: getCountryFlag('+500') },
    { code: '+501', name: 'Belize', flag: getCountryFlag('+501') },
    { code: '+502', name: 'Guatemala', flag: getCountryFlag('+502') },
    { code: '+503', name: 'El Salvador', flag: getCountryFlag('+503') },
    { code: '+504', name: 'Honduras', flag: getCountryFlag('+504') },
    { code: '+505', name: 'Nicaragua', flag: getCountryFlag('+505') },
    { code: '+506', name: 'Costa Rica', flag: getCountryFlag('+506') },
    { code: '+507', name: 'Panama', flag: getCountryFlag('+507') },
    { code: '+509', name: 'Haiti', flag: getCountryFlag('+509') },
    { code: '+590', name: 'Guadeloupe', flag: getCountryFlag('+590') },
    { code: '+591', name: 'Bolivia', flag: getCountryFlag('+591') },
    { code: '+592', name: 'Guyana', flag: getCountryFlag('+592') },
    { code: '+593', name: 'Ecuador', flag: getCountryFlag('+593') },
    { code: '+594', name: 'French Guiana', flag: getCountryFlag('+594') },
    { code: '+595', name: 'Paraguay', flag: getCountryFlag('+595') },
    { code: '+596', name: 'Martinique', flag: getCountryFlag('+596') },
    { code: '+597', name: 'Suriname', flag: getCountryFlag('+597') },
    { code: '+598', name: 'Uruguay', flag: getCountryFlag('+598') },
    { code: '+599', name: 'Netherlands Antilles', flag: getCountryFlag('+599') },
    { code: '+675', name: 'Papua New Guinea', flag: getCountryFlag('+675') },
    { code: '+676', name: 'Tonga', flag: getCountryFlag('+676') },
    { code: '+677', name: 'Solomon Islands', flag: getCountryFlag('+677') },
    { code: '+678', name: 'Vanuatu', flag: getCountryFlag('+678') },
    { code: '+679', name: 'Fiji', flag: getCountryFlag('+679') },
    { code: '+680', name: 'Palau', flag: getCountryFlag('+680') },
    { code: '+681', name: 'Wallis and Futuna', flag: getCountryFlag('+681') },
    { code: '+682', name: 'Cook Islands', flag: getCountryFlag('+682') },
    { code: '+683', name: 'Niue', flag: getCountryFlag('+683') },
    { code: '+685', name: 'Samoa', flag: getCountryFlag('+685') },
    { code: '+686', name: 'Kiribati', flag: getCountryFlag('+686') },
    { code: '+687', name: 'New Caledonia', flag: getCountryFlag('+687') },
    { code: '+688', name: 'Tuvalu', flag: getCountryFlag('+688') },
    { code: '+689', name: 'French Polynesia', flag: getCountryFlag('+689') },
    { code: '+690', name: 'Tokelau', flag: getCountryFlag('+690') },
    { code: '+691', name: 'Micronesia', flag: getCountryFlag('+691') },
    { code: '+692', name: 'Marshall Islands', flag: getCountryFlag('+692') },
    { code: '+970', name: 'Palestine', flag: getCountryFlag('+970') },
    { code: '+976', name: 'Mongolia', flag: getCountryFlag('+976') },
    { code: '+992', name: 'Tajikistan', flag: getCountryFlag('+992') },
    { code: '+993', name: 'Turkmenistan', flag: getCountryFlag('+993') },
    { code: '+994', name: 'Azerbaijan', flag: getCountryFlag('+994') },
    { code: '+995', name: 'Georgia', flag: getCountryFlag('+995') },
    { code: '+996', name: 'Kyrgyzstan', flag: getCountryFlag('+996') },
    { code: '+998', name: 'Uzbekistan', flag: getCountryFlag('+998') }
  ].filter(country => country.code !== '+972') // Exclude Israel (972)
  
  // Remove duplicates based on code and sort
  const uniqueCountryCodes = Array.from(
    new Map(countryCodes.map(item => [item.code, item])).values()
  ).sort((a, b) => {
    // Put Saudi Arabia first, then sort alphabetically
    if (a.code === '+966') return -1
    if (b.code === '+966') return 1
    return a.name.localeCompare(b.name)
  })

  const selectedCountry = uniqueCountryCodes.find(c => c.code === formData.phoneCountryCode)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-600 to-teal-600 p-4">
      <Card className="w-full max-w-md shadow-lg dark:bg-card dark:border-border">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto bg-emerald-100 dark:bg-emerald-900/30 w-16 h-16 rounded-full flex items-center justify-center">
            <Building2 className="h-8 w-8 text-emerald-700 dark:text-emerald-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-foreground">{t('auth.createClientAccount')}</CardTitle>
          <CardDescription className="text-gray-600 dark:text-muted-foreground">
            {t('auth.startJourney')}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {t('auth.fullName')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                placeholder={t('auth.fullNameEnPlaceholder')}
                value={formData.name}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <EmailInput
              id="email"
              label={t('auth.email')}
              placeholder="you@example.com"
              value={formData.email}
              error={emailError}
              onChange={(value) => setFormData(prev => ({ ...prev, email: value }))}
              disabled={loading}
              required
            />

            <div className="space-y-2">
              <Label htmlFor="companyName" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                {t('auth.companyName')}
              </Label>
              <Input
                id="companyName"
                type="text"
                placeholder="Your Company Name"
                value={formData.companyName}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                {t('auth.phoneNumber')} *
              </Label>
              <div className="flex gap-2">
                <Popover open={countryCodeOpen} onOpenChange={setCountryCodeOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={countryCodeOpen}
                      className="w-32 justify-between p-3"
                      type="button"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-sm whitespace-nowrap">{selectedCountry?.code || '+966'}</span>
                      </div>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0">
                    <Command shouldFilter={true}>
                      <CommandInput placeholder={t('auth.searchCountryCode')} />
                      <CommandList className="max-h-[300px] overflow-y-auto">
                        <CommandEmpty>{t('auth.noCountryFound')}</CommandEmpty>
                        <CommandGroup>
                          {uniqueCountryCodes.map((country) => (
                            <CommandItem
                              key={country.code}
                              value={`${country.code} ${country.name}`}
                              onSelect={() => {
                                setFormData(prev => ({ ...prev, phoneCountryCode: country.code }))
                                setCountryCodeOpen(false)
                              }}
                              className="cursor-pointer"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4 shrink-0",
                                  formData.phoneCountryCode === country.code ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <span className="font-medium text-sm whitespace-nowrap">{country.code}</span>
                                <span className="text-sm text-muted-foreground ml-auto">{country.name}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="501234567"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  required
                  maxLength={10}
                  className="flex-1 p-3"
                  disabled={loading}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-muted-foreground">{t('auth.phonePlaceholder')}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                {t('auth.password')}
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                disabled={loading}
              />
              <p className="text-xs text-gray-500 dark:text-muted-foreground">{t('auth.passwordMinLength')}</p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white"
              disabled={loading}
            >
              {loading ? t('auth.creatingAccount') : t('auth.createAccount')}
            </Button>

            <div className="text-center text-sm text-gray-600 dark:text-muted-foreground">
              {t('auth.alreadyHaveAccount')}{' '}
              <Link href="/login" className="text-emerald-700 dark:text-emerald-400 font-semibold hover:text-emerald-800 dark:hover:text-emerald-300 hover:underline">
                {t('auth.signIn')}
              </Link>
            </div>

            <div className="text-center text-sm">
              <Link href="/" className="text-gray-600 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-foreground hover:underline">
                {t('auth.backToHome')}
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

