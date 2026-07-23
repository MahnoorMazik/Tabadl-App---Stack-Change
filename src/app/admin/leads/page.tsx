'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import axios from 'axios'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { EntityActivityPanel } from '@/components/audit/EntityActivityPanel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EmailInput } from '@/components/ui/email-input'
import { validateEmail } from '@/lib/email-validation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DuplicateBadge } from '@/components/ui/duplicate-badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {  
  Search, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  UserPlus, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Phone,
  Building,
  User,
  Mail,
  FileText,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Upload,
  Download,
  File,
  X,
  ChevronsUpDown,
  Check,
  Loader2,
  Calendar
} from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { TimePicker } from '@/components/ui/time-picker'
import { cn } from '@/lib/utils'
import { getCountriesList, countryCodes as countryCodesList } from '@/lib/countries'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { getErrorMessage } from '@/lib/utils'
import { useLocale } from '@/contexts/LocaleContext'

/** Format 24h "HH:mm" for display as 12-hour (e.g. "9:00 AM", "2:30 PM"). */
function formatTime12h(hhmm: string): string {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':')
  const d = new Date(1970, 0, 1, parseInt(h ?? '0', 10), parseInt(m ?? '0', 10))
  return format(d, 'h:mm a')
}

interface LeadStatusOption {
  id: string
  name: string
  color: string
}

interface Lead {
  id: string
  leadNumber?: string
  fullName: string
  email: string
  phone?: string
  companyName?: string
  companyType?: string
  natureOfBusiness?: string
  designation?: string
  country?: string
  city?: string
  howDidYouHear?: string
  businessTypes?: string // JSON string
  status: string | null
  source?: string
  notes?: string
  assignedToId?: string
  assignedTo?: {
    id: string
    name: string
    email: string
  }
  duplicateGroupId?: string
  isDuplicate: boolean
  duplicateCount: number
  createdAt: string
  updatedAt: string
}

interface LeadNote {
  id: string
  title: string
  body: string
  createdAt: string
  updatedAt: string
  createdBy?: {
    id: string
    name?: string | null
    email?: string | null
  } | null
}

