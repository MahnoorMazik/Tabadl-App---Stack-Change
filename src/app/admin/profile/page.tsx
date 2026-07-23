'use client'

import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { MAIN_ROLE_NAMES } from '@/lib/rbac'
import { User, Mail, Phone, ShieldCheck, Clock, Lock, Check, ChevronsUpDown, AlertCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { parsePhoneNumber } from '@/lib/phone-normalization'
import { toAvatarUrl } from '@/lib/avatar-utils'
import { cn } from '@/lib/utils'

// Helper function to get flag emoji from country code (same as signup page)
function getCountryFlag(code: string, name?: string): string {
  const codeToISO: Record<string, string> = {
    '+966': 'SA', '+971': 'AE', '+973': 'BH', '+974': 'QA', '+965': 'KW', '+968': 'OM',
    '+967': 'YE', '+962': 'JO', '+961': 'LB', '+963': 'SY', '+964': 'IQ', '+20': 'EG',
    '+212': 'MA', '+213': 'DZ', '+216': 'TN', '+218': 'LY', '+249': 'SD', 
    '+1': 'US',
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
  
  if (code === '+1' && name) {
    if (name.includes('Canada')) return '🇨🇦'
    return '🇺🇸'
  }
  
  const iso = codeToISO[code] || 'SA'
  try {
    return String.fromCodePoint(...iso.split('').map(char => 127397 + char.charCodeAt(0)))
  } catch {
    return ''
  }
}

// Country codes list (same as signup page)
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
].filter(country => country.code !== '+972') // Exclude Israel

// Remove duplicates and sort
const uniqueCountryCodes = Array.from(
  new Map(countryCodes.map(item => [item.code, item])).values()
).sort((a, b) => {
  if (a.code === '+966') return -1
  if (b.code === '+966') return 1
  return a.name.localeCompare(b.name)
})

// Helper function to convert Western numerals to Eastern Arabic numerals
function toArabicNumerals(str: string): string {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return str.replace(/\d/g, (digit) => arabicNumerals[parseInt(digit)]);
}

// Helper function to replace placeholders in strings
function replaceParams(str: string, params: Record<string, string | number>): string {
  return str.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`))
}

export default function AdminProfilePage() {
  const { user, token, update: refreshSession } = useAuth()
  const { t, formatNumber, locale } = useLocale()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Parse existing phone number on load
  const parsedPhone = user?.phone ? parsePhoneNumber(user.phone) : { countryCode: '+966', localNumber: '', warning: null }

  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [phoneCountryCode, setPhoneCountryCode] = useState(parsedPhone?.countryCode || '+966')
  const [phoneLocalNumber, setPhoneLocalNumber] = useState(parsedPhone?.localNumber || '')
  const [phoneWarning, setPhoneWarning] = useState<string | null>(parsedPhone?.warning || null)
  const [avatar, setAvatar] = useState<string | null>(toAvatarUrl(user?.avatar ?? null))

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [showPasswordSection, setShowPasswordSection] = useState(false)

  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [countryCodeOpen, setCountryCodeOpen] = useState(false)
  const [customRole, setCustomRole] = useState<{ id: string; name: string } | null>(null)

  // Fetch profile from API so avatar is current (session can be stale in production)
  useEffect(() => {
    if (!user) return
    let cancelled = false
    fetch('/api/auth/profile')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return
        if (data?.customRole) setCustomRole(data.customRole)
        if (data?.avatar != null) setAvatar(toAvatarUrl(data.avatar))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [user?.id])

  useEffect(() => {
    if (!user) return
    setName(user.name ?? '')
    setEmail(user.email ?? '')
    // Only update avatar from session when we have a value (avoid overwriting API-fetched avatar with stale null)
    const url = toAvatarUrl(user.avatar ?? null)
    if (url) setAvatar(url)

    const parsed = user.phone ? parsePhoneNumber(user.phone) : null
    if (parsed) {
      setPhoneCountryCode(parsed.countryCode)
      setPhoneLocalNumber(parsed.localNumber)
      setPhoneWarning(parsed.warning)
    }
  }, [user?.id, user?.name, user?.email, user?.phone, user?.avatar])

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const handleSave = async () => {
    if (!user) return

    if (!name.trim() || !email.trim()) {
      toast({
        variant: 'destructive',
        title: 'Missing information',
        description: 'Name and email are required.',
      })
      return
    }

    // Simple email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      toast({
        variant: 'destructive',
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
      })
      return
    }

    // Phone validation: if provided, must have 10 digits
    let finalPhone: string | null = null
    if (phoneLocalNumber.trim()) {
      if (phoneLocalNumber.length !== 10) {
        toast({
          variant: 'destructive',
          title: t('profile.invalidPhone') || 'Invalid phone number',
          description: locale === 'ar' 
            ? `رقم الهاتف يجب أن يكون بالضبط ${formatNumber(10)} أرقام.`
            : `Phone number must be exactly ${formatNumber(10)} digits.`,
        })
        return
      }
      finalPhone = `${phoneCountryCode}${phoneLocalNumber}`
    }

    setSaving(true)
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: finalPhone,
        }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        const message = body?.error || 'Failed to update profile.'
        throw new Error(message)
      }

      // Clear phone warning after successful save
      setPhoneWarning(null)

      toast({
        title: 'Profile updated',
        description: 'Your profile information has been saved successfully.',
      })
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error saving profile',
        description: error.message || 'An unexpected error occurred.',
      })
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    if (!user || !token) return

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Missing fields',
        description: 'Please fill in all password fields.',
      })
      return
    }

    if (newPassword.length < 6) {
      toast({
        variant: 'destructive',
        title: t('profile.invalidPassword') || 'Invalid password',
        description: locale === 'ar'
          ? `كلمة المرور الجديدة يجب أن تكون على الأقل ${formatNumber(6)} أحرف.`
          : `New password must be at least ${formatNumber(6)} characters.`,
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Password mismatch',
        description: 'New password and confirmation do not match.',
      })
      return
    }

    setChangingPassword(true)
    try {
      const response = await fetch('/api/profile/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        
        // Extract error message from structured error response
        let errorMessage = 'Failed to change password.'
        
        if (body?.error) {
          // Check if it's a structured error response
          if (typeof body.error === 'object' && body.error.message) {
            errorMessage = body.error.message
            
            // For validation errors, check details for specific field errors
            if (body.error.details && Array.isArray(body.error.details) && body.error.details.length > 0) {
              // Find the most relevant error detail
              const detail = body.error.details[0]
              if (detail.message) {
                errorMessage = detail.message
              }
            }
          } else if (typeof body.error === 'string') {
            errorMessage = body.error
          }
        } else if (body?.message) {
          errorMessage = body.message
        }
        
        throw new Error(errorMessage)
      }

      const data = await response.json()
      
      // Update token if new one is provided
      if (data.data?.token) {
        localStorage.setItem('auth-token', data.data.token)
      }

      // Clear password fields
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordSection(false)

      toast({
        title: 'Password changed',
        description: data.data?.message || 'Your password has been changed successfully. All other sessions have been logged out.',
      })
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error changing password',
        description: error.message || 'An unexpected error occurred.',
      })
    } finally {
      setChangingPassword(false)
    }
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits and limit to 10 characters
    const value = e.target.value.replace(/\D/g, '').slice(0, 10)
    setPhoneLocalNumber(value)
  }

  const handleFileClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Invalid file',
        description: 'Please select an image file.',
      })
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload/profile-picture', {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        const message = body?.error || 'Failed to upload profile picture.'
        throw new Error(message)
      }

      const data = await response.json()
      if (data?.filePath) {
        setAvatar(toAvatarUrl(data.filePath))
        refreshSession().catch(() => {})
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('profileAvatarUpdated'))
      }

      toast({
        title: 'Profile picture updated',
        description: 'Your profile picture has been uploaded successfully.',
      })
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error.message || 'Could not upload profile picture.',
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const selectedCountry = uniqueCountryCodes.find(c => c.code === phoneCountryCode)

  return (
    <AdminPageTemplate 
      title={t('profile.myProfile')} 
      description={t('profile.manageAccount')}
      icon={<User className="h-6 w-6" />}
      showConstruction={false}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('profile.profileInformation')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  {avatar ? (
                    <AvatarImage
                      src={avatar}
                      alt={user?.name ?? 'Profile'}
                      className="object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none' }}
                    />
                  ) : null}
                  <AvatarFallback className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-2xl">
                    {user && user.name ? getInitials(user.name) : 'NA'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleFileClick}
                    disabled={uploading}
                  >
                    {uploading ? t('profile.uploading') : t('profile.changePhoto')}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {t('profile.photoHint')}
                  </span>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">
                  <User className="h-4 w-4 inline mr-2" />
                  {t('profile.fullName')}
                </Label>
                <Input 
                  id="name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2" 
                />
              </div>
              <div>
                <Label htmlFor="email">
                  <Mail className="h-4 w-4 inline mr-2" />
                  {t('profile.email')}
                </Label>
                <Input 
                  id="email" 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2" 
                />
              </div>
              <div>
                <Label htmlFor="phone">
                  <Phone className="h-4 w-4 inline mr-2" />
                  {t('profile.phone')} <span className="text-muted-foreground text-xs">({t('profile.optional')})</span>
                </Label>
                <div className="flex gap-2 mt-2">
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
                        <CommandInput placeholder={t('profile.searchCountry')} />
                        <CommandList className="max-h-[300px] overflow-y-auto">
                          <CommandEmpty>{t('profile.noCountryFound')}</CommandEmpty>
                          <CommandGroup>
                            {uniqueCountryCodes.map((country) => (
                              <CommandItem
                                key={`${country.code}-${country.name}`}
                                value={`${country.code} ${country.name}`}
                                onSelect={() => {
                                  setPhoneCountryCode(country.code)
                                  setCountryCodeOpen(false)
                                }}
                                className="cursor-pointer"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4 shrink-0",
                                    phoneCountryCode === country.code ? "opacity-100" : "opacity-0"
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
                    placeholder={locale === 'ar' ? toArabicNumerals('501234567') : '501234567'}
                    value={phoneLocalNumber}
                    onChange={handlePhoneChange}
                    maxLength={10}
                    className="flex-1 p-3"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {locale === 'ar' 
                    ? `أدخل ${formatNumber(10)} أرقام (مثال: ${toArabicNumerals('501234567')})`
                    : `Enter ${formatNumber(10)} digits (e.g., 501234567)`}
                </p>
                {phoneWarning && (
                  <Alert variant="default" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">{phoneWarning}</AlertDescription>
                  </Alert>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-4">
                <Button 
                  className="bg-amber-600 hover:bg-amber-700"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? t('profile.saving') : t('profile.saveChanges')}
                </Button>
              </div>

              {user && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="h-4 w-4 mt-0.5 text-emerald-600" />
                    <div>
                      <div className="font-medium text-foreground">{t('profile.roleAndAccess')}</div>
                      <div className="mt-1">
                        {user.role === 'CLIENT' ? (
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs">{t('admin.clients.client')}</Badge>
                        ) : (
                          (() => {
                            const roleName = customRole?.name ?? null
                            const roleLabels: Record<string, string> = {
                              [MAIN_ROLE_NAMES.ADMIN]: t('admin.team.roleAdmin'),
                              [MAIN_ROLE_NAMES.CLIENTS]: t('admin.team.roleClients'),
                              [MAIN_ROLE_NAMES.REPORTS]: t('admin.team.roleReports'),
                              [MAIN_ROLE_NAMES.SUPPORT]: t('admin.team.roleSupport'),
                            }
                            const colors: Record<string, string> = {
                              [MAIN_ROLE_NAMES.ADMIN]: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
                              [MAIN_ROLE_NAMES.CLIENTS]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
                              [MAIN_ROLE_NAMES.REPORTS]: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
                              [MAIN_ROLE_NAMES.SUPPORT]: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
                            }
                            const cls = roleName ? (colors[roleName] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300') : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                            const label = roleName ? (roleLabels[roleName] ?? roleName) : t('profile.roleStaff')
                            return <Badge className={`${cls} text-xs`}>{label}</Badge>
                          })()
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 mt-0.5" />
                    <div>
                      <div className="font-medium text-foreground">{t('profile.accountActivity')}</div>
                      <div>
                        {t('profile.joined')}:{' '}
                        {(user as any).createdAt
                          ? (locale === 'ar' 
                              ? toArabicNumerals(new Date((user as any).createdAt).toLocaleDateString('ar-SA'))
                              : new Date((user as any).createdAt).toLocaleDateString())
                          : 'N/A'}
                      </div>
                      <div>
                        {t('profile.lastLogin')}:{' '}
                        {(user as any).lastLoginAt
                          ? (locale === 'ar'
                              ? toArabicNumerals(new Date((user as any).lastLoginAt).toLocaleString('ar-SA'))
                              : new Date((user as any).lastLoginAt).toLocaleString())
                          : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Password Change Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              {t('profile.changePassword')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showPasswordSection ? (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {t('profile.changePasswordDesc')}
                </p>
                <Button
                  variant="outline"
                  onClick={() => setShowPasswordSection(true)}
                >
                  {t('profile.changePassword')}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="currentPassword">
                    {t('profile.currentPassword')}
                  </Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="mt-2"
                    placeholder={t('profile.placeholder.currentPassword')}
                  />
                </div>
                <div>
                  <Label htmlFor="newPassword">
                    {t('profile.newPassword')}
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-2"
                    placeholder={t('profile.placeholder.newPassword')}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {locale === 'ar'
                      ? `الحد الأدنى ${formatNumber(6)} أحرف`
                      : `Minimum ${formatNumber(6)} characters`}
                  </p>
                </div>
                <div>
                  <Label htmlFor="confirmPassword">
                    {t('profile.confirmPassword')}
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-2"
                    placeholder={t('profile.placeholder.confirmPassword')}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    className="bg-amber-600 hover:bg-amber-700"
                    onClick={handlePasswordChange}
                    disabled={changingPassword}
                  >
                    {changingPassword ? t('profile.changing') : t('profile.changePassword')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPasswordSection(false)
                      setCurrentPassword('')
                      setNewPassword('')
                      setConfirmPassword('')
                    }}
                    disabled={changingPassword}
                  >
                    {t('profile.cancel')}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminPageTemplate>
  )
}
