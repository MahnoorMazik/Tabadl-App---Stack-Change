'use client'
 
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmailInput } from '@/components/ui/email-input'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { validateEmail } from '@/lib/email-validation'
import { 
  FileText, 
  HeadphonesIcon,
  Building,
  ArrowRight,
  Mail,
  Phone,
  MapPin,
  Plus,
  X
} from 'lucide-react'
import Link from 'next/link'
import { MainHeader } from '@/components/MainHeader'
import dynamic from 'next/dynamic'
import { useLocale } from '@/contexts/LocaleContext'

// Lazy load footer and WhatsApp button for better mobile performance
const MainFooter = dynamic(() => import('@/components/MainFooter').then(mod => ({ default: mod.MainFooter })), {
  ssr: true,
})


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

export default function ContactPage() {
  const { t } = useLocale()
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneCountryCode: '+966', // Default to Saudi Arabia
    phone: '',
    companyName: '',
    companyType: '',
    natureOfBusiness: '',
    designation: '',
    country: '',
    city: '',
    howDidYouHear: '',
    businessTypes: [] as string[],
    customBusinessType: ''
  })
  const [emailError, setEmailError] = useState('')
  const [customBusinessTypeInput, setCustomBusinessTypeInput] = useState('')
  const [duplicateWarning, setDuplicateWarning] = useState('')
  const [isDuplicate, setIsDuplicate] = useState(false)
  const [duplicateCount, setDuplicateCount] = useState(0)
  const [countryCodeOpen, setCountryCodeOpen] = useState(false)
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false)

  const howDidYouHearOptions = [
    t('contact.howHear.google'),
    t('contact.howHear.social'),
    t('contact.howHear.referral'),
    t('contact.howHear.advertisement'),
    t('contact.howHear.website'),
    t('contact.howHear.email'),
    t('contact.howHear.tradeshow'),
    t('contact.howHear.other')
  ]

  const commonBusinessTypes = [
    t('contact.businessType.technology'),
    t('contact.businessType.trading'),
    t('contact.businessType.manufacturing'),
    t('contact.businessType.consulting'),
    t('contact.businessType.realEstate'),
    t('contact.businessType.healthcare'),
    t('contact.businessType.education'),
    t('contact.businessType.food'),
    t('contact.businessType.construction'),
    t('contact.businessType.financial'),
    t('contact.businessType.ecommerce'),
    t('contact.businessType.logistics')
  ]

  // Comprehensive list of all countries with phone codes and flags (excluding Israel)
  const countryCodes = [
    { code: '+966', name: 'Saudi Arabia', flag: getCountryFlag('+966') },
    { code: '+971', name: 'United Arab Emirates', flag: getCountryFlag('+971') },
    { code: '+973', name: 'Bahrain', flag: getCountryFlag('+973') },
    { code: '+974', name: 'Qatar', flag: getCountryFlag('+974') },
    { code: '+965', name: 'Kuwait', flag: getCountryFlag('+965') },
    { code: '+968', name: 'Oman', flag: getCountryFlag('+968') },
    { code: '+967', name: 'Yemen', flag: getCountryFlag('+967', 'Yemen') },
    { code: '+962', name: 'Jordan', flag: getCountryFlag('+962', 'Jordan') },
    { code: '+961', name: 'Lebanon', flag: getCountryFlag('+961', 'Lebanon') },
    { code: '+963', name: 'Syria', flag: getCountryFlag('+963', 'Syria') },
    { code: '+964', name: 'Iraq', flag: getCountryFlag('+964', 'Iraq') },
    { code: '+20', name: 'Egypt', flag: getCountryFlag('+20', 'Egypt') },
    { code: '+212', name: 'Morocco', flag: getCountryFlag('+212', 'Morocco') },
    { code: '+213', name: 'Algeria', flag: getCountryFlag('+213', 'Algeria') },
    { code: '+216', name: 'Tunisia', flag: getCountryFlag('+216', 'Tunisia') },
    { code: '+218', name: 'Libya', flag: getCountryFlag('+218', 'Libya') },
    { code: '+249', name: 'Sudan', flag: getCountryFlag('+249', 'Sudan') },
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
    { code: '+852', name: 'Hong Kong', flag: getCountryFlag('+852') },
    { code: '+853', name: 'Macau', flag: getCountryFlag('+853') },
    { code: '+880', name: 'Bangladesh', flag: getCountryFlag('+880') },
    { code: '+886', name: 'Taiwan', flag: getCountryFlag('+886') },
    { code: '+961', name: 'Lebanon', flag: getCountryFlag('+961') },
    { code: '+962', name: 'Jordan', flag: getCountryFlag('+962') },
    { code: '+963', name: 'Syria', flag: getCountryFlag('+963') },
    { code: '+964', name: 'Iraq', flag: getCountryFlag('+964') },
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
    { code: '+965', name: 'Kuwait', flag: getCountryFlag('+965') },
    { code: '+966', name: 'Saudi Arabia', flag: getCountryFlag('+966') },
    { code: '+967', name: 'Yemen', flag: getCountryFlag('+967') },
    { code: '+968', name: 'Oman', flag: getCountryFlag('+968') },
    { code: '+970', name: 'Palestine', flag: getCountryFlag('+970') },
    { code: '+971', name: 'United Arab Emirates', flag: getCountryFlag('+971') },
    { code: '+973', name: 'Bahrain', flag: getCountryFlag('+973') },
    { code: '+974', name: 'Qatar', flag: getCountryFlag('+974') },
    { code: '+975', name: 'Bhutan', flag: getCountryFlag('+975') },
    { code: '+976', name: 'Mongolia', flag: getCountryFlag('+976') },
    { code: '+977', name: 'Nepal', flag: getCountryFlag('+977') },
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

  // Create a unique list of countries for the country dropdown
  const countriesList = Array.from(
    new Map(uniqueCountryCodes.map(item => [item.name, item])).values()
  ).sort((a, b) => {
    // Put Saudi Arabia first, then sort alphabetically
    if (a.name === 'Saudi Arabia') return -1
    if (b.name === 'Saudi Arabia') return 1
    return a.name.localeCompare(b.name)
  })

  const selectedCountryFromList = countriesList.find(c => c.name === formData.country)

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits and limit to 10 characters
    const value = e.target.value.replace(/\D/g, '').slice(0, 10)
    setFormData(prev => ({ ...prev, phone: value }))
  }

  const removeBusinessType = (type: string) => {
    setFormData(prev => ({
      ...prev,
      businessTypes: prev.businessTypes.filter(t => t !== type)
    }))
  }

  const addCustomBusinessType = () => {
    if (customBusinessTypeInput.trim() && !formData.businessTypes.includes(customBusinessTypeInput.trim())) {
      setFormData(prev => ({
        ...prev,
        businessTypes: [...prev.businessTypes, customBusinessTypeInput.trim()]
      }))
      setCustomBusinessTypeInput('')
    }
  }

  const addBusinessType = (type: string) => {
    if (!formData.businessTypes.includes(type)) {
      setFormData(prev => ({
        ...prev,
        businessTypes: [...prev.businessTypes, type]
      }))
    }
  }

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate email only if provided
    if (formData.email) {
      const emailValidation = validateEmail(formData.email)
      if (!emailValidation.isValid) {
        setEmailError(emailValidation.error!)
        return
      }
    }
    
    setIsSubmitting(true)
    setEmailError('')
    setSubmitMessage('')
    setDuplicateWarning('')
    setIsDuplicate(false)
    setDuplicateCount(0)
    
    try {
      // Combine country code and phone number
      const fullPhoneNumber = `${formData.phoneCountryCode}${formData.phone}`
      const requestData = {
        ...formData,
        phone: fullPhoneNumber, // Send combined phone number to API
        businessTypes: formData.businessTypes
      }
      console.log('Submitting form data:', requestData)
      
      const response = await fetch('/api/leads/consultation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })
      
      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)

      let result
      try {
        result = await response.json()
      } catch (jsonError) {
        console.error('Error parsing JSON response:', jsonError)
        setSubmitMessage('Invalid response from server. Please try again.')
        return
      }

      if (response.ok && result?.success === true) {
        // Handle standardized success response
        const responseData = result.data || {}
        setSubmitMessage(responseData.message || result.meta?.message || result.message || 'Thank you for your consultation request! We will get back to you soon.')
        
        // Handle duplicate warnings
        if (responseData.warning) {
          setDuplicateWarning(responseData.warning)
        }
        if (responseData.isDuplicate !== undefined) {
          setIsDuplicate(responseData.isDuplicate)
        }
        if (responseData.duplicateCount !== undefined) {
          setDuplicateCount(responseData.duplicateCount)
        }
        
        // Reset form
        setFormData({
          fullName: '',
          email: '',
          phoneCountryCode: '+966',
          phone: '',
          companyName: '',
          companyType: '',
          natureOfBusiness: '',
          designation: '',
          country: '',
          city: '',
          howDidYouHear: '',
          businessTypes: [],
          customBusinessType: ''
        })
        setCustomBusinessTypeInput('')
      } else {
        // Handle standardized error response
        // The error response structure is: { success: false, error: { code, message, details, ... } }
        const errorData = result?.error || {}
        const errorMessage = errorData?.message || 
                            result?.message || 
                            (typeof result?.error === 'string' ? result.error : null) ||
                            `Failed to submit consultation request (${response.status}). Please try again.`
        const errorDetails = Array.isArray(errorData?.details) ? errorData.details : []
        const firstErrorDetail = errorDetails[0]
        const errorField = firstErrorDetail?.field || errorData?.field || result?.field
        
        // Check for duplicate/max reached errors
        if (errorData?.context?.duplicate || errorData?.context?.maxReached || result?.duplicate) {
          if (errorField === 'email') {
            setEmailError(errorMessage)
          } else {
            setSubmitMessage(errorMessage)
          }
        } else if (errorField === 'phone') {
          setSubmitMessage(errorMessage)
        } else if (errorField === 'businessTypes') {
          setSubmitMessage('Please add at least one business type.')
        } else if (errorField === 'email') {
          setEmailError(errorMessage)
        } else {
          // Log error details safely without causing console errors
          // Only log if we have meaningful error information
          if (process.env.NODE_ENV === 'development' && errorMessage && errorMessage !== 'Failed to submit consultation request (undefined). Please try again.') {
            try {
              const errorInfo = {
                status: response.status,
                statusText: response.statusText,
                errorCode: errorData?.code || 'UNKNOWN',
                errorMessage: errorMessage,
                errorField: errorField || 'unknown',
                hasErrorDetails: errorDetails.length > 0
              }
              // Use console.log instead of console.error to avoid hydration issues
              console.log('[Contact Form] API Error Response:', JSON.stringify(errorInfo, null, 2))
            } catch (logError) {
              // Silently fail if logging causes issues
            }
          }
          setSubmitMessage(errorMessage || 'Failed to submit consultation request. Please try again.')
        }
      }
    } catch (error: any) {
      // Handle network errors or parsing errors
      // Log error safely without causing hydration issues
      if (process.env.NODE_ENV === 'development') {
        try {
          const errorMsg = error?.message || error?.toString() || 'Unknown error'
          console.log('[Contact Form] Network/Parse Error:', errorMsg)
        } catch (logError) {
          // Silently fail if logging causes issues
        }
      }
      const errorMessage = error?.message || 
                          error?.toString() || 
                          'Network error occurred. Please check your connection and try again.'
      setSubmitMessage(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-background">
      <MainHeader />

      {/* Hero Section */}
      <section className="pt-32 pb-16 bg-[radial-gradient(circle_at_top,_#f7f5f0,_#ffffff)] dark:bg-background dark:[background:var(--background)]">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600">
              {t('contact.hero.title')}
            </h1>
            <p className="text-xl text-gray-700 dark:text-muted-foreground leading-relaxed">
              {t('contact.hero.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Business Consultation Form - Full Width */}
      <section className="py-12 bg-[radial-gradient(circle_at_top,_#f5fbf8,_#ffffff)] dark:bg-background dark:[background:var(--background)]">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            {/* Business Consultation Form */}
            <Card className="shadow-2xl border-0 bg-white/90 dark:bg-card dark:[background:var(--card)] backdrop-blur-sm">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold mb-6 dark:text-foreground">{t('contact.form.title')}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Row 1: Full Name, Email, Phone */}
                  <div className="grid md:grid-cols-3 gap-4">
                    {/* Full Name */}
                    <div>
                      <Label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-foreground mb-2">{t('contact.form.name')} *</Label>
                      <Input
                        id="fullName"
                        type="text"
                        placeholder={t('contact.form.name')}
                        value={formData.fullName}
                        onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                        required
                        className="w-full p-3"
                      />
                    </div>

                    {/* Email Address */}
                    <div>
                      <EmailInput
                        id="email"
                        label={t('contact.form.email')}
                        placeholder={t('contact.form.email')}
                        value={formData.email}
                        error={emailError}
                        onChange={(value) => setFormData(prev => ({ ...prev, email: value }))}
                      />
                    </div>

                    {/* Phone Number */}
                    <div>
                      <Label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-foreground mb-2">{t('contact.form.phone')} *</Label>
                      <div className="flex gap-2">
                        <Popover open={countryCodeOpen} onOpenChange={setCountryCodeOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={countryCodeOpen}
                              className="w-32 justify-between p-3"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-medium text-sm whitespace-nowrap">{selectedCountry?.code || '+966'}</span>
                              </div>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-0">
                            <Command shouldFilter={true}>
                              <CommandInput placeholder={t('contact.searchCountryCode')} />
                              <CommandList className="max-h-[300px] overflow-y-auto">
                                <CommandEmpty>{t('contact.noCountryFound')}</CommandEmpty>
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
                        />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-muted-foreground mt-1">{t('contact.phonePlaceholder')}</p>
                    </div>
                  </div>

                  {/* Row 2: Designation, Company Name, Company Type */}
                  <div className="grid md:grid-cols-3 gap-4">
                    {/* Designation */}
                    <div>
                      <Label htmlFor="designation" className="block text-sm font-medium text-gray-700 dark:text-foreground mb-2">{t('contact.form.designation')}</Label>
                      <Input
                        id="designation"
                        type="text"
                        placeholder={t('contact.form.designation')}
                        value={formData.designation}
                        onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value }))}
                        className="w-full p-3"
                      />
                    </div>

                    {/* Company Name */}
                    <div>
                      <Label htmlFor="companyName" className="block text-sm font-medium text-gray-700 dark:text-foreground mb-2">{t('contact.form.company')}</Label>
                      <Input
                        id="companyName"
                        type="text"
                        placeholder={t('contact.form.company')}
                        value={formData.companyName}
                        onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                        className="w-full p-3"
                      />
                    </div>

                    {/* Company Type */}
                    <div>
                      <Label htmlFor="companyType" className="block text-sm font-medium text-gray-700 dark:text-foreground mb-2">{t('contact.form.companyType')}</Label>
                      <Input
                        id="companyType"
                        type="text"
                        placeholder={t('contact.form.companyType')}
                        value={formData.companyType}
                        onChange={(e) => setFormData(prev => ({ ...prev, companyType: e.target.value }))}
                        className="w-full p-3"
                      />
                    </div>
                  </div>

                  {/* Row 3: Country, City, How did you hear about us */}
                  <div className="grid md:grid-cols-3 gap-4">
                    {/* Country */}
                    <div>
                      <Label htmlFor="country" className="block text-sm font-medium text-gray-700 dark:text-foreground mb-2">{t('contact.form.country')} *</Label>
                      <Popover open={countryDropdownOpen} onOpenChange={setCountryDropdownOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={countryDropdownOpen}
                            className="w-full justify-between p-3"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-sm whitespace-nowrap overflow-hidden text-ellipsis">
                                {selectedCountryFromList?.name || t('contact.selectCountry')}
                              </span>
                            </div>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                          <Command shouldFilter={true}>
                            <CommandInput placeholder={t('contact.searchCountry')} />
                            <CommandList className="max-h-[300px] overflow-y-auto">
                              <CommandEmpty>{t('contact.noCountryFound')}</CommandEmpty>
                              <CommandGroup>
                                {countriesList.map((country) => (
                                  <CommandItem
                                    key={country.name}
                                    value={country.name}
                                    onSelect={() => {
                                      setFormData(prev => ({ ...prev, country: country.name }))
                                      setCountryDropdownOpen(false)
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4 shrink-0",
                                        formData.country === country.name ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <span className="text-sm">{country.name}</span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* City */}
                    <div>
                      <Label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-foreground mb-2">{t('contact.form.city')} *</Label>
                      <Input
                        id="city"
                        type="text"
                        placeholder={t('contact.form.city')}
                        value={formData.city}
                        onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                        required
                        className="w-full p-3"
                      />
                    </div>

                    {/* How did you hear about us? */}
                    <div>
                      <Label htmlFor="howDidYouHear" className="block text-sm font-medium text-gray-700 dark:text-foreground mb-2">{t('contact.form.howHear')}</Label>
                      <Select value={formData.howDidYouHear} onValueChange={(value) => setFormData(prev => ({ ...prev, howDidYouHear: value }))}>
                        <SelectTrigger className="w-full p-3 dark:bg-input/30">
                          <SelectValue placeholder={t('contact.selectOption')} />
                        </SelectTrigger>
                        <SelectContent>
                          {howDidYouHearOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Row 4: Nature of Business and Business Types */}
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Nature of Business */}
                    <div>
                      <Label htmlFor="natureOfBusiness" className="block text-sm font-medium text-gray-700 dark:text-foreground mb-2">{t('contact.form.nature')}</Label>
                      <Textarea
                        id="natureOfBusiness"
                        placeholder={t('contact.form.nature')}
                        rows={3}
                        value={formData.natureOfBusiness}
                        onChange={(e) => setFormData(prev => ({ ...prev, natureOfBusiness: e.target.value }))}
                        className="w-full p-3"
                      />
                    </div>

                    {/* Business Types */}
                    <div>
                      <Label className="block text-sm font-medium text-gray-700 dark:text-foreground mb-2">
                        {t('contact.form.businessTypes')}
                      </Label>
                      
                      {/* Selected Business Types */}
                      {formData.businessTypes.length > 0 && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm text-gray-600 dark:text-muted-foreground">{t('contact.form.selectedTypes')}</p>
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, businessTypes: [] }))}
                              className="text-xs text-red-600 hover:text-red-800 underline"
                            >
                              {t('contact.form.clearAll')}
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                          {formData.businessTypes.map((type, index) => (
                            <div key={index} className="flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 px-3 py-1 rounded-full text-sm">
                              <span>{type}</span>
                              <button
                                type="button"
                                onClick={() => removeBusinessType(type)}
                                className="hover:bg-emerald-200 dark:hover:bg-emerald-800/50 rounded-full p-1"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                          </div>
                        </div>
                      )}

                      {/* Predefined Business Types Dropdown */}
                      <div className="mb-4">
                        <Select onValueChange={(value) => addBusinessType(value)} value="">
                          <SelectTrigger className="w-full dark:bg-input/30">
                            <SelectValue placeholder={t('contact.form.selectType')} />
                          </SelectTrigger>
                          <SelectContent>
                            {commonBusinessTypes
                              .filter(type => !formData.businessTypes.includes(type))
                              .map((type) => (
                                <SelectItem key={type} value={type}>
                              {type}
                                </SelectItem>
                          ))}
                            {commonBusinessTypes.filter(type => !formData.businessTypes.includes(type)).length === 0 && (
                              <SelectItem value="" disabled>
                                {t('contact.form.allAdded')}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Custom Business Type Input */}
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder={t('contact.form.addBusinessType')}
                          value={customBusinessTypeInput}
                          onChange={(e) => setCustomBusinessTypeInput(e.target.value)}
                          className="flex-1 p-3"
                        />
                        <Button
                          type="button"
                          onClick={addCustomBusinessType}
                          disabled={!customBusinessTypeInput.trim()}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Success/Error Messages */}
                  {submitMessage && (
                    <div className={`p-4 rounded-lg ${
                      submitMessage.includes('Thank you') 
                        ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50' 
                        : 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-800/50'
                    }`}>
                      {submitMessage}
                    </div>
                  )}

                  {/* Duplicate Warning */}
                  {duplicateWarning && (
                    <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
                      {duplicateWarning}
                    </div>
                  )}

                  <Button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-6 text-lg disabled:opacity-50"
                  >
                    {isSubmitting ? t('contact.form.submitting') : t('contact.form.submit')}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact Information Section */}
      <section className="py-20 bg-[radial-gradient(circle_at_top,_#f7f5f0,_#ffffff)] dark:bg-background dark:[background:var(--background)]">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-foreground mb-6">
                {t('contact.section.expert.title')}
              </h2>
              <p className="text-lg text-gray-600 dark:text-muted-foreground">
                {t('contact.section.expert.desc')}
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="flex items-center gap-4 p-6 bg-white dark:bg-card rounded-xl hover:shadow-md transition-shadow border dark:border-border">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                  <Mail className="h-6 w-6 text-emerald-700 dark:text-emerald-400" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-foreground">{t('contact.info.email')}</div>
                  <a href="mailto:info@tk.sa" className="text-gray-600 dark:text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">info@tk.sa</a>
                </div>
              </div>

              <div className="flex items-center gap-4 p-6 bg-white dark:bg-card rounded-xl hover:shadow-md transition-shadow border dark:border-border">
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                  <Phone className="h-6 w-6 text-amber-700 dark:text-amber-400" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-foreground">{t('contact.info.phone')}</div>
                  <a href="tel:+966501234567" className="text-gray-600 dark:text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">+966 50 123 4567</a>
                </div>
              </div>

              <div className="flex items-center gap-4 p-6 bg-white dark:bg-card rounded-xl hover:shadow-md transition-shadow border dark:border-border">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-emerald-700 dark:text-emerald-400" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-foreground">{t('contact.info.address')}</div>
                  <div className="text-gray-600 dark:text-muted-foreground">{t('contact.info.addressValue')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Google Maps Section */}
      <section className="py-20 bg-white dark:bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 dark:text-foreground mb-4">{t('contact.section.visit.title')}</h2>
              <p className="text-xl text-gray-600 dark:text-muted-foreground">{t('contact.section.visit.subtitle')}</p>
            </div>
            
            <div className="rounded-2xl overflow-hidden shadow-2xl border dark:border-border">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3622.3662849596453!2d46.70378327482407!3d24.782908148357468!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e2efde0a87839b5%3A0x8ec32e1deaf8e89a!2sTABADL%20ALKON!5e0!3m2!1sen!2s!4v1760357424149!5m2!1sen!2s"
                width="100%"
                height="500"
                style={{ border: 0, minHeight: '300px', height: 'clamp(300px, 50vh, 500px)' }}
                allowFullScreen={true}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full"
                title="TABADL ALKON Location"
              ></iframe>
            </div>

            {/* Address Card Below Map */}
            <div className="mt-8 bg-white dark:bg-card rounded-xl shadow-lg p-6 flex items-center justify-between border dark:border-border">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                  <MapPin className="h-7 w-7 text-emerald-700 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-foreground text-lg">{t('contact.section.visit.location')}</h3>
                  <p className="text-gray-600 dark:text-muted-foreground">{t('contact.info.addressValue')}</p>
                </div>
              </div>
              <a 
                href="https://maps.app.goo.gl/DWerdRzz1xArWdv67" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Button variant="outline" className="border-emerald-600 dark:border-emerald-500 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30">
                  {t('contact.section.visit.getDirections')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      <MainFooter />
    </div>
  )
}