export default function LeadsPage() {
  const { token } = useAuth()
  const { toast } = useToast()
  const { t, formatNumber } = useLocale()
  const [managers, setManagers] = useState<any[]>([])
  const [leadStatuses, setLeadStatuses] = useState<LeadStatusOption[]>([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [showConverted, setShowConverted] = useState(false)
  const [rowsPerPage, setRowsPerPage] = useState<number | 'all'>(25)
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  })
  const [stats, setStats] = useState({ total: 0, new: 0, contacted: 0, qualified: 0, converted: 0 })
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [leadDocuments, setLeadDocuments] = useState<Record<string, any[]>>({})
  const [uploadingDocument, setUploadingDocument] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ loaded: number; total: number } | null>(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [viewProgress, setViewProgress] = useState<{ loaded: number; total: number } | null>(null)
  const [uploadForm, setUploadForm] = useState({
    file: null as File | null,
    name: '',
    description: ''
  })
  const [leadNotes, setLeadNotes] = useState<Record<string, LeadNote[]>>({})
  const [notesLoading, setNotesLoading] = useState(false)
  const [noteForm, setNoteForm] = useState({ title: '', body: '' })
  const [showAddNoteForm, setShowAddNoteForm] = useState(false)
  const [noteSubmitting, setNoteSubmitting] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editNoteForm, setEditNoteForm] = useState({ title: '', body: '' })
  const [noteUpdatingId, setNoteUpdatingId] = useState<string | null>(null)
  const [noteDeletingId, setNoteDeletingId] = useState<string | null>(null)
  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false)
  const [followUpForm, setFollowUpForm] = useState({
    title: '',
    description: '',
    date: undefined as Date | undefined,
    time: '09:00'
  })
  const [followUpSubmitting, setFollowUpSubmitting] = useState(false)
  const [leadFollowUps, setLeadFollowUps] = useState<Record<string, any[]>>({})
  const [followUpDeletingId, setFollowUpDeletingId] = useState<string | null>(null)
  const [viewDialogClockTick, setViewDialogClockTick] = useState(0)
  const [dateTimePopoverOpen, setDateTimePopoverOpen] = useState(false)
  const [pendingDate, setPendingDate] = useState<Date | undefined>(undefined)
  const [pendingTime, setPendingTime] = useState('09:00')
  // Synced with notification settings so timeline "Reminder due on" matches when reminders are sent.
  // Initialize from sessionStorage so value persists across navigations even if GET is cached or fails.
  const [userReminderMinutesBefore, setUserReminderMinutesBefore] = useState<number>(() => {
    if (typeof window === 'undefined') return 15
    const stored = sessionStorage.getItem('reminderMinutesBefore')
    if (stored == null) return 15
    const n = Number(stored)
    return !Number.isNaN(n) && n >= 15 ? n : 15
  })

  // Helper: statuses user can manually select (exclude system "Converted")
  const selectableStatuses = leadStatuses.filter((s) => s.name !== 'Converted')

  // Ensure status filter is always a valid option (prevents Radix Select infinite update loop)
  const validStatusFilter =
    statusFilter === 'all' || selectableStatuses.some((s) => s.name === statusFilter)
      ? statusFilter
      : 'all'

  // Only update status filter when user picks a valid option; prevents infinite loop from Radix
  const handleStatusFilterChange = useCallback(
    (v: string) => {
      setStatusFilter((prev) => {
        if (prev === v) return prev
        if (v === 'all') return 'all'
        const sel = leadStatuses.filter((s) => s.name !== 'Converted')
        if (sel.some((s) => s.name === v)) return v
        return prev
      })
    },
    [leadStatuses]
  )

  // Helper: Build headers with optional Authorization token
  // NextAuth uses cookies, so token may be null - API routes use withAuth which checks cookies
  const getAuthHeaders = useCallback(() => {
    const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null)
    return authToken ? { Authorization: `Bearer ${authToken}` } : {}
  }, [token])

  // Fetch leads with pagination
  const fetchLeads = useCallback(async () => {
    // Note: NextAuth uses cookies for authentication, so token may be null
    // The API route uses withAuth middleware which checks session cookies
    // We still try to get token from localStorage as fallback for compatibility
    const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null)
    
    setLoading(true)
    setSearchError(null)
    
    try {
      const params = new URLSearchParams()
      
      // Add filters
      if (showConverted) {
        // Show only converted leads (those with system "Converted" status)
        params.append('status', 'Converted')
      } else if (validStatusFilter !== 'all') {
        params.append('status', validStatusFilter)
      } else {
        // When showing all non-converted leads, exclude CLOSED_WON
        params.append('excludeConverted', 'true')
      }
      
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
      
      // Build headers - include Authorization if token exists, otherwise rely on cookies
      const headers: Record<string, string> = {}
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`
      }
      
      const response = await axios.get(`/api/leads?${params.toString()}`, {
        headers
      })
      
      // Debug: Log response structure
      console.log('Leads API Response:', {
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : [],
        hasLeads: !!response.data?.leads,
        leadsType: typeof response.data?.leads,
        leadsIsArray: Array.isArray(response.data?.leads),
        leadsLength: Array.isArray(response.data?.leads) ? response.data.leads.length : 'N/A',
        hasDataLeads: !!response.data?.data?.leads,
        responseStatus: response.status
      })
      
      // Handle different response structures
      let leadsArray: Lead[] = []
      
      // Check for direct { leads, pagination } structure (most common)
      if (response.data?.leads !== undefined) {
        leadsArray = Array.isArray(response.data.leads) ? response.data.leads : []
        console.log(`✓ Found ${leadsArray.length} leads in response.data.leads`)
      } 
      // Check for wrapped response structure { data: { leads, pagination } }
      else if (response.data?.data?.leads !== undefined) {
        leadsArray = Array.isArray(response.data.data.leads) ? response.data.data.leads : []
        console.log(`✓ Found ${leadsArray.length} leads in response.data.data.leads`)
      }
      // Check if response.data itself is an array (unlikely but possible)
      else if (Array.isArray(response.data)) {
        leadsArray = response.data
        console.log(`✓ Found ${leadsArray.length} leads in response.data (array)`)
      }
      // If no leads property found, log for debugging
      else {
        console.warn('⚠ Unexpected response structure - no leads found:', {
          responseData: response.data,
          responseKeys: response.data ? Object.keys(response.data) : []
        })
        leadsArray = []
      }
      
      // Always set leads (even if empty array)
      setLeads(leadsArray)
      console.log(`✓ Set ${leadsArray.length} leads in state`)
      
      // Handle pagination
      if (response.data?.pagination) {
        setPagination(response.data.pagination)
      } else if (response.data?.data?.pagination) {
        setPagination(response.data.data.pagination)
      }
      
      // Handle stats for real-time card updates
      const apiStats = response.data?.stats ?? response.data?.data?.stats
      if (apiStats && typeof apiStats === 'object') {
        setStats({
          total: Number(apiStats.total) || 0,
          new: Number(apiStats.new) || 0,
          contacted: Number(apiStats.contacted) || 0,
          qualified: Number(apiStats.qualified) || 0,
          converted: Number(apiStats.converted) || 0,
        })
      }
    } catch (error: any) {
      console.error('Error fetching leads:', error)
      console.error('Error response:', error?.response?.data)
      console.error('Error status:', error?.response?.status)
      
      // Set error message
      const errorMsg = getErrorMessage(error, 'Failed to fetch leads')
      setSearchError(errorMsg)
      setLeads([])
      
      // Also log to help debug
      if (error?.response?.data) {
        console.error('Full error response:', JSON.stringify(error.response.data, null, 2))
      }
    } finally {
      setLoading(false)
    }
  }, [token, validStatusFilter, showConverted, debouncedSearch, currentPage, rowsPerPage])
  
  // Log when fetchLeads is called to help debug
  useEffect(() => {
    console.log('🔍 fetchLeads dependencies changed:', {
      hasToken: !!token,
      validStatusFilter,
      showConverted,
      debouncedSearch,
      currentPage,
      rowsPerPage
    })
  }, [token, validStatusFilter, showConverted, debouncedSearch, currentPage, rowsPerPage])

  // Fetch lead statuses for filters and dropdowns
  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const response = await axios.get('/api/lead-statuses', {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
        const list = response.data?.statuses || []
        setLeadStatuses(
          list.map((s: any) => ({
            id: s.id,
            name: s.name,
            color: s.color,
          }))
        )
      } catch (error) {
        console.error('Error fetching lead statuses for leads page:', error)
      }
    }

    fetchStatuses()
  }, [token])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch leads when dependencies change
  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [validStatusFilter, showConverted, debouncedSearch, rowsPerPage])


  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showViewDialog, setShowViewDialog] = useState(false)
  // Refresh "reminder due in" every minute when view dialog is open
  useEffect(() => {
    if (!showViewDialog) return
    const id = setInterval(() => setViewDialogClockTick(c => c + 1), 60_000)
    return () => clearInterval(id)
  }, [showViewDialog])

  // Fetch current user's reminder setting so timeline card matches when backend sends reminders.
  // Cache-bust so we never use a stale value (e.g. after user changes reminder in notification settings).
  const fetchReminderPreference = useCallback(() => {
    const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null)
    if (!authToken) return
    axios
      .get('/api/notifications/preferences', {
        headers: { Authorization: `Bearer ${authToken}` },
        withCredentials: true,
        params: { _: Date.now() },
      })
      .then((res) => {
        const data = res.data?.data ?? res.data ?? {}
        const raw = data.reminderMinutesBefore
        const mins = typeof raw === 'number' ? raw : Number(raw)
        if (!Number.isNaN(mins) && mins >= 15) {
          setUserReminderMinutesBefore(mins)
          if (typeof window !== 'undefined') sessionStorage.setItem('reminderMinutesBefore', String(mins))
        }
      })
      .catch(() => {})
  }, [token])

  useEffect(() => {
    if (token) fetchReminderPreference()
  }, [token, fetchReminderPreference])

  // Refetch reminder setting when opening view dialog so it's in sync after user changes settings
  useEffect(() => {
    if (showViewDialog && token) fetchReminderPreference()
  }, [showViewDialog, token, fetchReminderPreference])

  // Refetch when user returns to this tab/page (e.g. after changing reminder in notification settings)
  // so timeline follow-up cards always show "Reminder due in X" using the latest setting
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && token) fetchReminderPreference()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [token, fetchReminderPreference])

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [viewingLead, setViewingLead] = useState<Lead | null>(null)
  const [deletingLead, setDeletingLead] = useState<Lead | null>(null)
  const [uploadingLeadId, setUploadingLeadId] = useState<string | null>(null)
  const [showDocumentViewer, setShowDocumentViewer] = useState(false)
  const [viewingDocument, setViewingDocument] = useState<any | null>(null)
  const [pdfViewUrl, setPdfViewUrl] = useState<string | null>(null)
  
  // Convert to client state
  const [convertToClient, setConvertToClient] = useState(false)
  const [showConvertDialog, setShowConvertDialog] = useState(false)
  const [convertingLeadId, setConvertingLeadId] = useState<string | null>(null)
  const [isConverting, setIsConverting] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [convertEmail, setConvertEmail] = useState('')
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false)
  const [editCountryDropdownOpen, setEditCountryDropdownOpen] = useState(false)
  
  const countriesList = getCountriesList()
  const activeLeadNotes = viewingLead ? (leadNotes[viewingLead.id] || []) : []
  
  // Loading states
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null)
  
  // Form data - matching business consultation form structure
  const [formData, setFormData] = useState<{
    fullName: string
    email: string
    phoneCountryCode: string
    phone: string
    companyName: string
    companyType: string
    natureOfBusiness: string
    designation: string
    country: string
    city: string
    howDidYouHear: string
    businessTypes: string[] // Changed to array to match BC form
    status: string
    source: string
    notes: string
    assignedToId: string
  }>({
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
    businessTypes: [], // Changed to array
    status: '',
    source: '',
    notes: '',
    assignedToId: ''
  })
  
  // Business consultation form states
  const [emailError, setEmailError] = useState('')
  const [customBusinessTypeInput, setCustomBusinessTypeInput] = useState('')
  const [countryCodeOpen, setCountryCodeOpen] = useState(false)
  
  // Business types options - matching BC form
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
  
  // Get country codes for phone selector - matching BC form structure
  const phoneCountryCodes = countryCodesList.filter(country => country.code !== '+972') // Exclude Israel
  const uniqueCountryCodes = Array.from(
    new Map(phoneCountryCodes.map(item => [item.code, item])).values()
  ).sort((a, b) => {
    if (a.code === '+966') return -1
    if (b.code === '+966') return 1
    return a.name.localeCompare(b.name)
  })
  
  const selectedCountry = uniqueCountryCodes.find(c => c.code === formData.phoneCountryCode)
  
  // Helper functions for business types - matching BC form
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
  
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits and limit to 10 characters
    const value = e.target.value.replace(/\D/g, '').slice(0, 10)
    setFormData(prev => ({ ...prev, phone: value }))
  }

  // Remove old fetchLeads function - now handled by useSearch hook

  const fetchManagers = useCallback(async () => {
    // Note: NextAuth uses cookies for authentication, so token may be null
    const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null)
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {}
    
    try {
      const response = await axios.get('/api/users', {
        headers
      })
      // Handle structured response format: { success: true, data: { users: [...] } }
      const users = response.data?.data?.users || response.data?.users || []
      const staffUsers = users.filter((user: any) => user.role === 'STAFF')
      setManagers(staffUsers)
    } catch (error) {
      console.error('Error fetching managers:', error)
    }
  }, [token])

  useEffect(() => {
    fetchManagers()
  }, [fetchManagers])

  const handleCreate = async () => {
    // Only name, email, and phone are mandatory
    if (!formData.fullName?.trim()) {
      toast({
        title: t('common.error'),
        description: t('contact.form.name') ? `${t('contact.form.name')} ${t('common.required') || 'is required'}` : 'Name is required',
        variant: 'destructive'
      })
      return
    }
    if (!formData.email?.trim()) {
      setEmailError(t('contact.form.email') ? `${t('contact.form.email')} ${t('common.required') || 'is required'}` : 'Email is required')
      toast({
        title: t('common.error'),
        description: t('contact.form.email') ? `${t('contact.form.email')} ${t('common.required') || 'is required'}` : 'Email is required',
        variant: 'destructive'
      })
      return
    }
    const emailValidation = validateEmail(formData.email)
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error!)
      toast({
        title: t('common.error'),
        description: emailValidation.error,
        variant: 'destructive'
      })
      return
    }
    if (!formData.phone?.trim()) {
      toast({
        title: t('common.error'),
        description: t('contact.form.phone') ? `${t('contact.form.phone')} ${t('common.required') || 'is required'}` : 'Phone is required',
        variant: 'destructive'
      })
      return
    }
    setEmailError('')
    setCreating(true)
    try {
      // Combine country code and phone number - matching BC form
      const fullPhoneNumber = `${formData.phoneCountryCode}${formData.phone}`
      
      await axios.post('/api/leads', {
        fullName: formData.fullName,
        email: formData.email || '',
        phone: fullPhoneNumber, // Send combined phone number
        companyName: formData.companyName || '',
        companyType: formData.companyType || '',
        natureOfBusiness: formData.natureOfBusiness || '',
        designation: formData.designation || '',
        country: formData.country || '',
        city: formData.city || '',
        howDidYouHear: formData.howDidYouHear || '',
        businessTypes: formData.businessTypes.length > 0 ? JSON.stringify(formData.businessTypes) : '', // Convert array to JSON string
        status: formData.status || '',
        source: formData.source || '',
        notes: formData.notes || '',
        assignedToId: formData.assignedToId || undefined
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      toast({
        title: t('common.success'),
        description: t('admin.leads.leadCreated'),
      })
      
      setShowCreateDialog(false)
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
        status: '',
        source: '',
        notes: '',
        assignedToId: ''
      })
      setCustomBusinessTypeInput('')
      setEmailError('')
      await fetchLeads()
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: getErrorMessage(error, t('admin.leads.failedToCreate')),
        variant: 'destructive'
      })
    } finally {
      setCreating(false)
    }
  }

  const nameToKey = (n: string) => (n ?? '').toLowerCase()
  const handleQuickStatusUpdate = async (leadId: string, newStatus: string) => {
    const lead = leads.find(l => l.id === leadId)
    const oldStatus = lead?.status
    setStatusUpdating(leadId)
    // Optimistic update for immediate UI feedback
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l))
    if (oldStatus && newStatus) {
      setStats(prev => {
        const next = { ...prev }
        const ok = nameToKey(oldStatus)
        const nk = nameToKey(newStatus)
        if (ok === 'new') next.new = Math.max(0, prev.new - 1)
        else if (ok === 'contacted') next.contacted = Math.max(0, prev.contacted - 1)
        else if (ok === 'qualified') next.qualified = Math.max(0, prev.qualified - 1)
        else if (ok === 'converted') next.converted = Math.max(0, prev.converted - 1)
        if (nk === 'new') next.new += 1
        else if (nk === 'contacted') next.contacted += 1
        else if (nk === 'qualified') next.qualified += 1
        else if (nk === 'converted') next.converted += 1
        return next
      })
    }
    try {
      await axios.patch(`/api/leads/${leadId}`, {
        status: newStatus
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      toast({
        title: t('common.success'),
        description: t('admin.leads.statusUpdated'),
      })
      
      await fetchLeads()
    } catch (error: any) {
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: oldStatus ?? l.status } : l))
      if (oldStatus && newStatus) {
        setStats(prev => {
          const next = { ...prev }
          const ok = nameToKey(oldStatus)
          const nk = nameToKey(newStatus)
          if (ok === 'new') next.new += 1
          else if (ok === 'contacted') next.contacted += 1
          else if (ok === 'qualified') next.qualified += 1
          else if (ok === 'converted') next.converted += 1
          if (nk === 'new') next.new = Math.max(0, prev.new - 1)
          else if (nk === 'contacted') next.contacted = Math.max(0, prev.contacted - 1)
          else if (nk === 'qualified') next.qualified = Math.max(0, prev.qualified - 1)
          else if (nk === 'converted') next.converted = Math.max(0, prev.converted - 1)
          return next
        })
      }
      toast({
        title: t('common.error'),
        description: getErrorMessage(error, t('admin.leads.failedToUpdateStatus')),
        variant: 'destructive'
      })
    } finally {
      setStatusUpdating(null)
    }
  }

  const handleUpdate = async () => {
    if (!editingLead) return
    
    // Validate email before submitting
    const emailValidation = validateEmail(formData.email)
    if (!emailValidation.isValid) {
      toast({
        title: 'Error',
        description: emailValidation.error,
        variant: 'destructive'
      })
      return
    }
    
    setUpdating(true)
    
    // If converting to client
    if (convertToClient) {
      try {
        await axios.post(`/api/leads/${editingLead.id}/convert`, {
          companyName: formData.companyName
        }, {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        toast({
          title: 'Success',
          description: 'Lead converted to client successfully. Login credentials sent via email.',
        })
        
        setShowEditDialog(false)
        setEditingLead(null)
        setConvertToClient(false)
        await fetchLeads()
      } catch (error: any) {
        toast({
          title: 'Error',
          description: getErrorMessage(error, 'Failed to convert lead'),
          variant: 'destructive'
        })
      } finally {
        setUpdating(false)
      }
      return
    }
    
    // Regular update
    try {
      await axios.patch(`/api/leads/${editingLead.id}`, {
        ...formData,
        assignedToId: formData.assignedToId || undefined
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      toast({
        title: t('common.success'),
        description: t('admin.leads.leadUpdated'),
      })
      
      setShowEditDialog(false)
      setEditingLead(null)
      await fetchLeads()
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: getErrorMessage(error, t('admin.leads.failedToUpdate')),
        variant: 'destructive'
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingLead) return
    
    setDeleting(true)
    try {
      await axios.delete(`/api/leads/${deletingLead.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      toast({
        title: t('common.success'),
        description: t('admin.leads.deleted') || 'Lead deleted successfully',
      })
      
      // If the deleted lead is being viewed, close the view dialog
      if (viewingLead && viewingLead.id === deletingLead.id) {
        setShowViewDialog(false)
        setViewingLead(null)
      }
      
      setShowDeleteDialog(false)
      setDeletingLead(null)
      await fetchLeads()
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: getErrorMessage(error, t('admin.leads.deleteFailed') || 'Failed to delete lead'),
        variant: 'destructive'
      })
    } finally {
      setDeleting(false)
    }
  }

  const handleConvertToClient = async (leadId: string) => {
    const lead = displayedLeads.find(l => l.id === leadId)
    if (!lead) return
    
    setConvertingLeadId(leadId)
    setConvertEmail(lead.email || '')
    setPassword('')
    setConfirmPassword('')
    setShowConvertDialog(true)
  }

  const handleConvertSubmit = async () => {
    if (!convertingLeadId) return

    if (convertEmail && !validateEmail(convertEmail).isValid) {
      toast({
        title: 'Error',
        description: 'Please enter a valid email address',
        variant: 'destructive'
      })
      return
    }

    try {
      setIsConverting(true)
      await axios.post(`/api/leads/${convertingLeadId}/convert`, {
        ...(convertEmail ? { email: convertEmail } : {}),
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      toast({
        title: t('common.success'),
        description: t('admin.leads.converted') || 'Lead converted to client successfully. Login credentials sent via email.',
      })
      
      setShowConvertDialog(false)
      setConvertingLeadId(null)
      setConvertEmail('')
      await fetchLeads()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: getErrorMessage(error, 'Failed to convert lead'),
        variant: 'destructive'
      })
    } finally {
      setIsConverting(false)
    }
  }

  const openEditDialog = (lead: Lead) => {
    setEditingLead(lead)
    // Parse phone number to get country code and local number
    const parsedPhone = lead.phone ? (() => {
      const phone = lead.phone
      if (phone.startsWith('+966')) {
        return { countryCode: '+966', localNumber: phone.slice(4) }
      } else if (phone.startsWith('+')) {
        // Try to extract country code (common ones)
        const match = phone.match(/^(\+\d{1,3})(\d+)$/)
        if (match) {
          return { countryCode: match[1], localNumber: match[2] }
        }
      }
      return { countryCode: '+966', localNumber: phone }
    })() : { countryCode: '+966', localNumber: '' }
    
    setFormData({
      fullName: lead.fullName,
      email: lead.email,
      phoneCountryCode: parsedPhone.countryCode,
      phone: parsedPhone.localNumber,
      companyName: lead.companyName || '',
      companyType: lead.companyType || '',
      natureOfBusiness: lead.natureOfBusiness || '',
      designation: lead.designation || '',
      country: lead.country || '',
      city: lead.city || '',
      howDidYouHear: lead.howDidYouHear || '',
      businessTypes: lead.businessTypes ? (typeof lead.businessTypes === 'string' ? JSON.parse(lead.businessTypes) : lead.businessTypes) : [],
      status: lead.status || '',
      source: lead.source || '',
      notes: lead.notes || '',
      assignedToId: lead.assignedToId || ''
    })
    setConvertToClient(false)
    setPassword('')
    setConfirmPassword('')
    setShowEditDialog(true)
  }

  const openViewDialog = (lead: Lead) => {
    setViewingLead(lead)
    setShowViewDialog(true)
    fetchLeadDocuments(lead.id)
    fetchLeadNotes(lead.id)
    fetchLeadFollowUps(lead.id)
    setNoteForm({ title: '', body: '' })
    setEditingNoteId(null)
    setEditNoteForm({ title: '', body: '' })
  }

  const openUploadDialog = (lead: Lead) => {
    setUploadingLeadId(lead.id)
    setUploadForm({
      file: null,
      name: '',
      description: ''
    })
    setShowUploadDialog(true)
  }

  const fetchLeadDocuments = async (leadId: string) => {
    try {
      const response = await axios.get(`/api/documents?leadId=${leadId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const docs = response.data?.data?.documents || response.data?.documents || []
      setLeadDocuments(prev => ({ ...prev, [leadId]: docs }))
    } catch (error) {
      console.error('Error fetching documents:', error)
    }
  }

  const fetchLeadNotes = async (leadId: string) => {
    // Note: NextAuth uses cookies for authentication, so token may be null
    const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null)
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {}
    
    setNotesLoading(true)
    try {
      const response = await axios.get(`/api/leads/${leadId}/notes`, {
        headers
      })
      const notes = response.data?.data?.notes || response.data?.notes || []
      setLeadNotes(prev => ({ ...prev, [leadId]: notes }))
    } catch (error) {
      console.error('Error fetching notes:', error)
    } finally {
      setNotesLoading(false)
    }
  }

  const handleUploadDocument = async () => {
    if (!uploadingLeadId || !uploadForm.file) {
      toast({
        title: t('common.error'),
        description: t('admin.leads.pleaseSelectFile'),
        variant: 'destructive'
      })
      return
    }

    if (!uploadForm.name || uploadForm.name.trim() === '') {
      toast({
        title: t('common.error'),
        description: t('admin.leads.documentNameRequired'),
        variant: 'destructive'
      })
      return
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg']
    if (!allowedTypes.includes(uploadForm.file.type)) {
      toast({
        title: t('common.error'),
        description: t('admin.leads.allowedFileTypes'),
        variant: 'destructive'
      })
      return
    }

    setUploadingDocument(true)
    setUploadProgress(null)
    try {
      const formData = new FormData()
      formData.append('file', uploadForm.file)
      formData.append('leadId', uploadingLeadId)
      if (uploadForm.name) formData.append('name', uploadForm.name)
      if (uploadForm.description) formData.append('description', uploadForm.description)

      await axios.post('/api/upload', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (event) => {
          if (!event.total) return
          setUploadProgress({
            loaded: event.loaded,
            total: event.total,
          })
        },
      })

      toast({
        title: t('common.success'),
        description: t('admin.leads.documentUploaded')
      })

      // Refresh documents if viewing the same lead
      if (viewingLead && viewingLead.id === uploadingLeadId) {
        await fetchLeadDocuments(uploadingLeadId)
      }

      // Close dialog and reset form
      setShowUploadDialog(false)
      setUploadingLeadId(null)
      setUploadForm({
        file: null,
        name: '',
        description: ''
      })
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: getErrorMessage(error, t('admin.leads.failedToUpload')),
        variant: 'destructive'
      })
    } finally {
      setUploadingDocument(false)
      setUploadProgress(null)
    }
  }

  const handleAddNote = async () => {
    if (!viewingLead) return

    if (!noteForm.title.trim() || !noteForm.body.trim()) {
      toast({
        title: t('common.error'),
        description: t('admin.leads.titleRequired'),
        variant: 'destructive'
      })
      return
    }

    setNoteSubmitting(true)
    try {
      await axios.post(`/api/leads/${viewingLead.id}/notes`, {
        title: noteForm.title.trim(),
        body: noteForm.body.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      toast({
        title: t('common.success'),
        description: t('admin.leads.noteAdded')
      })

      setNoteForm({ title: '', body: '' })
      await fetchLeadNotes(viewingLead.id)
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: getErrorMessage(error, t('admin.leads.failedToAddNote')),
        variant: 'destructive'
      })
    } finally {
      setNoteSubmitting(false)
    }
  }

  const handleStartEditNote = (note: LeadNote) => {
    setEditingNoteId(note.id)
    setEditNoteForm({
      title: note.title,
      body: note.body
    })
  }

  const handleCancelEditNote = () => {
    setEditingNoteId(null)
    setEditNoteForm({ title: '', body: '' })
    setNoteUpdatingId(null)
  }

  const handleUpdateNote = async (noteId: string) => {
    if (!viewingLead) return

    if (!editNoteForm.title.trim() || !editNoteForm.body.trim()) {
      toast({
        title: t('common.error'),
        description: t('admin.leads.titleRequired'),
        variant: 'destructive'
      })
      return
    }

    setNoteUpdatingId(noteId)
    try {
      await axios.patch(`/api/leads/${viewingLead.id}/notes/${noteId}`, {
        title: editNoteForm.title.trim(),
        body: editNoteForm.body.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      toast({
        title: t('common.success'),
        description: t('admin.leads.noteUpdated')
      })

      setEditingNoteId(null)
      setEditNoteForm({ title: '', body: '' })
      await fetchLeadNotes(viewingLead.id)
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: getErrorMessage(error, t('admin.leads.failedToUpdateNote')),
        variant: 'destructive'
      })
    } finally {
      setNoteUpdatingId(null)
    }
  }

  // Build Google Calendar URL from current form (no API call)
  const openAddToGoogleCalendar = () => {
    if (!followUpForm.date || !followUpForm.time) {
      toast({
        title: t('common.error'),
        description: t('admin.leads.selectDateAndTimeForCalendar') || 'Please select date and time to add to calendar.',
        variant: 'destructive'
      })
      return
    }
    const [hours, minutes] = followUpForm.time.split(':')
    const scheduledDate = new Date(followUpForm.date)
    scheduledDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0)
    const formatGoogleDate = (date: Date) => {
      const y = date.getUTCFullYear()
      const m = String(date.getUTCMonth() + 1).padStart(2, '0')
      const d = String(date.getUTCDate()).padStart(2, '0')
      const h = String(date.getUTCHours()).padStart(2, '0')
      const min = String(date.getUTCMinutes()).padStart(2, '0')
      const s = String(date.getUTCSeconds()).padStart(2, '0')
      return `${y}${m}${d}T${h}${min}${s}Z`
    }
    const endDate = new Date(scheduledDate.getTime() + 60 * 60 * 1000)
    const title = followUpForm.title.trim() || t('admin.leads.followUp')
    const details = followUpForm.description.trim() || ''
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${formatGoogleDate(scheduledDate)}/${formatGoogleDate(endDate)}&details=${encodeURIComponent(details)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleAddFollowUp = async () => {
    if (!viewingLead) return

    if (!followUpForm.title.trim() || !followUpForm.date || !followUpForm.time) {
      toast({
        title: t('common.error'),
        description: t('admin.leads.titleAndDateTimeRequired') || 'Please enter a title and select date and time.',
        variant: 'destructive'
      })
      return
    }

    setFollowUpSubmitting(true)
    try {
      const [hours, minutes] = followUpForm.time.split(':')
      const scheduledDate = new Date(followUpForm.date)
      scheduledDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0)
      const dateTime = scheduledDate.toISOString()

      await axios.post(`/api/leads/${viewingLead.id}/follow-ups`, {
        title: followUpForm.title.trim(),
        description: followUpForm.description?.trim() ?? '',
        scheduledAt: dateTime
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      toast({
        title: t('common.success'),
        description: t('admin.leads.followUpScheduled')
      })

      setFollowUpForm({ title: '', description: '', date: undefined, time: '09:00' })
      setShowFollowUpDialog(false)
      await fetchLeadFollowUps(viewingLead.id)
      if (showViewDialog) {
        await fetchLeadFollowUps(viewingLead.id)
      }
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: getErrorMessage(error, t('admin.leads.failedToSchedule')),
        variant: 'destructive'
      })
    } finally {
      setFollowUpSubmitting(false)
    }
  }

  const fetchLeadFollowUps = async (leadId: string) => {
    try {
      const response = await axios.get(`/api/leads/${leadId}/follow-ups`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setLeadFollowUps(prev => ({
        ...prev,
        [leadId]: response.data.data?.followUps || response.data.followUps || []
      }))
    } catch (error) {
      console.error('Error fetching follow-ups:', error)
      setLeadFollowUps(prev => ({
        ...prev,
        [leadId]: []
      }))
    }
  }

  // Use current user's reminder setting (same as backend); min 15 to match follow-up-reminders + cron
  const effectiveReminderMinutes = Math.max(15, userReminderMinutesBefore)
  const formatReminderDueTime = (date: Date) =>
    date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })
  const getReminderDueText = (followUp: { scheduledAt: string; reminderSentAt?: string | null }) => {
    const now = new Date()
    const scheduled = new Date(followUp.scheduledAt)
    const reminderDueAt = new Date(scheduled.getTime() - effectiveReminderMinutes * 60 * 1000)
    const dueOnLabel = t('admin.leads.reminderDueOn') || 'Reminder due on'
    const dueOnTime = formatReminderDueTime(reminderDueAt)
    if (followUp.reminderSentAt) return t('admin.leads.reminderSent') || 'Reminder sent'
    if (now > scheduled) return t('admin.leads.followUpTimePassed') || 'Follow-up time passed'
    if (now >= reminderDueAt) return `${t('admin.leads.reminderDueNow') || 'Reminder due now'} (${dueOnLabel} ${dueOnTime})`
    return `${dueOnLabel} ${dueOnTime}`
  }

  const handleCancelFollowUp = async (leadId: string, followUpId: string) => {
    const confirmed = window.confirm(t('admin.leads.cancelFollowUpConfirm') || 'Cancel this follow-up?')
    if (!confirmed) return
    setFollowUpDeletingId(followUpId)
    try {
      await axios.delete(`/api/leads/${leadId}/follow-ups/${followUpId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast({ title: t('common.success'), description: t('admin.leads.followUpCancelled') || 'Follow-up cancelled.' })
      await fetchLeadFollowUps(leadId)
    } catch (error: any) {
      toast({ title: t('common.error'), description: getErrorMessage(error, t('admin.leads.failedToCancelFollowUp') || 'Failed to cancel follow-up.'), variant: 'destructive' })
    } finally {
      setFollowUpDeletingId(null)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!viewingLead) return

    const confirmed = window.confirm(t('admin.leads.areYouSureDeleteNote'))
    if (!confirmed) return

    setNoteDeletingId(noteId)
    try {
      await axios.delete(`/api/leads/${viewingLead.id}/notes/${noteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      toast({
        title: t('common.success'),
        description: t('admin.leads.noteDeleted')
      })

      await fetchLeadNotes(viewingLead.id)
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: getErrorMessage(error, t('admin.leads.failedToDeleteNote')),
        variant: 'destructive'
      })
    } finally {
      setNoteDeletingId(null)
      if (editingNoteId === noteId) {
        setEditingNoteId(null)
        setEditNoteForm({ title: '', body: '' })
      }
    }
  }

  const openDocumentViewer = async (doc: any) => {
    setViewingDocument(doc)
    setShowDocumentViewer(true)
    setViewLoading(false)
    setViewProgress(null)
    
    // For PDFs, fetch as blob with authentication and create object URL for iframe
    if (doc.mimeType === 'application/pdf') {
      try {
        setViewLoading(true)
        const pathParts = doc.path.split(/[\\/]/)
        const relativePath = pathParts.slice(pathParts.indexOf('uploads')).join('/')
        const response = await axios.get(`/api/documents/download/${relativePath}?view=true`, {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob',
          onDownloadProgress: (event) => {
            if (!event.total) return
            setViewProgress({
              loaded: event.loaded,
              total: event.total,
            })
          },
        })
        const blob = new Blob([response.data], { type: 'application/pdf' })
        const url = window.URL.createObjectURL(blob)
        setPdfViewUrl(url)
      } catch (error) {
        console.error('Error loading PDF:', error)
        setPdfViewUrl(null)
      } finally {
        setViewLoading(false)
        // keep viewProgress so user can see 100% for a moment; it will reset on close
      }
    }
  }
  
  // Cleanup blob URL when dialog closes or when URL changes
  useEffect(() => {
    // Cleanup when dialog closes
    if (!showDocumentViewer && pdfViewUrl) {
      window.URL.revokeObjectURL(pdfViewUrl)
      setPdfViewUrl(null)
      setViewProgress(null)
      setViewLoading(false)
    }
    
    // Cleanup function to revoke URL when component unmounts or URL changes
    return () => {
      if (pdfViewUrl) {
        window.URL.revokeObjectURL(pdfViewUrl)
      }
    }
  }, [showDocumentViewer, pdfViewUrl])

  const handleDownloadDocument = async (doc: any) => {
    try {
      // Extract relative path from full path
      const pathParts = doc.path.split(/[\\/]/)
      const relativePath = pathParts.slice(pathParts.indexOf('uploads')).join('/')
      
      const response = await axios.get(`/api/documents/download/${relativePath}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', doc.originalName)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download document',
        variant: 'destructive'
      })
    }
  }

  const getDocumentUrl = (doc: any) => {
    // Extract relative path from full path
    const pathParts = doc.path.split(/[\\/]/)
    const relativePath = pathParts.slice(pathParts.indexOf('uploads')).join('/')
    return `/api/documents/download/${relativePath}`
  }

  const getWhatsAppLink = (phone: string | undefined | null) => {
    if (!phone) return null
    const digitsOnly = phone.replace(/\D+/g, '')
    if (!digitsOnly) return null
    return `https://wa.me/${digitsOnly}`
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return formatNumber(bytes) + ' B'
    if (bytes < 1024 * 1024) return formatNumber((bytes / 1024).toFixed(1)) + ' KB'
    return formatNumber((bytes / (1024 * 1024)).toFixed(1)) + ' MB'
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/pdf') return <FileText className="h-4 w-4 text-red-500" />
    if (mimeType?.startsWith('image/')) return <File className="h-4 w-4 text-blue-500" />
    return <File className="h-4 w-4 text-gray-500 dark:text-gray-400" />
  }

  const openDeleteDialog = (lead: Lead) => {
    setDeletingLead(lead)
    setShowDeleteDialog(true)
  }

  // Leads are already filtered and paginated by the server
  const displayedLeads = leads || []

  const getStatusBadge = (statusName: string | null) => {
    if (!statusName) {
      return <span className="text-xs text-gray-400 dark:text-gray-500">{t('admin.leads.noStatus')}</span>
    }

    const status = leadStatuses.find((s) => s.name === statusName)
    const baseColor = status?.color || '#6366f1'

    return (
      <Badge
        className="text-xs font-medium flex items-center gap-1"
        style={{
          backgroundColor: `${baseColor}20`,
          color: baseColor,
        }}
      >
        <Clock className="h-3 w-3" />
        {statusName}
      </Badge>
    )
  }

  // Stats come from API (real-time accurate counts) - updated on every fetchLeads
  return (
    <AdminPageTemplate
      title={t('admin.sidebar.leadManagement')}
      description={t('admin.leads.description') || 'Manage and track potential clients'}
      icon={<UserPlus className="h-6 w-6" />}
      showConstruction={false}
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatNumber(stats.total)}</div>
            <p className="text-xs text-gray-600 dark:text-gray-300">{t('admin.leads.totalLeads')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatNumber(stats.new)}</div>
            <p className="text-xs text-gray-600 dark:text-gray-300">{t('admin.leads.new')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{formatNumber(stats.contacted)}</div>
            <p className="text-xs text-gray-600 dark:text-gray-300">{t('admin.leads.contacted')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{formatNumber(stats.qualified)}</div>
            <p className="text-xs text-gray-600 dark:text-gray-300">{t('admin.leads.qualified')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatNumber(stats.converted)}</div>
            <p className="text-xs text-gray-600 dark:text-gray-300">{t('admin.leads.convertedStat')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                <Input
                  placeholder={t('admin.leads.searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="relative w-full md:w-48">
              <select
                value={validStatusFilter}
                onChange={(e) => handleStatusFilterChange(e.target.value)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer"
                aria-label={t('admin.leads.filterByStatus')}
              >
                <option value="all">{t('admin.leads.allStatuses')}</option>
                {selectableStatuses.map((status) => (
                  <option key={status.id} value={status.name}>
                    {status.name}
                  </option>
                ))}
              </select>
              <ChevronsUpDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" />
            </div>
            <Button 
              variant={showConverted ? "default" : "outline"}
              onClick={() => setShowConverted(!showConverted)}
            >
              {showConverted ? t('admin.leads.showActiveLeads') : `${t('admin.leads.viewConverted')} (${formatNumber(stats.converted)})`}
            </Button>
            <div className="flex items-center gap-2">
              <Label htmlFor="rowsPerPage" className="text-sm whitespace-nowrap">{t('admin.leads.rows')}:</Label>
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
            <Button onClick={() => {
              setShowCreateDialog(true)
              // Reset form to initial state
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
                status: '',
                source: '',
                notes: '',
                assignedToId: ''
              })
              setCustomBusinessTypeInput('')
              setEmailError('')
            }} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-2" />
              {t('admin.leads.addLead')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-12 text-gray-600 dark:text-gray-300">{t('admin.leads.loadingLeads')}</div>
          ) : searchError ? (
            <div className="text-center py-12 text-red-500">
              {t('admin.leads.errorLoading')}: {searchError}
            </div>
          ) : displayedLeads.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              {search.length >= 3 ? t('admin.leads.noLeadsFound') : t('admin.leads.noLeadsCreateFirst')}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 px-4 font-semibold text-sm text-gray-900 dark:text-gray-100 w-[150px]">{t('admin.leads.table.id')}</th>
                      <th className="text-left py-2 px-4 font-semibold text-sm text-gray-900 dark:text-gray-100 min-w-[130px]">{t('admin.leads.table.name')}</th>
                      <th className="text-left py-2 px-4 font-semibold text-sm text-gray-900 dark:text-gray-100 min-w-[200px]">{t('admin.leads.table.company')}</th>
                      <th className="text-left py-2 px-4 font-semibold text-sm text-gray-900 dark:text-gray-100 w-[120px]">{t('admin.leads.table.phone')}</th>
                      <th className="text-left py-2 px-4 font-semibold text-sm text-gray-900 dark:text-gray-100 w-[150px] min-w-[150px]">{t('admin.leads.table.status')}</th>
                      <th className="text-left py-2 px-4 font-semibold text-sm text-gray-900 dark:text-gray-100 w-[130px] min-w-[130px]">{t('admin.leads.table.created')}</th>
                      <th className="text-right py-2 px-4 font-semibold text-sm text-gray-900 dark:text-gray-100 w-[35px]">{t('admin.leads.table.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedLeads.map((lead, index) => {
                    // Calculate submission order within duplicate group
                    const groupId = lead.duplicateGroupId || lead.id
                    const groupLeads = displayedLeads.filter(l => 
                      (l.duplicateGroupId === groupId) || 
                      (!l.duplicateGroupId && l.id === groupId)
                    )
                    const submissionOrder = groupLeads.findIndex(l => l.id === lead.id) + 1
                    const isDuplicateGroup = groupLeads.length > 1
                    
                      return (
                        <tr 
                          key={lead.id} 
                          className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-muted/50 cursor-pointer"
                          onClick={() => openViewDialog(lead)}
                        >
                          <td className="py-2 px-4 text-sm text-gray-500 dark:text-gray-400 font-mono w-[150px] whitespace-nowrap">
                            {lead.leadNumber}
                          </td>
                          <td className="py-2 px-4">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                            <div>
                              <p className="font-medium text-gray-900 dark:text-gray-100">{lead.fullName}</p>
                              {lead.email && (
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                                  {lead.email}
                                </p>
                              )}
                            </div>
                            {isDuplicateGroup && (
                              <div className="flex items-center gap-1">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                  submissionOrder === 1 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                                  submissionOrder === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' :
                                  'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                                  }`}>
                                    {formatNumber(submissionOrder)}/{formatNumber(groupLeads.length)}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-4">
                          {lead.companyName ? (
                            <div className="flex items-center gap-2">
                              <Building className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                              <span 
                                className="text-sm text-gray-900 dark:text-gray-100 leading-tight"
                                style={{
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  wordBreak: 'break-word'
                                }}
                              >
                                {lead.companyName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">-</span>
                          )}
                        </td>
                        <td className="py-2 px-4">
                          {lead.phone ? (
                            getWhatsAppLink(lead.phone) ? (
                              <a
                                href={getWhatsAppLink(lead.phone)!}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-2 text-sm text-gray-900 dark:text-gray-100 hover:text-emerald-600 dark:hover:text-emerald-400"
                              >
                                <Phone className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                                <span>{lead.phone}</span>
                              </a>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                                <span className="text-sm text-gray-900 dark:text-gray-100">{lead.phone}</span>
                              </div>
                            )
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500 text-sm">-</span>
                          )}
                        </td>
                        <td className="py-2 px-4 w-[150px] min-w-[150px]">
                          {showConverted ? (
                            // In converted leads view, show read-only label (no dropdown)
                            <div className="flex items-center">
                              {getStatusBadge(lead.status)}
                            </div>
                          ) : (
                            <Select 
                              value={lead.status || ''}
                              onValueChange={(value) => handleQuickStatusUpdate(lead.id, value)}
                              disabled={statusUpdating === lead.id}
                            >
                              <SelectTrigger className="w-full h-7" disabled={statusUpdating === lead.id}>
                                <SelectValue>
                                  {statusUpdating === lead.id ? t('admin.leads.updating') : getStatusBadge(lead.status)}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {selectableStatuses.map((status) => (
                                  <SelectItem key={status.id} value={status.name}>
                                    <div className="flex items-center gap-2">
                                      <span
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: status.color }}
                                      />
                                      <span>{status.name}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </td>
                        <td className="py-2 px-4 text-sm text-gray-600 dark:text-gray-300 w-[130px] min-w-[130px]">
                          {format(new Date(lead.createdAt), 'MMM d, yyyy')}
                        </td>
                        <td className="py-2 px-4">
                          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => openViewDialog(lead)}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  {t('admin.leads.view')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => openEditDialog(lead)}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  {t('admin.leads.edit')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => openUploadDialog(lead)}
                                >
                                  <Upload className="mr-2 h-4 w-4" />
                                  {t('admin.leads.uploadDocument')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    openViewDialog(lead)
                                    setShowAddNoteForm(true)
                                  }}
                                >
                                  <FileText className="mr-2 h-4 w-4" />
                                  {t('admin.leads.addNote')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setFollowUpForm({
                                      title: `Reminder for ${lead.fullName}`,
                                      description: '',
                                      date: undefined,
                                      time: '09:00'
                                    })
                                    setViewingLead(lead)
                                    setShowFollowUpDialog(true)
                                  }}
                                >
                                  <Calendar className="mr-2 h-4 w-4" />
                                  {t('admin.leads.followUp')}
                                </DropdownMenuItem>
                                {lead.status !== 'CLOSED_WON' && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleConvertToClient(lead.id)}
                                      className="text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50"
                                    >
                                      <CheckCircle className="mr-2 h-4 w-4" />
                                      {t('admin.leads.convert')}
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => openDeleteDialog(lead)}
                                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  {t('admin.leads.delete')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {rowsPerPage !== 'all' && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {t('admin.leads.showing')} {formatNumber(((currentPage - 1) * (typeof rowsPerPage === 'number' ? rowsPerPage : 25)) + 1)} {t('admin.leads.to')} {formatNumber(Math.min(currentPage * (typeof rowsPerPage === 'number' ? rowsPerPage : 25), pagination.total))} {t('admin.leads.of')} {formatNumber(pagination.total)} {t('admin.leads.leads')}
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
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    {t('admin.leads.page')} {formatNumber(currentPage)} {t('admin.leads.of')} {formatNumber(pagination.totalPages)}
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
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-sm text-gray-600">
                  {t('admin.leads.showingAll')} {formatNumber(pagination.total)} {t('admin.leads.leads')}
                </div>
              </div>
            )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog - Matching Business Consultation Form */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl mb-4">{t('admin.leads.addLead')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }} className="space-y-6">
            {/* Row 1: Full Name, Email, Phone - Matching BC form */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Full Name */}
              <div>
                <Label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-foreground mb-2">
                  {t('contact.form.name')} *
                </Label>
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
                  label={`${t('contact.form.email')} *`}
                  placeholder={t('contact.form.email')}
                  value={formData.email}
                  error={emailError}
                  onChange={(value) => {
                    setFormData(prev => ({ ...prev, email: value }))
                    setEmailError('')
                  }}
                />
              </div>

              {/* Phone Number */}
              <div>
                <Label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-foreground mb-2">
                  {t('contact.form.phone')} *
                </Label>
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
                        <CommandInput placeholder={t('contact.searchCountryCode') || 'Search country code...'} />
                        <CommandList className="max-h-[300px] overflow-y-auto">
                          <CommandEmpty>{t('contact.noCountryFound') || 'No country found.'}</CommandEmpty>
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
                <p className="text-xs text-gray-500 dark:text-muted-foreground mt-1">{t('contact.phonePlaceholder') || 'Enter phone number without country code'}</p>
              </div>
            </div>

            {/* Row 2: Designation, Company Name, Company Type - Matching BC form */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Designation */}
              <div>
                <Label htmlFor="designation" className="block text-sm font-medium text-gray-700 dark:text-foreground mb-2">
                  {t('contact.form.designation')}
                </Label>
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
                <Label htmlFor="companyName" className="block text-sm font-medium text-gray-700 dark:text-foreground mb-2">
                  {t('contact.form.company')}
                </Label>
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
                <Label htmlFor="companyType" className="block text-sm font-medium text-gray-700 dark:text-foreground mb-2">
                  {t('contact.form.companyType')}
                </Label>
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

            {/* Row 3: Country, City, How did you hear about us - Optional */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Country */}
              <div>
                <Label htmlFor="country" className="block text-sm font-medium text-gray-700 dark:text-foreground mb-2">
                  {t('contact.form.country')}
                </Label>
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
                          {formData.country || t('contact.selectCountry') || 'Select country...'}
                        </span>
                      </div>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command shouldFilter={true}>
                      <CommandInput placeholder={t('contact.searchCountry') || 'Search country...'} />
                      <CommandList className="max-h-[300px] overflow-y-auto">
                        <CommandEmpty>{t('contact.noCountryFound') || 'No country found.'}</CommandEmpty>
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
                <Label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-foreground mb-2">
                  {t('contact.form.city')}
                </Label>
                <Input
                  id="city"
                  type="text"
                  placeholder={t('contact.form.city')}
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  className="w-full p-3"
                />
              </div>

              {/* How did you hear about us? */}
              <div>
                <Label htmlFor="howDidYouHear" className="block text-sm font-medium text-gray-700 dark:text-foreground mb-2">
                  {t('contact.form.howHear')}
                </Label>
                <Select value={formData.howDidYouHear} onValueChange={(value) => setFormData(prev => ({ ...prev, howDidYouHear: value }))}>
                  <SelectTrigger className="w-full p-3 dark:bg-input/30">
                    <SelectValue placeholder={t('contact.selectOption') || 'Select option...'} />
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

            {/* Row 4: Nature of Business and Business Types - Matching BC form */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Nature of Business */}
              <div>
                <Label htmlFor="natureOfBusiness" className="block text-sm font-medium text-gray-700 dark:text-foreground mb-2">
                  {t('contact.form.nature')}
                </Label>
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
                      <SelectValue placeholder={t('contact.form.selectType') || 'Select a business type to add'} />
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
                          {t('contact.form.allAdded') || 'All common types have been added'}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom Business Type Input */}
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder={t('contact.form.addBusinessType') || 'Add Business Type'}
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

            {/* Admin-only fields: Status, Source, Assigned To, Notes */}
            <div className="grid md:grid-cols-2 gap-6 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectableStatuses.map((status) => (
                      <SelectItem key={status.id} value={status.name}>
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: status.color }}
                          />
                          <span>{status.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <Input
                  id="source"
                  value={formData.source}
                  onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value }))}
                  placeholder="Website, Referral, etc."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignedTo">Assign To</Label>
                <Select value={formData.assignedToId} onValueChange={(value) => setFormData(prev => ({ ...prev, assignedToId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a team member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {managers.map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.name} ({manager.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes about this lead..."
                  rows={3}
                />
              </div>
            </div>

            {/* Error Message */}
            {emailError && (
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-800/50">
                {emailError}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowCreateDialog(false)
                setEmailError('')
                setCustomBusinessTypeInput('')
              }} disabled={creating}>
                {t('admin.leads.cancel')}
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? t('admin.leads.creating') : t('admin.leads.createLead')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('admin.leads.editLead')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-fullName">{t('admin.leads.fullName')} *</Label>
              <Input
                id="edit-fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>
            <EmailInput
              id="edit-email"
              label={`${t('admin.leads.email')} *`}
              value={formData.email}
              onChange={(value) => setFormData({ ...formData, email: value })}
              required
            />
            <div className="space-y-2">
              <Label htmlFor="edit-phone">{t('admin.leads.phone')}</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-companyName">{t('admin.leads.companyName')}</Label>
              <Input
                id="edit-companyName"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-companyType">{t('admin.leads.companyType')}</Label>
              <Input
                id="edit-companyType"
                value={formData.companyType}
                onChange={(e) => setFormData({ ...formData, companyType: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-designation">{t('admin.leads.designation')}</Label>
              <Input
                id="edit-designation"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-country">{t('admin.leads.country')}</Label>
              <Popover open={editCountryDropdownOpen} onOpenChange={setEditCountryDropdownOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={editCountryDropdownOpen}
                    className="w-full justify-between"
                  >
                    <span className="text-sm whitespace-nowrap overflow-hidden text-ellipsis">
                      {formData.country || t('admin.leads.selectCountry')}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command shouldFilter={true}>
                    <CommandInput placeholder={t('admin.leads.searchCountry')} />
                    <CommandList className="max-h-[300px] overflow-y-auto">
                      <CommandEmpty>{t('admin.leads.noCountryFound')}</CommandEmpty>
                      <CommandGroup>
                        {countriesList.map((country) => (
                          <CommandItem
                            key={country.name}
                            value={country.name}
                            onSelect={() => {
                              setFormData({ ...formData, country: country.name })
                              setEditCountryDropdownOpen(false)
                            }}
                            className="cursor-pointer"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4 shrink-0",
                                formData.country === country.name ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span className="text-sm">{country.name}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-city">{t('admin.leads.city')}</Label>
              <Input
                id="edit-city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="edit-natureOfBusiness">{t('admin.leads.natureOfBusiness')}</Label>
              <Textarea
                id="edit-natureOfBusiness"
                value={formData.natureOfBusiness}
                onChange={(e) => setFormData({ ...formData, natureOfBusiness: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-howDidYouHear">{t('admin.leads.howDidYouHear')}</Label>
              <Input
                id="edit-howDidYouHear"
                value={formData.howDidYouHear}
                onChange={(e) => setFormData({ ...formData, howDidYouHear: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-businessTypes">{t('admin.leads.businessTypes')} (JSON)</Label>
              <Input
                id="edit-businessTypes"
                value={formData.businessTypes}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value)
                    if (Array.isArray(parsed)) {
                      setFormData({ ...formData, businessTypes: parsed })
                    }
                  } catch {
                    // If not valid JSON, treat as empty array
                    setFormData({ ...formData, businessTypes: [] })
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">{t('admin.leads.status')}</Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('admin.leads.selectStatus')} />
                </SelectTrigger>
                <SelectContent>
                  {selectableStatuses.map((status) => (
                    <SelectItem key={status.id} value={status.name}>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: status.color }}
                        />
                        <span>{status.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-source">{t('admin.leads.source')}</Label>
              <Input
                id="edit-source"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="edit-assignedTo">{t('admin.leads.assignedTo')}</Label>
              <Select value={formData.assignedToId || 'none'} onValueChange={(value) => setFormData({ ...formData, assignedToId: value === 'none' ? '' : value })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('admin.leads.selectTeamMember')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('admin.leads.unassigned')}</SelectItem>
                  {managers.map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.name} ({manager.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="edit-notes">{t('admin.leads.notes')}</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t('admin.leads.additionalNotes')}
                rows={3}
              />
            </div>
            
            {/* Convert to Client Section */}
            <div className="space-y-4 col-span-2 pt-4 border-t">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="convertToClient"
                  checked={convertToClient}
                  onChange={(e) => setConvertToClient(e.target.checked)}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                />
                <Label htmlFor="convertToClient" className="font-semibold text-emerald-700 cursor-pointer">
                  {t('admin.leads.convertToClient')}
                </Label>
              </div>
              
              {convertToClient && (
                <div className="p-4 bg-emerald-50 rounded-lg">
                  <p className="text-sm text-emerald-700">
                    A client account will be created and login credentials will be sent to the lead&apos;s email automatically.
                  </p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={updating}>{t('admin.leads.cancel')}</Button>
            <Button onClick={handleUpdate} disabled={updating}>
              {updating ? (convertToClient ? t('admin.leads.converting') : t('admin.leads.updatingLead')) : (convertToClient ? t('admin.leads.convertToClient') : t('admin.leads.updateLead'))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        {/* Make the view dialog 80% of viewport width; override Radix defaults */}
        <DialogContent className="!w-[60vw] !max-w-none max-h-[90vh] overflow-y-auto bg-background text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <User className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              {t('admin.leads.leadDetails')} - {viewingLead?.fullName}
            </DialogTitle>
          </DialogHeader>
          {viewingLead && (
            <div className="space-y-6 py-4">
              {/* Status and Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50 p-4 rounded-lg border border-transparent dark:border-emerald-800/50">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <Label className="text-emerald-700 dark:text-emerald-300 font-semibold">{t('admin.leads.status')}</Label>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    {getStatusBadge(viewingLead.status)}
                    {(() => {
                      // Calculate submission order within duplicate group using same logic as table
                      const groupId = viewingLead.duplicateGroupId || viewingLead.id
                      const groupLeads = displayedLeads.filter(l => 
                        (l.duplicateGroupId === groupId) || 
                        (!l.duplicateGroupId && l.id === groupId)
                      )
                      const submissionOrder = groupLeads.findIndex(l => l.id === viewingLead.id) + 1
                      const isDuplicateGroup = groupLeads.length > 1
                      
                      return isDuplicateGroup ? (
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          submissionOrder === 1 ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' :
                          submissionOrder === 2 ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300' :
                          'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
                        }`}>
                          {submissionOrder}/{groupLeads.length}
                        </div>
                      ) : null
                    })()}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50 p-4 rounded-lg border border-transparent dark:border-blue-800/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Building className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <Label className="text-blue-700 dark:text-blue-300 font-semibold">{t('admin.leads.table.company')}</Label>
                  </div>
                  <p className="font-medium text-foreground">{viewingLead.companyName || t('admin.leads.notSpecified')}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50 p-4 rounded-lg border border-transparent dark:border-purple-800/50">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <Label className="text-purple-700 dark:text-purple-300 font-semibold">{t('admin.leads.assignedTo')}</Label>
                  </div>
                  <p className="font-medium text-foreground">{viewingLead.assignedTo?.name || t('admin.leads.unassigned')}</p>
                </div>
              </div>

              {/* Duplicate Information */}
              {(() => {
                // Calculate current duplicate count from displayed leads, not from stored duplicateCount
                const groupId = viewingLead.duplicateGroupId || viewingLead.id
                const groupLeads = displayedLeads.filter(l => 
                  (l.duplicateGroupId === groupId) || 
                  (!l.duplicateGroupId && l.id === groupId)
                )
                const currentDuplicateCount = groupLeads.length
                
                // Only show if there are actually duplicates (more than 1 lead in the group)
                if (currentDuplicateCount > 1) {
                  return (
                    <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200">{t('admin.leads.duplicateInformation')}</h3>
                      </div>
                      <div className="text-sm text-amber-700 dark:text-amber-300">
                        <p>{t('admin.leads.duplicateCount').replace('{count}', formatNumber(currentDuplicateCount - 1))}</p>
                        <p className="mt-1">{t('admin.leads.duplicatesGrouped')}</p>
                      </div>
                    </div>
                  )
                }
                return null
              })()}

              {/* Personal Information */}
              <div className="bg-white dark:bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-foreground mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-gray-600 dark:text-muted-foreground" />
                  {t('admin.leads.personalInformation')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-600 dark:text-muted-foreground text-sm">{t('admin.leads.fullName')}</Label>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 dark:text-foreground">{viewingLead.fullName}</p>
                      {(() => {
                        // Calculate submission order within duplicate group using same logic as table
                        const groupId = viewingLead.duplicateGroupId || viewingLead.id
                        const groupLeads = displayedLeads.filter(l => 
                          (l.duplicateGroupId === groupId) || 
                          (!l.duplicateGroupId && l.id === groupId)
                        )
                        const submissionOrder = groupLeads.findIndex(l => l.id === viewingLead.id) + 1
                        const isDuplicateGroup = groupLeads.length > 1
                        
                        return isDuplicateGroup ? (
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            submissionOrder === 1 ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' :
                            submissionOrder === 2 ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300' :
                            'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
                          }`}>
                            {submissionOrder}/{groupLeads.length}
                          </div>
                        ) : null
                      })()}
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-600 dark:text-muted-foreground text-sm">{t('admin.leads.email')}</Label>
                    <p className="text-gray-900 dark:text-foreground">{viewingLead.email}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600 dark:text-muted-foreground text-sm">{t('admin.leads.phone')}</Label>
                    <p className="text-gray-900 dark:text-foreground">{viewingLead.phone || t('admin.leads.notProvided')}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600 dark:text-muted-foreground text-sm">{t('admin.leads.designation')}</Label>
                    <p className="text-gray-900 dark:text-foreground">{viewingLead.designation || t('admin.leads.notSpecified')}</p>
                  </div>
                </div>
              </div>

              {/* Company Information */}
              <div className="bg-white dark:bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-foreground mb-4 flex items-center gap-2">
                  <Building className="h-5 w-5 text-gray-600 dark:text-muted-foreground" />
                  {t('admin.leads.companyInformation')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-600 dark:text-muted-foreground text-sm">{t('admin.leads.companyName')}</Label>
                    <p className="font-medium text-gray-900 dark:text-foreground">{viewingLead.companyName || t('admin.leads.notSpecified')}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600 dark:text-muted-foreground text-sm">{t('admin.leads.companyType')}</Label>
                    <p className="text-gray-900 dark:text-foreground">{viewingLead.companyType || t('admin.leads.notSpecified')}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600 dark:text-muted-foreground text-sm">{t('admin.leads.country')}</Label>
                    <p className="text-gray-900 dark:text-foreground">{viewingLead.country || t('admin.leads.notSpecified')}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600 dark:text-muted-foreground text-sm">{t('admin.leads.city')}</Label>
                    <p className="text-gray-900 dark:text-foreground">{viewingLead.city || t('admin.leads.notSpecified')}</p>
                  </div>
                </div>
                {viewingLead.natureOfBusiness && (
                  <div className="mt-4">
                    <Label className="text-gray-600 dark:text-muted-foreground text-sm">{t('admin.leads.natureOfBusiness')}</Label>
                    <p className="text-gray-900 dark:text-foreground mt-1 bg-gray-50 dark:bg-muted p-3 rounded-lg">{viewingLead.natureOfBusiness}</p>
                  </div>
                )}
              </div>

              {/* Business Types */}
              {viewingLead.businessTypes && (() => {
                // Safely parse businessTypes - handle JSON, comma-separated strings, or plain strings
                let businessTypesArray: string[] = []
                try {
                  const parsed = JSON.parse(viewingLead.businessTypes)
                  if (Array.isArray(parsed)) {
                    businessTypesArray = parsed
                  } else if (typeof parsed === 'string') {
                    businessTypesArray = [parsed]
                  }
                } catch {
                  // If JSON parsing fails, treat as comma-separated string or single string
                  if (viewingLead.businessTypes.includes(',')) {
                    businessTypesArray = viewingLead.businessTypes.split(',').map(t => t.trim()).filter(Boolean)
                  } else {
                    businessTypesArray = [viewingLead.businessTypes.trim()].filter(Boolean)
                  }
                }
                
                return businessTypesArray.length > 0 ? (
                  <div className="bg-white dark:bg-card border border-border rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-foreground mb-4 flex items-center gap-2">
                      <Building className="h-5 w-5 text-gray-600 dark:text-muted-foreground" />
                      {t('admin.leads.businessTypes')}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {businessTypesArray.map((type: string, index: number) => (
                        <span key={index} className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 px-3 py-1 rounded-full text-sm">
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null
              })()}

              {/* Lead Source Information */}
              <div className="bg-white dark:bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-foreground mb-4 flex items-center gap-2">
                  <Mail className="h-5 w-5 text-gray-600 dark:text-muted-foreground" />
                  {t('admin.leads.leadSource')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-600 dark:text-muted-foreground text-sm">{t('admin.leads.howDidYouHear')}</Label>
                    <p className="text-gray-900 dark:text-foreground">{viewingLead.howDidYouHear || t('admin.leads.notSpecified')}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600 dark:text-muted-foreground text-sm">{t('admin.leads.source')}</Label>
                    <p className="text-gray-900 dark:text-foreground">{viewingLead.source || t('admin.leads.notSpecified')}</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {viewingLead.notes && (
                <div className="bg-white dark:bg-card border border-border rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-foreground mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-gray-600 dark:text-muted-foreground" />
                    {t('admin.leads.notes')}
                  </h3>
                  <p className="text-gray-900 dark:text-foreground bg-gray-50 dark:bg-muted p-4 rounded-lg whitespace-pre-wrap">{viewingLead.notes}</p>
                </div>
              )}

              {/* Documents Section */}
              <div className="bg-white dark:bg-card border border-border rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-foreground flex items-center gap-2">
                    <FileText className="h-5 w-5 text-gray-600 dark:text-muted-foreground" />
                    {t('admin.leads.documents')} ({formatNumber(leadDocuments[viewingLead.id]?.length || 0)})
                  </h3>
                </div>

                {/* Documents List */}
                {leadDocuments[viewingLead.id] && leadDocuments[viewingLead.id].length > 0 ? (
                  <div className="space-y-2">
                    {leadDocuments[viewingLead.id].map((doc) => (
                      <div 
                        key={doc.id} 
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-muted rounded-lg border border-border cursor-pointer hover:bg-gray-100 dark:hover:bg-muted/80 transition-colors"
                        onClick={() => openDocumentViewer(doc)}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {getFileIcon(doc.mimeType)}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 dark:text-foreground">{doc.name || doc.originalName}</div>
                            {doc.description && (
                              <div className="text-sm text-gray-500 dark:text-muted-foreground truncate">{doc.description}</div>
                            )}
                            <div className="text-xs text-gray-400 dark:text-muted-foreground mt-1">
                              {formatFileSize(doc.size)} • {format(new Date(doc.createdAt), 'MMM dd, yyyy')}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownloadDocument(doc)
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          {t('admin.leads.downloadDocument')}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-muted-foreground">
                    {t('admin.leads.noDocuments')}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="bg-white dark:bg-card border border-border rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-foreground">
                    {t('admin.leads.notesSection')}
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500 dark:text-muted-foreground">
                      {formatNumber(activeLeadNotes.length)} {activeLeadNotes.length === 1 ? t('admin.leads.addNote').toLowerCase() : t('admin.leads.addNote').toLowerCase() + 's'}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddNoteForm((prev) => !prev)}
                    >
                      {showAddNoteForm ? t('common.close') : t('admin.leads.addNote')}
                    </Button>
                  </div>
                </div>
                {showAddNoteForm && (
                  <div className="space-y-4 mb-6">
                    <div>
                      <Label htmlFor="note-title">{t('admin.leads.noteTitle')} *</Label>
                      <Input
                        id="note-title"
                        value={noteForm.title}
                        onChange={(e) => setNoteForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder={t('admin.leads.noteTitle')}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="note-body">{t('admin.leads.noteBody')} *</Label>
                      <Textarea
                        id="note-body"
                        value={noteForm.body}
                        onChange={(e) => setNoteForm(prev => ({ ...prev, body: e.target.value }))}
                        placeholder={t('admin.leads.noteBody')}
                        rows={4}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        onClick={handleAddNote}
                        disabled={noteSubmitting || !noteForm.title.trim() || !noteForm.body.trim()}
                      >
                        {noteSubmitting ? t('admin.leads.addingNote') : t('admin.leads.addNoteButton')}
                      </Button>
                    </div>
                  </div>
                )}
                <div className="space-y-3">
                  {notesLoading ? (
                    <div className="flex items-center justify-center py-6 text-gray-500 dark:text-muted-foreground">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('common.loading')}
                    </div>
                  ) : activeLeadNotes.length ? (
                    activeLeadNotes.map(note => (
                      <div key={note.id} className="border border-border rounded-lg p-4 bg-gray-50 dark:bg-muted">
                        {editingNoteId === note.id ? (
                          <div className="space-y-3">
                            <Input
                              value={editNoteForm.title}
                              onChange={(e) => setEditNoteForm(prev => ({ ...prev, title: e.target.value }))}
                              placeholder={t('admin.leads.noteTitle')}
                            />
                            <Textarea
                              value={editNoteForm.body}
                              onChange={(e) => setEditNoteForm(prev => ({ ...prev, body: e.target.value }))}
                              rows={4}
                              placeholder={t('admin.leads.noteBody')}
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                onClick={handleCancelEditNote}
                                disabled={noteUpdatingId === note.id}
                              >
                                {t('admin.leads.cancelEdit')}
                              </Button>
                              <Button
                                onClick={() => handleUpdateNote(note.id)}
                                disabled={
                                  noteUpdatingId === note.id ||
                                  !editNoteForm.title.trim() ||
                                  !editNoteForm.body.trim()
                                }
                              >
                                {noteUpdatingId === note.id ? t('admin.leads.updatingNote') : t('admin.leads.updateNote')}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-foreground">{note.title}</p>
                                <p className="text-sm text-gray-700 dark:text-muted-foreground whitespace-pre-line mt-1">
                                  {note.body}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleStartEditNote(note)}
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  {t('admin.leads.edit')}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => handleDeleteNote(note.id)}
                                  disabled={noteDeletingId === note.id}
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  {noteDeletingId === note.id ? t('admin.leads.deletingNote') : t('admin.leads.deleteNote')}
                                </Button>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-muted-foreground">
                              {t('common.added')} {format(new Date(note.createdAt), 'MMM dd, yyyy h:mm a')}
                              {note.createdBy?.name && ` • ${t('common.by')} ${note.createdBy.name}`}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-sm text-gray-500 dark:text-muted-foreground py-4">
                      {t('admin.leads.noNotes')}
                    </div>
                  )}
                </div>
              </div>

              {/* Timestamps */}
              <div className="bg-gray-50 dark:bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-foreground mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-gray-600 dark:text-muted-foreground" />
                  {t('admin.leads.timeline')}
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-600 dark:text-muted-foreground text-sm">{t('admin.leads.createdAt')}</Label>
                      <p className="text-gray-900 dark:text-foreground">{format(new Date(viewingLead.createdAt), 'MMM d, yyyy h:mm a')}</p>
                    </div>
                    <div>
                      <Label className="text-gray-600 dark:text-muted-foreground text-sm">{t('admin.leads.updatedAt')}</Label>
                      <p className="text-gray-900 dark:text-foreground">{format(new Date(viewingLead.updatedAt), 'MMM d, yyyy h:mm a')}</p>
                    </div>
                  </div>
                  
                  {/* Follow-ups: Upcoming + Past history */}
                  {leadFollowUps[viewingLead.id] && leadFollowUps[viewingLead.id].length > 0 && (() => {
                    const now = new Date()
                    const all = leadFollowUps[viewingLead.id] as any[]
                    const upcomingFollowUps = all.filter((f: any) => new Date(f.scheduledAt) > now).sort((a: any, b: any) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
                    const pastFollowUps = all.filter((f: any) => new Date(f.scheduledAt) <= now).sort((a: any, b: any) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
                    const formatGoogleDate = (date: Date) => {
                      const year = date.getUTCFullYear()
                      const month = String(date.getUTCMonth() + 1).padStart(2, '0')
                      const day = String(date.getUTCDate()).padStart(2, '0')
                      const hours = String(date.getUTCHours()).padStart(2, '0')
                      const minutes = String(date.getUTCMinutes()).padStart(2, '0')
                      const seconds = String(date.getUTCSeconds()).padStart(2, '0')
                      return `${year}${month}${day}T${hours}${minutes}${seconds}Z`
                    }
                    return (
                      <div className="mt-6 pt-4 border-t border-border space-y-6">
                        {/* Upcoming */}
                        <div>
                          <Label className="text-gray-600 dark:text-muted-foreground text-sm mb-3 block">{t('admin.leads.upcomingFollowUps') || 'Upcoming follow-ups'}</Label>
                          {upcomingFollowUps.length > 0 ? (
                            <div className="space-y-3">
                              {upcomingFollowUps.map((followUp: any) => {
                                const scheduledDate = new Date(followUp.scheduledAt)
                                const endDate = new Date(scheduledDate.getTime() + 60 * 60 * 1000)
                                void viewDialogClockTick
                                const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(followUp.title)}&dates=${formatGoogleDate(scheduledDate)}/${formatGoogleDate(endDate)}&details=${encodeURIComponent(followUp.description)}`
                                return (
                                  <div key={followUp.id} className="bg-white dark:bg-muted border border-border rounded-lg p-4 relative">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive"
                                      onClick={() => handleCancelFollowUp(viewingLead.id, followUp.id)}
                                      disabled={followUpDeletingId === followUp.id}
                                      aria-label={t('common.cancel') || 'Cancel follow-up'}
                                    >
                                      {followUpDeletingId === followUp.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                                    </Button>
                                    <div className="flex items-start justify-between gap-4 pr-10">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                          <p className="font-medium text-gray-900 dark:text-foreground">{followUp.title}</p>
                                        </div>
                                        {followUp.description ? <p className="text-sm text-gray-700 dark:text-muted-foreground mb-2">{followUp.description}</p> : null}
                                        <p className="text-xs text-gray-500 dark:text-muted-foreground">{t('admin.leads.scheduledFor')}: {format(scheduledDate, 'MMM d, yyyy h:mm a')}</p>
                                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          {getReminderDueText(followUp)}
                                        </p>
                                      </div>
                                      <a href={googleCalendarUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm font-medium whitespace-nowrap">
                                        {t('admin.leads.addToGoogleCalendar') || 'Add to Google Calendar'}
                                      </a>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">{t('admin.leads.noUpcomingFollowUps') || 'No upcoming follow-ups'}</p>
                          )}
                        </div>
                        {/* Past follow-ups (mini history) */}
                        {pastFollowUps.length > 0 && (
                          <div>
                            <Label className="text-gray-600 dark:text-muted-foreground text-sm mb-3 block">{t('admin.leads.pastFollowUps') || 'Past follow-ups'}</Label>
                            <div className="space-y-2">
                              {pastFollowUps.map((followUp: any) => {
                                const scheduledDate = new Date(followUp.scheduledAt)
                                return (
                                  <div key={followUp.id} className="bg-muted/50 dark:bg-muted/30 border border-border rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                      <p className="font-medium text-sm text-gray-900 dark:text-foreground">{followUp.title}</p>
                                    </div>
                                    {followUp.description ? <p className="text-xs text-gray-600 dark:text-muted-foreground mb-1 line-clamp-2">{followUp.description}</p> : null}
                                    <p className="text-xs text-muted-foreground">
                                      {t('admin.leads.wasScheduledFor') || 'Was scheduled for'}: {format(scheduledDate, 'MMM d, yyyy h:mm a')}
                                      {followUp.reminderSentAt ? ` · ${t('admin.leads.reminderSent') || 'Reminder sent'}` : ''}
                                    </p>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                  {(!leadFollowUps[viewingLead.id] || leadFollowUps[viewingLead.id].length === 0) && (
                    <div className="text-center text-sm text-gray-500 dark:text-muted-foreground py-4">
                      {t('admin.leads.noFollowUps')}
                    </div>
                  )}
                </div>
              </div>

              <EntityActivityPanel
                entityType="Lead"
                entityId={viewingLead.id}
                title="Lead Activity"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>{t('admin.leads.close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.leads.deleteLead')}</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">
            {t('admin.leads.deleteLeadConfirm')} <strong>{deletingLead?.fullName}</strong>? {t('admin.leads.deleteLeadConfirmDesc')}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={deleting}>{t('admin.leads.cancel')}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? t('admin.leads.deleting') : t('admin.leads.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Follow Up Dialog */}
      <Dialog open={showFollowUpDialog} onOpenChange={setShowFollowUpDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('admin.leads.scheduleFollowUp')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="followup-title">{t('admin.leads.followUpTitle')} *</Label>
              <Input
                id="followup-title"
                value={followUpForm.title}
                onChange={(e) => setFollowUpForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder={viewingLead ? (t('admin.leads.followUpTitlePlaceholder') || 'Reminder for {name}').replace('{name}', viewingLead.fullName) : (t('admin.leads.followUpTitle') || 'Follow-up title')}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="followup-description">{t('admin.leads.followUpDescription')}</Label>
              <Textarea
                id="followup-description"
                value={followUpForm.description}
                onChange={(e) => setFollowUpForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t('admin.leads.followUpDescription')}
                rows={4}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date & Time *</Label>
                <div className="mt-1">
                  <Popover
                    open={dateTimePopoverOpen}
                    onOpenChange={(open) => {
                      setDateTimePopoverOpen(open)
                      if (open) {
                        setPendingDate(followUpForm.date)
                        setPendingTime(followUpForm.time || '09:00')
                      }
                    }}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal gap-2",
                          !followUpForm.date && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="h-4 w-4 shrink-0" />
                        <Clock className="h-4 w-4 shrink-0" />
                        {followUpForm.date && followUpForm.time ? (
                          <span>{format(followUpForm.date, "PPP")} at {formatTime12h(followUpForm.time)}</span>
                        ) : (
                          <span>Pick date and time</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-lg" align="start" sideOffset={8}>
                      <div className="flex flex-col sm:flex-row border-b border-border/50">
                        <section className="border-b sm:border-b-0 sm:border-r border-border/50 p-2">
                          <p className="text-xs font-medium text-muted-foreground px-2 py-1">Date</p>
                          <CalendarComponent
                            mode="single"
                            selected={pendingDate}
                            onSelect={(date) => setPendingDate(date ?? undefined)}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            initialFocus
                          />
                        </section>
                        <section className="p-2 flex flex-col">
                          <p className="text-xs font-medium text-muted-foreground px-2 py-1">Time</p>
                          <div className={cn(!pendingDate && 'pointer-events-none opacity-50')}>
                            <TimePicker
                              value={pendingTime}
                              onChange={setPendingTime}
                            />
                          </div>
                        </section>
                      </div>
                      <div className="p-2 border-t border-border/50 flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            if (pendingDate) {
                              setFollowUpForm(prev => ({
                                ...prev,
                                date: pendingDate,
                                time: pendingTime,
                              }))
                              setDateTimePopoverOpen(false)
                            }
                          }}
                          disabled={!pendingDate}
                        >
                          Set
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="flex items-end">
                {followUpForm.date && (
                  <div className="w-full p-3 bg-gray-50 rounded-md border">
                    <p className="text-sm font-medium text-gray-900 mb-1">Scheduled for:</p>
                    <p className="text-sm text-gray-600">
                      {format(followUpForm.date, "EEEE, MMMM d, yyyy")}
                    </p>
                    <p className="text-sm text-gray-600">
                      at {formatTime12h(followUpForm.time)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => setShowFollowUpDialog(false)} disabled={followUpSubmitting}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={openAddToGoogleCalendar}
              disabled={!followUpForm.date || !followUpForm.time}
              className="gap-2"
            >
              <Calendar className="h-4 w-4" />
              {t('admin.leads.addToGoogleCalendar') || 'Add to Google Calendar'}
            </Button>
            <Button
              type="button"
              onClick={handleAddFollowUp}
              disabled={followUpSubmitting || !followUpForm.title.trim() || !followUpForm.date || !followUpForm.time}
              className="bg-emerald-600 hover:bg-emerald-700 gap-2"
            >
              {followUpSubmitting ? (t('common.saving') || 'Saving...') : (
                <>
                  <Calendar className="h-4 w-4" />
                  {t('admin.leads.scheduleButton') || 'Schedule'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert Lead Dialog */}
      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Convert Lead to Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-600">
              This will create a client account for this lead. Login credentials will be sent via email automatically.
            </p>
            <div className="space-y-2">
              <Label htmlFor="convert-email">Email (optional override)</Label>
              <Input
                id="convert-email"
                type="email"
                value={convertEmail}
                onChange={(e) => setConvertEmail(e.target.value)}
                placeholder="Leave blank to use lead email"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConvertDialog(false)}
              disabled={isConverting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConvertSubmit}
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={isConverting}
            >
              {isConverting ? 'Converting...' : 'Convert to Client'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Document Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="upload-doc-file">{t('common.file')} *</Label>
              <Input
                id="upload-doc-file"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null
                  setUploadForm(prev => ({ ...prev, file }))
                }}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">PDF, PNG, or JPG only. Max 10MB.</p>
            </div>
            <div>
              <Label htmlFor="upload-doc-name">Name *</Label>
              <Input
                id="upload-doc-name"
                value={uploadForm.name}
                onChange={(e) => setUploadForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Document name"
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="upload-doc-description">Description (Optional)</Label>
              <Textarea
                id="upload-doc-description"
                value={uploadForm.description}
                onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Document description"
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col items-stretch gap-3">
            {uploadingDocument && uploadProgress && uploadProgress.total > 0 && (
              <div className="w-full space-y-1">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>{t('admin.leads.uploading')}</span>
                  <span>
                    {formatNumber(Math.round((uploadProgress.loaded / uploadProgress.total) * 100))}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2 rounded-full transition-all"
                    style={{ width: `${(uploadProgress.loaded / uploadProgress.total) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500">
                  {formatFileSize(uploadProgress.loaded)} / {formatFileSize(uploadProgress.total)}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 w-full">
              <Button variant="outline" onClick={() => setShowUploadDialog(false)} disabled={uploadingDocument}>
                {t('admin.leads.cancel')}
              </Button>
              <Button
                onClick={handleUploadDocument}
                disabled={uploadingDocument || !uploadForm.file || !uploadForm.name || uploadForm.name.trim() === ''}
              >
                {uploadingDocument ? (
                  <>{t('admin.leads.uploading')}</>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    {t('admin.leads.uploadDocument')}
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Viewer Dialog */}
      <Dialog open={showDocumentViewer} onOpenChange={setShowDocumentViewer}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-3">
                {viewingDocument && getFileIcon(viewingDocument.mimeType)}
                <span>{viewingDocument?.name || viewingDocument?.originalName}</span>
              </DialogTitle>
              <div className="flex items-center gap-2">
                {viewingDocument && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadDocument(viewingDocument)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {t('admin.leads.downloadDocument')}
                  </Button>
                )}
              </div>
            </div>
            {viewingDocument?.description && (
              <p className="text-sm text-gray-600 mt-2">{viewingDocument.description}</p>
            )}
          </DialogHeader>
          <div className="flex-1 overflow-auto p-6 bg-gray-50 flex flex-col items-center justify-center gap-4">
            {viewLoading && (
              <div className="w-full max-w-xl space-y-2">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>{t('admin.leads.loadingDocument')}</span>
                  {viewProgress && viewProgress.total > 0 && (
                    <span>{formatNumber(Math.round((viewProgress.loaded / viewProgress.total) * 100))}%</span>
                  )}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2 rounded-full transition-all"
                    style={{
                      width:
                        viewProgress && viewProgress.total > 0
                          ? `${(viewProgress.loaded / viewProgress.total) * 100}%`
                          : '30%',
                    }}
                  />
                </div>
                {viewProgress && viewProgress.total > 0 && (
                  <div className="text-xs text-gray-500">
                    {formatFileSize(viewProgress.loaded)} / {formatFileSize(viewProgress.total)}
                  </div>
                )}
              </div>
            )}

            {viewingDocument && (
              <>
                {viewingDocument.mimeType === 'application/pdf' ? (
                  pdfViewUrl ? (
                    <iframe
                      src={`${pdfViewUrl}#toolbar=1`}
                      className="w-full h-full min-h-[600px] border-0 rounded-lg"
                      title={viewingDocument.name || viewingDocument.originalName}
                    />
                  ) : !viewLoading ? (
                    <div className="text-center py-12">
                      <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">{t('admin.leads.unableToLoadPreview') || 'Unable to load PDF preview.'}</p>
                    </div>
                  ) : null
                ) : viewingDocument.mimeType?.startsWith('image/') ? (
                  <img
                    src={`${getDocumentUrl(viewingDocument)}?view=true`}
                    alt={viewingDocument.name || viewingDocument.originalName}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                    style={{ maxHeight: 'calc(90vh - 200px)' }}
                  />
                ) : (
                  <div className="text-center py-12">
                    <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">{t('admin.leads.previewNotAvailable') || 'Preview not available for this file type'}</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => handleDownloadDocument(viewingDocument)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {t('admin.leads.downloadToView') || 'Download to view'}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter className="px-6 py-4 border-t bg-white">
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-gray-500">
                {viewingDocument && (
                  <>
                    {formatFileSize(viewingDocument.size)} • {t('common.uploaded')} {format(new Date(viewingDocument.createdAt), 'MMM dd, yyyy')}
                    {viewingDocument.uploadedBy && ` • ${t('admin.leads.by')} ${viewingDocument.uploadedBy.name}`}
                  </>
                )}
              </div>
              <Button variant="outline" onClick={() => setShowDocumentViewer(false)}>
                {t('admin.leads.close')}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageTemplate>
  )
}

