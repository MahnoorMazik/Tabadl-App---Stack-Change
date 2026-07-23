'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EmailInput } from '@/components/ui/email-input'
import { validateEmail } from '@/lib/email-validation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toAvatarUrl } from '@/lib/avatar-utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Users, Search, Plus, Eye, Mail, Building, Calendar, Phone, Edit, Trash2, AlertCircle, CheckCircle, MoreVertical, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/utils'
import { useLocale } from '@/contexts/LocaleContext'

interface Client {
  id: string
  clientNumber: string
  company: string
  createdAt: string
  // Address fields
  street?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
  // Profile picture
  profilePicture?: string
  user: {
    id: string
    name: string
    email: string
    phone?: string
    avatar?: string
    isActive: boolean
  }
  group?: {
    id: string
    name: string
    color: string
  }
  applications: any[]
  invoices: any[]
  _count: {
    applications: number
    invoices: number
  }
}

interface ClientGroup {
  id: string
  name: string
  color: string
  _count: {
    clients: number
  }
}

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

export default function ClientsPage() {
  const { token } = useAuth()
  const { toast } = useToast()
  const { t, formatNumber, locale } = useLocale()
  const [groups, setGroups] = useState<ClientGroup[]>([])
  const [rowsPerPage, setRowsPerPage] = useState<number | 'all'>(25)
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  })
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Fetch clients with pagination
  const fetchClients = useCallback(async () => {
    // Note: NextAuth uses cookies for authentication, so token may be null
    const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null)
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {}
    
    setLoading(true)
    setSearchError(null)
    
    try {
      const params = new URLSearchParams()
      
      if (debouncedSearch) {
        params.append('search', debouncedSearch)
      }
      
      // Add pagination
      params.append('page', currentPage.toString())
      if (rowsPerPage === 'all') {
        params.append('limit', 'all')
      } else {
        params.append('limit', rowsPerPage.toString())
      }
      
      const response = await axios.get(`/api/clients?${params.toString()}`, {
        headers
      })
      
      // Handle structured response format
      const responseData = response.data?.data || response.data
      if (responseData?.clients) {
        setClients(responseData.clients)
      }
      if (responseData?.pagination) {
        setPagination(responseData.pagination)
      }
    } catch (error: any) {
      console.error('Error fetching clients:', error)
      setSearchError(error.response?.data?.error || t('admin.clients.noClients'))
      setClients([])
    } finally {
      setLoading(false)
    }
  }, [token, debouncedSearch, currentPage, rowsPerPage])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch clients when dependencies change
  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, rowsPerPage])

  // Debug logging
  useEffect(() => {
    console.log('Clients page debug:', {
      token: !!token,
      tokenValue: token,
      clientsCount: clients?.length || 0,
      loading,
      searchError,
      search
    })
  }, [token, clients, loading, searchError, search])

  // Additional debug for useSearch hook
  useEffect(() => {
    console.log('Clients page useSearch hook debug:', {
      endpoint: '/api/clients',
      token: token || '',
      minLength: 3,
      debounceMs: 500,
      searchFields: ['company', 'user.name', 'user.email'],
      initialLoad: true
    })
  }, [])

  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [deletingClient, setDeletingClient] = useState<Client | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [groupUpdating, setGroupUpdating] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [countryCodeOpen, setCountryCodeOpen] = useState(false)
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneCountryCode: '+966', // Default to Saudi Arabia
    phone: '',
    company: '',
    companyType: '',
    natureOfBusiness: '',
    designation: '',
    country: '',
    city: '',
    howDidYouHear: '',
    groupId: '',
    // Address fields
    street: '',
    state: '',
    postalCode: '',
    // Profile picture
    profilePicture: '',
  })

  // Remove old fetchClients function - now handled by useSearch hook

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

  // Country codes list (same as contact form)
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
  ].filter(country => country.code !== '+972') // Exclude Israel

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

  const fetchGroups = useCallback(async () => {
    // Note: NextAuth uses cookies for authentication, so token may be null
    const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null)
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {}
    
    try {
      const response = await axios.get('/api/client-groups', {
        headers
      })
      setGroups(response.data.groups || [])
    } catch (error) {
      console.error('Error fetching groups:', error)
    }
  }, [token])

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  // Default new client to Normal group when opening create dialog
  useEffect(() => {
    if (showCreateDialog && groups.length > 0) {
      const normalGroup = groups.find((g) => g.name === 'Normal')
      if (normalGroup && !formData.groupId) {
        setFormData((prev) => ({ ...prev, groupId: normalGroup.id }))
      }
    }
  }, [showCreateDialog, groups])

  const handleCreate = async () => {
    // Validate email before submitting
    const emailValidation = validateEmail(formData.email)
    if (!emailValidation.isValid) {
      toast({
        title: t('common.error'),
        description: emailValidation.error,
        variant: 'destructive'
      })
      return
    }

    try {
      // Combine phone country code and phone number
      const fullPhoneNumber = formData.phoneCountryCode && formData.phone 
        ? `${formData.phoneCountryCode}${formData.phone}` 
        : formData.phone || ''
      
      await axios.post('/api/clients', {
        ...formData,
        phone: fullPhoneNumber,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      toast({
        title: t('common.success'),
        description: t('admin.clients.created') || 'Client created successfully. Login credentials sent via email.',
      })
      
      setShowCreateDialog(false)
      setFormData({
        name: '',
        email: '',
        phoneCountryCode: '+966',
        phone: '',
        company: '',
        companyType: '',
        natureOfBusiness: '',
        designation: '',
        country: '',
        city: '',
        howDidYouHear: '',
        groupId: '',
        street: '',
        state: '',
        postalCode: '',
        profilePicture: '',
      })
      await fetchClients()
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: getErrorMessage(error, t('admin.clients.createFailed') || 'Failed to create client'),
        variant: 'destructive',
      })
    }
  }

  const handleUpdate = async () => {
    if (!editingClient) return
    setUpdating(true)

    try {
      await axios.put(`/api/clients/${editingClient.id}`, {
        name: formData.name,
        phone: formData.phone,
        company: formData.company,
        groupId: formData.groupId || null,
        street: formData.street,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        postalCode: formData.postalCode,
        profilePicture: formData.profilePicture,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      toast({
        title: t('common.success'),
        description: t('admin.clients.updated') || 'Client updated successfully',
      })
      
      setShowEditDialog(false)
      setEditingClient(null)
      await fetchClients()
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: getErrorMessage(error, t('admin.clients.updateFailed') || 'Failed to update client'),
        variant: 'destructive',
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingClient) return

    setDeleting(true)
    try {
      await axios.delete(`/api/clients/${deletingClient.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      toast({
        title: t('common.success'),
        description: t('admin.clients.deleted') || 'Client deleted successfully',
      })
      
      setShowDeleteDialog(false)
      setDeletingClient(null)
      await fetchClients()
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: getErrorMessage(error, t('admin.clients.deleteFailed') || 'Failed to delete client'),
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  const openDeleteDialog = (client: Client) => {
    setDeletingClient(client)
    setShowDeleteDialog(true)
  }

  const normalGroupId = groups.find((g) => g.name === 'Normal')?.id ?? null
  const displayGroup = (client: Client) =>
    client.group ?? { id: normalGroupId, name: 'Normal', color: '#6b7280' }

  const handleQuickGroupUpdate = async (clientId: string, newGroupId: string | null) => {
    setGroupUpdating(clientId)
    const client = clients.find((c) => c.id === clientId)
    const newGroup = newGroupId ? groups.find((g) => g.id === newGroupId) : null
    setClients((prev) =>
      prev.map((c) =>
        c.id === clientId
          ? { ...c, group: newGroup ? { id: newGroup.id, name: newGroup.name, color: newGroup.color } : undefined }
          : c
      )
    )
    try {
      await axios.put(
        `/api/clients/${clientId}`,
        { groupId: newGroupId && newGroupId.trim() !== '' ? newGroupId : null },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      )
      toast({
        title: t('common.success'),
        description: t('admin.clients.updated') || 'Client updated',
      })
    } catch (error: any) {
      if (client) {
        setClients((prev) =>
          prev.map((c) => (c.id === clientId ? { ...c, group: client.group } : c))
        )
      }
      toast({
        title: t('common.error'),
        description: error.response?.data?.error || t('admin.clients.updateFailed'),
        variant: 'destructive',
      })
    } finally {
      setGroupUpdating(null)
    }
  }

  const handleFileUpload = async (file: File) => {
    // Note: NextAuth uses cookies for authentication, so token may be null
    const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null)
    const headers: Record<string, string> = { 'Content-Type': 'multipart/form-data' }
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`
    }

    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('file', file)

      const response = await axios.post('/api/upload/profile-picture', formData, {
        headers
      })

      if (response.data.success) {
        setFormData(prev => ({ ...prev, profilePicture: response.data.filePath }))
        toast({
          title: t('common.success'),
          description: t('admin.clients.profileUploaded') || 'Profile picture uploaded successfully',
        })
      }
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: getErrorMessage(error, t('admin.clients.uploadFailed') || 'Failed to upload profile picture'),
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  const openEditDialog = (client: Client) => {
    setEditingClient(client)
    // Extract phone country code from phone if it starts with +
    const phone = client.user?.phone || ''
    const phoneCountryCode = phone.match(/^\+\d{1,4}/)?.[0] || '+966'
    const phoneNumber = phone.replace(/^\+\d{1,4}\s*/, '')
    const normalId = groups.find((g) => g.name === 'Normal')?.id ?? ''
    setFormData({
      name: client.user?.name || '',
      email: client.user?.email || '',
      phoneCountryCode,
      phone: phoneNumber,
      company: client.company,
      companyType: (client as any).companyType || '',
      natureOfBusiness: (client as any).natureOfBusiness || '',
      designation: (client as any).designation || '',
      country: client.country || '',
      city: client.city || '',
      howDidYouHear: (client as any).howDidYouHear || '',
      groupId: client.group?.id || normalId,
      street: client.street || '',
      state: client.state || '',
      postalCode: client.postalCode || '',
      profilePicture: client.profilePicture || '',
    })
    setShowEditDialog(true)
  }

  // No need for client-side filtering - search is handled by the hook
  // Clients are already filtered and paginated by the server
  const displayedClients = clients || []

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getGroupBadge = (client: Client) => {
    const group = displayGroup(client)
    const baseColor = group.color || '#6b7280'
    return (
      <Badge
        className="text-xs font-medium flex items-center gap-1 w-fit"
        style={{
          backgroundColor: `${baseColor}20`,
          color: baseColor,
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: baseColor }} />
        {group.name}
      </Badge>
    )
  }

  return (
    <AdminPageTemplate
      title={t('admin.clients.title')}
      description={t('admin.clients.description')}
      icon={<Users className="h-6 w-6" />}
      showConstruction={false}
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex justify-end items-center mb-6">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-2" />
                {t('admin.clients.newClient')}
              </Button>
            </DialogTrigger>
            <DialogContent className="w-1/2 sm:max-w-[50%] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('admin.clients.newClient')}</DialogTitle>
                <DialogDescription>
                  {t('admin.clients.createDescription') || 'Create a new client account with company details'}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-4">{t('admin.clients.basicInfo') || 'Basic Information'}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">{t('auth.fullName')} *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder={locale === 'ar' ? 'أحمد محمد' : 'John Doe'}
                      />
                    </div>

                    <EmailInput
                      id="email"
                      label={`${t('auth.email')} *`}
                      value={formData.email}
                      onChange={(value) => setFormData({ ...formData, email: value })}
                      placeholder="john@company.com"
                      required
                    />

                    <div>
                      <Label htmlFor="phone">{t('auth.phoneNumber')}</Label>
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
                              <CommandInput placeholder={t('auth.searchCountryCode')} />
                              <CommandList className="max-h-[300px] overflow-y-auto">
                                <CommandEmpty>{t('auth.noCountryFound')}</CommandEmpty>
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
                          placeholder={locale === 'ar' ? '٥٠١٢٣٤٥٦٧' : '501234567'}
                          value={formData.phone}
                          onChange={handlePhoneChange}
                          maxLength={10}
                          className="flex-1"
                        />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('auth.phonePlaceholder')}</p>
                    </div>

                    <div>
                      <Label htmlFor="company">{t('auth.companyName')} *</Label>
                      <Input
                        id="company"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        placeholder={locale === 'ar' ? 'شركة ABC المحدودة' : 'ABC Company Ltd'}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="companyType">{t('admin.clients.companyType') || 'Company Type'}</Label>
                      <Input
                        id="companyType"
                        value={formData.companyType}
                        onChange={(e) => setFormData({ ...formData, companyType: e.target.value })}
                        placeholder={t('admin.clients.placeholder.companyType') || 'e.g., LLC, Joint Stock Company'}
                      />
                    </div>

                    <div>
                      <Label htmlFor="designation">{t('admin.clients.designation') || 'Designation'}</Label>
                      <Input
                        id="designation"
                        value={formData.designation}
                        onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                        placeholder={t('admin.clients.placeholder.designation') || 'Your Job Title/Position'}
                      />
                    </div>

                    <div>
                      <Label htmlFor="natureOfBusiness">{t('admin.clients.natureOfBusiness') || 'Nature of Business'}</Label>
                      <Input
                        id="natureOfBusiness"
                        value={formData.natureOfBusiness}
                        onChange={(e) => setFormData({ ...formData, natureOfBusiness: e.target.value })}
                        placeholder={t('admin.clients.placeholder.natureOfBusiness') || 'Describe your business activities'}
                      />
                    </div>

                    <div>
                      <Label htmlFor="howDidYouHear">{t('admin.clients.howDidYouHear') || 'How did you hear about us?'}</Label>
                      <Select value={formData.howDidYouHear} onValueChange={(value) => setFormData({ ...formData, howDidYouHear: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('admin.clients.selectOption') || 'Select an option'} />
                        </SelectTrigger>
                        <SelectContent>
                          {howDidYouHearOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {t(`admin.clients.howDidYouHearOptions.${option.replace(/\s+/g, '').replace(/[()]/g, '')}`) || option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="group">{t('admin.clients.groups.title')}</Label>
                      <Select value={formData.groupId || "none"} onValueChange={(value) => setFormData({ ...formData, groupId: value === "none" ? "" : value })}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('admin.clients.selectGroup') || 'Select group (optional)'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{t('admin.clients.noGroup') || 'No Group'}</SelectItem>
                          {groups.map((group) => (
                            <SelectItem key={group.id} value={group.id}>
                              {group.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Profile Picture and Address */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Profile Picture Upload */}
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-3">{t('admin.clients.profilePicture') || 'Profile Picture'}</h4>
                    <div className="flex items-center gap-4">
                      {formData.profilePicture ? (
                        <div className="flex items-center gap-3">
                          <Avatar className="h-16 w-16">
                            <AvatarImage src={toAvatarUrl(formData.profilePicture) ?? undefined} />
                            <AvatarFallback>PP</AvatarFallback>
                          </Avatar>
                          <div className="space-y-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setFormData({ ...formData, profilePicture: '' })}
                            >
                              {t('common.remove')}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <Avatar className="h-16 w-16">
                            <AvatarFallback>PP</AvatarFallback>
                          </Avatar>
                          <div>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleFileUpload(file)
                              }}
                              className="hidden"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={uploading}
                            >
                              {uploading ? t('admin.clients.uploading') || 'Uploading...' : t('admin.clients.uploadPhoto') || 'Upload Photo'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Address Section */}
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-3">{t('admin.clients.addressInformation') || 'Address Information'}</h4>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="street">{t('admin.clients.street') || 'Street'}</Label>
                        <Input
                          id="street"
                          value={formData.street}
                          onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                          placeholder={locale === 'ar' ? '١٢٣ الشارع الرئيسي' : (t('admin.clients.placeholder.street') || '123 Main St')}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="city">{t('admin.clients.city') || 'City'} *</Label>
                          <Input
                            id="city"
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            placeholder={t('admin.clients.placeholder.city') || 'Riyadh'}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="state">{t('admin.clients.state') || 'State/Province'}</Label>
                          <Input
                            id="state"
                            value={formData.state}
                            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                            placeholder={t('admin.clients.placeholder.state') || 'Riyadh Province'}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="country">{t('admin.clients.country') || 'Country'} *</Label>
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
                                    {selectedCountryFromList?.name || t('admin.clients.selectCountry') || 'Select country...'}
                                  </span>
                                </div>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                              <Command shouldFilter={true}>
                                <CommandInput placeholder={t('admin.clients.searchCountry') || 'Search country...'} />
                                <CommandList className="max-h-[300px] overflow-y-auto">
                                  <CommandEmpty>{t('auth.noCountryFound')}</CommandEmpty>
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
                        <div>
                          <Label htmlFor="postalCode">{t('admin.clients.postalCode') || 'Postal Code'}</Label>
                          <Input
                            id="postalCode"
                            value={formData.postalCode}
                            onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                            placeholder={locale === 'ar' ? '١٢٣٤٥' : (t('admin.clients.placeholder.postalCode') || '12345')}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700">
                  {t('admin.clients.createClient') || 'Create Client'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-muted-foreground">{t('admin.clients.totalClients') || 'Total Clients'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatNumber(pagination.total || clients.length)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-muted-foreground">{t('admin.clients.activeApplications') || 'Active Applications'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatNumber(clients.reduce((sum, c) => sum + c._count.applications, 0))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-muted-foreground">{t('admin.clients.totalInvoices') || 'Total Invoices'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {formatNumber(clients.reduce((sum, c) => sum + c._count.invoices, 0))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-muted-foreground" />
                  <Input
                    placeholder={t('admin.clients.searchPlaceholder')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="rowsPerPage" className="text-sm whitespace-nowrap">{t('common.rows')}:</Label>
                <Select value={rowsPerPage === 'all' ? 'all' : rowsPerPage.toString()} onValueChange={(value) => {
                  setRowsPerPage(value === 'all' ? 'all' : Number(value))
                  setCurrentPage(1)
                }}>
                  <SelectTrigger id="rowsPerPage" className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">{formatNumber(10)}</SelectItem>
                    <SelectItem value="25">{formatNumber(25)}</SelectItem>
                    <SelectItem value="50">{formatNumber(50)}</SelectItem>
                    <SelectItem value="100">{formatNumber(100)}</SelectItem>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Clients Table */}
        <Card>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>
            ) : searchError ? (
              <div className="text-center py-8 text-red-500">
                {t('common.error')}: {searchError}
              </div>
            ) : displayedClients.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-muted-foreground">
                {search.length >= 3 ? t('admin.clients.noResults') || 'No clients found matching your search.' : t('admin.clients.noClients')}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">{t('common.id') || 'ID'}</TableHead>
                      <TableHead>{t('admin.clients.client') || 'Client'}</TableHead>
                      <TableHead>{t('auth.companyName')}</TableHead>
                      <TableHead>{t('admin.clients.groups.title')}</TableHead>
                      <TableHead>{t('admin.clients.contact') || 'Contact'}</TableHead>
                      <TableHead>{t('admin.clients.cases') || 'Cases'}</TableHead>
                      <TableHead>{t('common.status')}</TableHead>
                      <TableHead className="text-right">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedClients.map((client) => (
                    <TableRow 
                      key={client.id}
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedClient(client)
                        setShowViewDialog(true)
                      }}
                    >
                      <TableCell className="text-sm text-gray-500 dark:text-muted-foreground font-mono">
                        {client.clientNumber}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={toAvatarUrl(client.profilePicture || client.user?.avatar) ?? undefined} />
                            <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                              {getInitials(client.user?.name || '')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{client.user?.name || t('admin.clients.unknown')}</p>
                            <p className="text-sm text-gray-600 dark:text-muted-foreground">{client.user?.email || t('admin.clients.noEmail')}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-gray-400 dark:text-muted-foreground" />
                          {client.company}
                        </div>
                      </TableCell>
                      <TableCell className="w-[160px]" onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={client.group?.id ?? normalGroupId ?? ''}
                          onValueChange={(value) =>
                            handleQuickGroupUpdate(client.id, value === '' ? null : value)
                          }
                          disabled={groupUpdating === client.id}
                        >
                          <SelectTrigger className="w-full h-8 border-0 bg-transparent shadow-none hover:bg-muted/50 focus:ring-0 min-w-0 [&>span]:flex [&>span]:items-center">
                            <SelectValue>
                              {groupUpdating === client.id ? (t('admin.leads.updating') || 'Updating...') : getGroupBadge(client)}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {groups.map((group) => {
                              const c = group.color || '#6b7280'
                              return (
                                <SelectItem key={group.id} value={group.id}>
                                  <Badge
                                    className="text-xs font-medium flex items-center gap-1 w-fit"
                                    style={{ backgroundColor: `${c}20`, color: c }}
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: c }} />
                                    {group.name}
                                  </Badge>
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          {client.user?.phone && (
                            <div className="flex items-center gap-1 text-gray-600 dark:text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {client.user.phone}
                            </div>
                          )}
                          {!client.user?.phone && (
                            <span className="text-gray-400 dark:text-muted-foreground">{t('admin.clients.noPhone') || 'No phone'}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{formatNumber(client._count.applications)}</span>
                        <span className="text-gray-600 dark:text-muted-foreground text-sm"> {t('admin.applications.title')}</span>
                      </TableCell>
                      <TableCell>
                        {client.user?.isActive ? (
                          <Badge className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {t('admin.clients.active') || 'Active'}
                          </Badge>
                        ) : (
                          <Badge variant="outline">{t('admin.clients.inactive') || 'Inactive'}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedClient(client)
                                  setShowViewDialog(true)
                                }}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                {t('common.view')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openEditDialog(client)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                {t('common.edit')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => openDeleteDialog(client)}
                                className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t('common.delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {/* Pagination Controls */}
                {rowsPerPage !== 'all' && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-sm text-gray-600 dark:text-muted-foreground">
                      {t('admin.clients.showing')} {formatNumber(((currentPage - 1) * (typeof rowsPerPage === 'number' ? rowsPerPage : 25)) + 1)} {t('admin.clients.to')} {formatNumber(Math.min(currentPage * (typeof rowsPerPage === 'number' ? rowsPerPage : 25), pagination.total))} {t('admin.clients.of')} {formatNumber(pagination.total)} {t('admin.clients.clients')}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={!pagination.hasPreviousPage}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="text-sm text-gray-600 dark:text-muted-foreground">
                        {t('common.page')} {formatNumber(currentPage)} {t('admin.clients.of')} {formatNumber(pagination.totalPages)}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                        disabled={!pagination.hasNextPage}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                {rowsPerPage === 'all' && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-sm text-gray-600 dark:text-muted-foreground">
                      {t('admin.clients.showingAll')} {formatNumber(pagination.total)} {t('admin.clients.clients')}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* View Client Dialog */}
        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('admin.clients.clientDetails')}</DialogTitle>
            </DialogHeader>
            {selectedClient && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-muted/50 rounded-lg">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={toAvatarUrl(selectedClient.profilePicture || selectedClient.user?.avatar) ?? undefined} />
                    <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-2xl">
                      {getInitials(selectedClient.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-bold">{selectedClient.user.name}</h3>
                    <p className="text-gray-600 dark:text-muted-foreground">{selectedClient.company}</p>
                    {selectedClient.group && (
                      <Badge
                        className="mt-2 text-xs font-medium"
                        style={{
                          backgroundColor: `${selectedClient.group.color}20`,
                          color: selectedClient.group.color,
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mr-1" style={{ backgroundColor: selectedClient.group.color }} />
                        {selectedClient.group.name}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-600 dark:text-muted-foreground">{t('auth.email')}</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Mail className="h-4 w-4 text-gray-400 dark:text-muted-foreground" />
                      <p>{selectedClient.user.email}</p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-600 dark:text-muted-foreground">{t('auth.phoneNumber')}</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Phone className="h-4 w-4 text-gray-400 dark:text-muted-foreground" />
                      <p>{selectedClient.user.phone || t('admin.leads.notProvided')}</p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-600 dark:text-muted-foreground">{t('auth.companyName')}</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Building className="h-4 w-4 text-gray-400 dark:text-muted-foreground" />
                      <p>{selectedClient.company}</p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-600 dark:text-muted-foreground">{t('admin.clients.memberSince')}</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-gray-400 dark:text-muted-foreground" />
                      <p>{format(new Date(selectedClient.createdAt), 'MMM dd, yyyy')}</p>
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                {(selectedClient.street || selectedClient.city || selectedClient.state || selectedClient.country || selectedClient.postalCode) && (
                  <div>
                    <h4 className="font-semibold mb-3">{t('admin.clients.addressInformation')}</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedClient.street && (
                        <div>
                          <Label className="text-gray-600 dark:text-muted-foreground">{t('admin.clients.street')}</Label>
                          <p className="mt-1">{selectedClient.street}</p>
                        </div>
                      )}
                      {selectedClient.city && (
                        <div>
                          <Label className="text-gray-600 dark:text-muted-foreground">{t('admin.clients.city')}</Label>
                          <p className="mt-1">{selectedClient.city}</p>
                        </div>
                      )}
                      {selectedClient.state && (
                        <div>
                          <Label className="text-gray-600 dark:text-muted-foreground">{t('admin.clients.state')}</Label>
                          <p className="mt-1">{selectedClient.state}</p>
                        </div>
                      )}
                      {selectedClient.country && (
                        <div>
                          <Label className="text-gray-600 dark:text-muted-foreground">{t('admin.clients.country')}</Label>
                          <p className="mt-1">{selectedClient.country}</p>
                        </div>
                      )}
                      {selectedClient.postalCode && (
                        <div>
                          <Label className="text-gray-600 dark:text-muted-foreground">{t('admin.clients.postalCode')}</Label>
                          <p className="mt-1">{selectedClient.postalCode}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-semibold mb-3">{t('admin.applications.title')} ({formatNumber(selectedClient._count.applications)})</h4>
                  {selectedClient.applications.length === 0 ? (
                    <p className="text-gray-500 dark:text-muted-foreground text-sm">{t('admin.clients.noApplicationsYet')}</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedClient.applications.slice(0, 5).map((application: any) => (
                        <div key={application.id} className="flex justify-between items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                          <div>
                            <p className="font-medium">{application.applicationNumber}</p>
                            <p className="text-sm text-gray-600 dark:text-muted-foreground">{application.description}</p>
                          </div>
                          <Badge variant="outline">{application.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-semibold mb-3">{t('admin.sidebar.invoices')} ({formatNumber(selectedClient._count.invoices)})</h4>
                  {selectedClient.invoices.length === 0 ? (
                    <p className="text-gray-500 dark:text-muted-foreground text-sm">{t('admin.clients.noInvoicesYet')}</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedClient.invoices.slice(0, 5).map((invoice: any) => (
                        <div key={invoice.id} className="flex justify-between items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                          <div>
                            <p className="font-medium">{invoice.invoiceNumber}</p>
                            <p className="text-sm text-gray-600 dark:text-muted-foreground">SAR {formatNumber(invoice.totalAmount)}</p>
                          </div>
                          <Badge variant="outline">{invoice.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Client Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('admin.clients.editClient')}</DialogTitle>
              <DialogDescription>
                {t('admin.clients.updateClient')}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-4">{t('admin.clients.basicInfo')}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-name">{t('auth.fullName')} *</Label>
                    <Input
                      id="edit-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-phone">{t('auth.phoneNumber')}</Label>
                    <Input
                      id="edit-phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+966 50 123 4567"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-company">{t('auth.companyName')} *</Label>
                    <Input
                      id="edit-company"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-group">{t('admin.clients.groups.title')}</Label>
                    <Select value={formData.groupId || "none"} onValueChange={(value) => setFormData({ ...formData, groupId: value === "none" ? "" : value })}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('admin.clients.selectGroup')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t('admin.clients.noGroup')}</SelectItem>
                        {groups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Profile Picture and Address */}
              <div className="grid grid-cols-2 gap-6">
                {/* Profile Picture Upload */}
                <div>
                  <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-3">{t('admin.clients.profilePicture')}</h4>
                  <div className="flex items-center gap-4">
                    {formData.profilePicture ? (
                      <div className="flex items-center gap-3">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={toAvatarUrl(formData.profilePicture) ?? undefined} />
                          <AvatarFallback>PP</AvatarFallback>
                        </Avatar>
                        <div className="space-y-2">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleFileUpload(file)
                            }}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                          >
                            {uploading ? t('admin.clients.uploading') : t('common.change') || 'Change'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setFormData({ ...formData, profilePicture: '' })}
                          >
                            {t('common.remove')}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Avatar className="h-16 w-16">
                          <AvatarFallback>PP</AvatarFallback>
                        </Avatar>
                        <div>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleFileUpload(file)
                            }}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                          >
                            {uploading ? t('admin.clients.uploading') : t('admin.clients.uploadPhoto')}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Address Section */}
                <div>
                  <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-3">{t('admin.clients.addressInformation')}</h4>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="edit-street">{t('admin.clients.street')}</Label>
                      <Input
                        id="edit-street"
                        value={formData.street}
                        onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                        placeholder={t('admin.clients.placeholder.street')}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="edit-city">{t('admin.clients.city')}</Label>
                        <Input
                          id="edit-city"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          placeholder={t('admin.clients.placeholder.city')}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-state">{t('admin.clients.state')}</Label>
                        <Input
                          id="edit-state"
                          value={formData.state}
                          onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                          placeholder={t('admin.clients.placeholder.state')}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="edit-country">{t('admin.clients.country')}</Label>
                        <Input
                          id="edit-country"
                          value={formData.country}
                          onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                          placeholder="Saudi Arabia"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-postalCode">{t('admin.clients.postalCode')}</Label>
                        <Input
                          id="edit-postalCode"
                          value={formData.postalCode}
                          onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                          placeholder="12345"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {t('admin.clients.emailCannotChange')}
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleUpdate} className="bg-emerald-600 hover:bg-emerald-700" disabled={updating}>
                {updating ? t('admin.clients.updating') : t('admin.clients.updateClient')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Client Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('admin.clients.deleteClient')}</DialogTitle>
              <DialogDescription>
                {t('admin.clients.deletePermanent')}
              </DialogDescription>
            </DialogHeader>
            
            {deletingClient && (
              <div className="py-4">
                <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="font-medium text-red-900 dark:text-red-200">
                      {t('admin.clients.deleteCompany')} <strong>{deletingClient.company}</strong>?
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      {t('admin.clients.clientLabel')}: {deletingClient.user.name} ({deletingClient.user.email})
                    </p>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={deleting}>
                {t('common.cancel')}
              </Button>
              <Button 
                onClick={handleDelete} 
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={deleting}
              >
                {deleting ? t('admin.clients.deleting') : t('admin.clients.deleteClient')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminPageTemplate>
  )
}
