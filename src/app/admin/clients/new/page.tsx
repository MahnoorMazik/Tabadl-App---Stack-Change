'use client'

import { useState } from 'react'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EmailInput } from '@/components/ui/email-input'
import { validateEmail } from '@/lib/email-validation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UserPlus, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import Link from 'next/link'
import { toast } from '@/hooks/use-toast'
import { useLocale } from '@/contexts/LocaleContext'

// Helper function to get flag emoji from country code
function getCountryFlag(code: string, name?: string): string {
  const codeToISO: Record<string, string> = {
    '+966': 'SA', '+971': 'AE', '+973': 'BH', '+974': 'QA', '+965': 'KW', '+968': 'OM',
    '+967': 'YE', '+962': 'JO', '+961': 'LB', '+963': 'SY', '+964': 'IQ', '+20': 'EG',
    '+212': 'MA', '+213': 'DZ', '+216': 'TN', '+218': 'LY', '+249': 'SD',
    '+1': 'US', '+44': 'GB', '+33': 'FR', '+49': 'DE', '+39': 'IT', '+34': 'ES',
    '+91': 'IN', '+86': 'CN', '+81': 'JP', '+92': 'PK',
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

export default function NewClientPage() {
  const { token } = useAuth()
  const router = useRouter()
  const { t } = useLocale()
  const [loading, setLoading] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [countryCodeOpen, setCountryCodeOpen] = useState(false)
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false)
  const [formData, setFormData] = useState({
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
  })

  const howDidYouHearOptions = [
    'Google Search',
    'Social Media (Facebook, Instagram, LinkedIn)',
    'Referral from Friend/Colleague',
    'Advertisement',
    'Website',
    'Email Marketing',
    'Trade Show/Event',
    'Other'
  ]

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
    { code: '+91', name: 'India', flag: getCountryFlag('+91') },
    { code: '+86', name: 'China', flag: getCountryFlag('+86') },
    { code: '+81', name: 'Japan', flag: getCountryFlag('+81') },
    { code: '+92', name: 'Pakistan', flag: getCountryFlag('+92') },
    { code: '+31', name: 'Netherlands', flag: getCountryFlag('+31') },
    { code: '+32', name: 'Belgium', flag: getCountryFlag('+32') },
    { code: '+41', name: 'Switzerland', flag: getCountryFlag('+41') },
    { code: '+43', name: 'Austria', flag: getCountryFlag('+43') },
    { code: '+45', name: 'Denmark', flag: getCountryFlag('+45') },
    { code: '+46', name: 'Sweden', flag: getCountryFlag('+46') },
    { code: '+47', name: 'Norway', flag: getCountryFlag('+47') },
    { code: '+61', name: 'Australia', flag: getCountryFlag('+61') },
    { code: '+27', name: 'South Africa', flag: getCountryFlag('+27') },
    { code: '+52', name: 'Mexico', flag: getCountryFlag('+52') },
    { code: '+55', name: 'Brazil', flag: getCountryFlag('+55') },
    { code: '+90', name: 'Turkey', flag: getCountryFlag('+90') },
    { code: '+65', name: 'Singapore', flag: getCountryFlag('+65') },
    { code: '+60', name: 'Malaysia', flag: getCountryFlag('+60') },
    { code: '+62', name: 'Indonesia', flag: getCountryFlag('+62') },
    { code: '+66', name: 'Thailand', flag: getCountryFlag('+66') },
    { code: '+84', name: 'Vietnam', flag: getCountryFlag('+84') },
    { code: '+63', name: 'Philippines', flag: getCountryFlag('+63') },
    { code: '+64', name: 'New Zealand', flag: getCountryFlag('+64') },
    { code: '+54', name: 'Argentina', flag: getCountryFlag('+54') },
    { code: '+56', name: 'Chile', flag: getCountryFlag('+56') },
    { code: '+57', name: 'Colombia', flag: getCountryFlag('+57') },
    { code: '+51', name: 'Peru', flag: getCountryFlag('+51') },
  ].filter(country => country.code !== '+972')

  const uniqueCountryCodes = Array.from(
    new Map(countryCodes.map(item => [item.code, item])).values()
  ).sort((a, b) => {
    if (a.code === '+966') return -1
    if (b.code === '+966') return 1
    return a.name.localeCompare(b.name)
  })

  const countriesList = Array.from(
    new Map(uniqueCountryCodes.map(item => [item.name, item])).values()
  ).sort((a, b) => {
    if (a.name === 'Saudi Arabia') return -1
    if (b.name === 'Saudi Arabia') return 1
    return a.name.localeCompare(b.name)
  })

  const selectedCountry = uniqueCountryCodes.find(c => c.code === formData.phoneCountryCode)
  const selectedCountryFromList = countriesList.find(c => c.name === formData.country)

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10)
    setFormData({ ...formData, phone: value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate email before submitting
    const emailValidation = validateEmail(formData.email)
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error!)
      return
    }
    
    setLoading(true)
    
    try {
      // Combine phone country code and phone number
      const fullPhoneNumber = formData.phoneCountryCode && formData.phone 
        ? `${formData.phoneCountryCode}${formData.phone}` 
        : formData.phone || ''
      
      // First create a lead
      const leadResponse = await axios.post('/api/leads', {
        fullName: formData.fullName,
        email: formData.email,
        phone: fullPhoneNumber,
        companyName: formData.companyName,
        companyType: formData.companyType,
        natureOfBusiness: formData.natureOfBusiness,
        designation: formData.designation,
        country: formData.country,
        city: formData.city,
        howDidYouHear: formData.howDidYouHear,
        status: 'QUALIFIED'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      // Then convert to client
      await axios.post(`/api/leads/${leadResponse.data.lead.id}/convert`, {
        companyName: formData.companyName
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      toast({
        title: t('common.success'),
        description: t('admin.clients.clientCreated') || 'Client created successfully'
      })
      
      router.push('/admin/clients')
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.response?.data?.error || t('admin.clients.createFailed') || 'Failed to create client',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminPageTemplate
      title={t('admin.clients.addNewClient') || 'Add New Client'}
      description={t('admin.clients.createNewClientAccount') || 'Create a new client account'}
      icon={<UserPlus className="h-6 w-6" />}
      showConstruction={false}
    >
      <div className="w-full max-w-4xl mx-auto">
        <Link href="/admin/clients">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('admin.clients.backToClients') || 'Back to Clients'}
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>{t('admin.clients.clientInformation') || 'Client Information'}</CardTitle>
            <CardDescription>
              {t('admin.clients.enterClientDetails') || 'Enter the details of the new client. An account will be created automatically.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">{t('common.fullName')} *</Label>
                  <Input
                    id="fullName"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Ahmed Al-Rashid"
                  />
                </div>

                <EmailInput
                  id="email"
                  label={t('auth.email') + ' *'}
                  value={formData.email}
                  error={emailError}
                  onChange={(value) => setFormData({ ...formData, email: value })}
                  placeholder="ahmed@company.sa"
                  required
                />

                <div className="space-y-2">
                  <Label htmlFor="phone">{t('profile.phone')}</Label>
                  <div className="flex gap-2">
                    <Popover open={countryCodeOpen} onOpenChange={setCountryCodeOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={countryCodeOpen}
                          className="w-32 justify-between"
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
                                  key={country.code}
                                  value={`${country.code} ${country.name}`}
                                  onSelect={() => {
                                    setFormData({ ...formData, phoneCountryCode: country.code })
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
                      maxLength={10}
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{t('profile.phoneHint')}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyName">{t('admin.clients.companyName')} *</Label>
                  <Input
                    id="companyName"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="ABC Trading Company LLC"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyType">{t('admin.clients.companyType')}</Label>
                  <Input
                    id="companyType"
                    value={formData.companyType}
                    onChange={(e) => setFormData({ ...formData, companyType: e.target.value })}
                    placeholder="e.g., LLC, Joint Stock Company"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="designation">{t('admin.clients.designation')}</Label>
                  <Input
                    id="designation"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    placeholder={t('admin.clients.designationPlaceholder') || 'Your Job Title/Position'}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="natureOfBusiness">{t('admin.clients.natureOfBusiness')}</Label>
                  <Input
                    id="natureOfBusiness"
                    value={formData.natureOfBusiness}
                    onChange={(e) => setFormData({ ...formData, natureOfBusiness: e.target.value })}
                    placeholder={t('admin.clients.natureOfBusinessPlaceholder') || 'Describe your business activities'}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">{t('admin.clients.country')} *</Label>
                  <Popover open={countryDropdownOpen} onOpenChange={setCountryDropdownOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={countryDropdownOpen}
                        className="w-full justify-between"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm whitespace-nowrap overflow-hidden text-ellipsis">
                            {selectedCountryFromList?.name || t('admin.clients.selectCountry')}
                          </span>
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <Command shouldFilter={true}>
                        <CommandInput placeholder={t('profile.searchCountry')} />
                        <CommandList className="max-h-[300px] overflow-y-auto">
                          <CommandEmpty>{t('profile.noCountryFound')}</CommandEmpty>
                          <CommandGroup>
                            {countriesList.map((country) => (
                              <CommandItem
                                key={country.name}
                                value={country.name}
                                onSelect={() => {
                                  setFormData({ ...formData, country: country.name })
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

                <div className="space-y-2">
                  <Label htmlFor="city">{t('admin.clients.city')} *</Label>
                  <Input
                    id="city"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder={t('admin.clients.cityPlaceholder') || 'Your City'}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="howDidYouHear">{t('admin.clients.howDidYouHear')}</Label>
                  <Select value={formData.howDidYouHear} onValueChange={(value) => setFormData({ ...formData, howDidYouHear: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('admin.clients.selectOption') || 'Select an option'} />
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

                <p className="text-sm text-muted-foreground col-span-2">
                  A client account will be created and login credentials will be sent to the client&apos;s email automatically.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Link href="/admin/clients">
                  <Button type="button" variant="outline">
                    {t('common.cancel')}
                  </Button>
                </Link>
                <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
                  {loading ? t('admin.clients.creating') || 'Creating...' : t('admin.clients.createClient') || 'Create Client'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminPageTemplate>
  )
}
