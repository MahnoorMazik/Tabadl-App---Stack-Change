'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { useMobileSidebar } from '@/hooks/use-mobile-sidebar'
import { MobileLayout } from '@/lib/mobile-layout-utils'
import {
  User, Phone, Building, Upload, CheckCircle, AlertCircle, Loader2, FileText, Package,
} from 'lucide-react'

interface Requirement {
  id: string
  code: string
  name: string
  description: string | null
  inputType: 'DOCUMENT' | 'CONTACT_FIELD'
  isRequired: boolean
  status: string
  documentId: string | null
}

interface ProfileData {
  client: {
    id: string
    name: string
    email: string
    phone: string | null
    company: string | null
    profileCompletionStatus: string
    profileCompletedAt: string | null
    servicePackageId: string | null
  }
  profileCompletion: {
    status: string
    isComplete: boolean
    completedCount: number
    requiredCount: number
    missingFields: string[]
    requirements: Requirement[]
  }
  selectedPackage: { id: string; name: string } | null
}

interface ServicePackage {
  id: string
  name: string
  description: string | null
  basePriceSar: number
  isFeatured: boolean
}

export default function ClientProfilePage() {
  const { token } = useAuth()
  const { toast } = useToast()
  const { isSidebarCollapsed, isMobileSidebarOpen, toggleMobileSidebar, toggleDesktopSidebar, closeMobileSidebar } = useMobileSidebar()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [data, setData] = useState<ProfileData | null>(null)
  const [packages, setPackages] = useState<ServicePackage[]>([])
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const authHeaders = useCallback(() => {
    const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null)
    return authToken ? { Authorization: `Bearer ${authToken}` } : {}
  }, [token])

  const loadProfile = useCallback(async () => {
    setLoading(true)
    try {
      const [profileRes, catalogRes] = await Promise.all([
        axios.get('/api/client/profile-completion', { headers: authHeaders() }),
        axios.get('/api/services/catalog'),
      ])
      setData(profileRes.data)
      setPackages(catalogRes.data.packages ?? [])
      setPhone(profileRes.data.client.phone ?? '')
      setCompany(profileRes.data.client.company ?? '')
      setSelectedPackageId(profileRes.data.client.servicePackageId)
    } catch {
      toast({ title: 'Failed to load profile', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [authHeaders, toast])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const saveProfile = async () => {
    setSaving(true)
    try {
      const res = await axios.put('/api/client/profile-completion', {
        phone,
        company,
        servicePackageId: selectedPackageId,
      }, { headers: authHeaders() })
      setData((prev) => prev ? {
        ...prev,
        client: { ...prev.client, phone, company, servicePackageId: selectedPackageId },
        profileCompletion: res.data.profileCompletion,
      } : prev)
      toast({ title: 'Profile updated' })
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const uploadDocument = async (requirementId: string, file: File) => {
    setUploading(requirementId)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('requirementId', requirementId)
      const res = await axios.post('/api/client/profile-completion', form, {
        headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' },
      })
      setData((prev) => prev ? { ...prev, profileCompletion: res.data.profileCompletion } : prev)
      toast({ title: 'Document uploaded' })
    } catch {
      toast({ title: 'Upload failed', variant: 'destructive' })
    } finally {
      setUploading(null)
    }
  }

  const completion = data?.profileCompletion
  const progress = completion
    ? Math.round((completion.completedCount / Math.max(completion.requiredCount, 1)) * 100)
    : 0

  const statusBadge = (status: string) => {
    if (status === 'UPLOADED' || status === 'APPROVED') {
      return <Badge className="bg-emerald-600"><CheckCircle className="h-3 w-3 mr-1" />Done</Badge>
    }
    if (status === 'MISSING') {
      return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />Required</Badge>
    }
    return <Badge variant="secondary">{status}</Badge>
  }

  return (
    <MobileLayout
      isSidebarCollapsed={isSidebarCollapsed}
      isMobileSidebarOpen={isMobileSidebarOpen}
      onToggleMobile={toggleMobileSidebar}
      onToggleDesktop={toggleDesktopSidebar}
      onCloseMobile={closeMobileSidebar}
      title="Complete Your Profile"
      description="Upload required documents to activate your account"
      icon={<User className="h-5 w-5 text-emerald-600" />}
    >
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : (
        <div className="max-w-3xl mx-auto space-y-6">
          {completion?.isComplete ? (
            <Alert className="border-emerald-200 bg-emerald-50">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-emerald-800">
                Your profile is complete. You can now track your application from the dashboard.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please complete all required items below. Missing: {completion?.missingFields.join(', ') || 'none'}
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Profile Progress</CardTitle>
              <CardDescription>
                {completion?.completedCount ?? 0} of {completion?.requiredCount ?? 0} required items complete
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2">{progress}% complete</p>
            </CardContent>
          </Card>

          {packages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Select Service Package
                </CardTitle>
                <CardDescription>Choose the package that fits your business needs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-3">
                  {packages.map((pkg) => (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => setSelectedPackageId(pkg.id)}
                      className={`text-left p-4 rounded-lg border transition-colors ${
                        selectedPackageId === pkg.id
                          ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
                          : 'border-border hover:border-emerald-300'
                      }`}
                    >
                      <p className="font-medium text-sm">{pkg.name}</p>
                      <p className="text-lg font-bold mt-1">{pkg.basePriceSar.toLocaleString()} SAR</p>
                      {pkg.isFeatured && <Badge className="mt-2 bg-emerald-600 text-xs">Popular</Badge>}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="phone"><Phone className="h-4 w-4 inline mr-2" />Contact Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+966 50 123 4567"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="company"><Building className="h-4 w-4 inline mr-2" />Company Name</Label>
                <Input
                  id="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Your company name"
                  className="mt-2"
                />
              </div>
              <Button onClick={saveProfile} disabled={saving} className="bg-emerald-700 hover:bg-emerald-800">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Contact Info
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Required Documents</CardTitle>
              <CardDescription>Upload PDF copies of the following documents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {completion?.requirements
                .filter((r) => r.inputType === 'DOCUMENT')
                .map((req) => (
                  <div key={req.id} className="flex items-start justify-between gap-4 p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{req.name}</p>
                        {!req.isRequired && <Badge variant="outline" className="text-xs">Optional</Badge>}
                      </div>
                      {req.description && (
                        <p className="text-sm text-muted-foreground mt-1">{req.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {statusBadge(req.status)}
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        aria-label={`Upload ${req.name}`}
                        ref={(el) => { fileRefs.current[req.id] = el }}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) uploadDocument(req.id, file)
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={uploading === req.id}
                        onClick={() => fileRefs.current[req.id]?.click()}
                      >
                        {uploading === req.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Upload className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>
      )}
    </MobileLayout>
  )
}
