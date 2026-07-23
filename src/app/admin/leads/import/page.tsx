'use client'

import { useState, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  Upload, 
  Download, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  X,
  Users,
  FileCheck,
  AlertTriangle
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import Papa from 'papaparse'
import { isValidCountry, findClosestCountry, getCountriesList } from '@/lib/countries'
import { useRouter } from 'next/navigation'

interface LeadData {
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
  businessTypes?: string
  source?: string
  notes?: string
}

interface ImportResult {
  success: number
  errors: number
  duplicates: number
  total: number
  errorDetails: string[]
}

function replaceParams(str: string, params: Record<string, string | number>): string {
  return str.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`))
}

export default function ImportLeadsPage() {
  const { token } = useAuth()
  const { t, locale } = useLocale()
  const { toast } = useToast()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [file, setFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<LeadData[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [previewData, setPreviewData] = useState<LeadData[]>([])
  const [showPreview, setShowPreview] = useState(false)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile)
      parseCSV(selectedFile)
    } else {
      toast({
        title: t('admin.leads.import.invalidFileType'),
        description: t('admin.leads.import.selectCsvFile'),
        variant: 'destructive',
      })
    }
  }

  const parseCSV = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as any[]
        const leads: LeadData[] = data.map(row => {
          const rawCountry = row.country || row.Country || ''
          let country = rawCountry
          
          // Validate and fix country name if needed
          if (rawCountry && !isValidCountry(rawCountry)) {
            const closest = findClosestCountry(rawCountry)
            if (closest) {
              country = closest
            } else {
              // If no match found, keep original but show warning
              console.warn(`Invalid country name: "${rawCountry}". Please update to a valid country name.`)
            }
          }
          
          return {
            fullName: row.fullName || row['Full Name'] || row.name || '',
            email: row.email || row.Email || '',
            phone: row.phone || row.Phone || row.telephone || '',
            companyName: row.companyName || row['Company Name'] || row.company || '',
            companyType: row.companyType || row['Company Type'] || row.type || '',
            natureOfBusiness: row.natureOfBusiness || row['Nature of Business'] || row.business || '',
            designation: row.designation || row.Designation || row.title || '',
            country: country,
            city: row.city || row.City || '',
            howDidYouHear: row.howDidYouHear || row['How did you hear about us?'] || row.source || '',
            businessTypes: row.businessTypes || row['Business Types'] || row.services || '',
            source: row.source || row.Source || 'CSV Import',
            notes: row.notes || row.Notes || row.comments || ''
          }
        })

        // Validate countries and show warnings
        const invalidCountries = leads.filter(lead => {
          if (!lead.country) return false
          return !isValidCountry(lead.country)
        })

        if (invalidCountries.length > 0) {
          const uniqueInvalid = Array.from(new Set(invalidCountries.map(l => l.country)))
          toast({
            title: t('admin.leads.import.countryWarning'),
            description: replaceParams(t('admin.leads.import.invalidCountryCount'), { count: uniqueInvalid.length }),
            variant: 'destructive',
          })
        }

        setCsvData(leads)
        setPreviewData(leads) // Show all rows for preview
        setShowPreview(true)
      },
      error: (error: Error) => {
        toast({
          title: t('admin.leads.import.csvParseError'),
          description: error.message,
          variant: 'destructive',
        })
      }
    })
  }

  const validateEmail = (email: string): { isValid: boolean; errorKey: string } => {
    if (!email?.trim()) {
      return { isValid: false, errorKey: 'admin.leads.import.emailRequired' }
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return { isValid: false, errorKey: 'admin.leads.import.invalidEmailFormat' }
    }
    const parts = email.split('@')
    if (parts.length !== 2) return { isValid: false, errorKey: 'admin.leads.import.invalidEmailFormat' }
    const [localPart, domain] = parts
    if (!localPart.length || localPart.length > 64) return { isValid: false, errorKey: 'admin.leads.import.invalidEmailFormat' }
    if (!domain.length || domain.length > 255) return { isValid: false, errorKey: 'admin.leads.import.invalidEmailFormat' }
    if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) {
      return { isValid: false, errorKey: 'admin.leads.import.invalidEmailFormat' }
    }
    return { isValid: true, errorKey: '' }
  }

  const validateLead = (lead: LeadData): string[] => {
    const errors: string[] = []
    if (!lead.fullName?.trim()) errors.push('admin.leads.import.fullNameRequired')
    const emailValidation = validateEmail(lead.email || '')
    if (!emailValidation.isValid) errors.push(emailValidation.errorKey)
    if (lead.phone && !/^[\+]?[0-9\s\-\(\)]+$/.test(lead.phone)) errors.push('admin.leads.import.invalidPhoneFormat')
    return errors
  }

  const importLeads = async () => {
    if (!csvData.length) return

    setIsProcessing(true)
    setImportResult(null)

    const result: ImportResult = {
      success: 0,
      errors: 0,
      duplicates: 0,
      total: csvData.length,
      errorDetails: []
    }

    try {
      for (let i = 0; i < csvData.length; i++) {
        const lead = csvData[i]
        const validationErrors = validateLead(lead)
        
        if (validationErrors.length > 0) {
          result.errors++
          const details = validationErrors.map((k) => t(k)).join(', ')
          result.errorDetails.push(replaceParams(t('admin.leads.import.rowValidation'), { row: i + 1, details }))
          continue
        }

        try {
          const response = await fetch('/api/leads/import', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(lead)
          })

          if (response.ok) {
            result.success++
          } else if (response.status === 409) {
            result.duplicates++
            result.errorDetails.push(replaceParams(t('admin.leads.import.rowEmailExists'), { row: i + 1 }))
          } else {
            result.errors++
            result.errorDetails.push(replaceParams(t('admin.leads.import.rowServerError'), { row: i + 1 }))
          }
        } catch (error) {
          result.errors++
          result.errorDetails.push(replaceParams(t('admin.leads.import.rowNetworkError'), { row: i + 1 }))
        }
      }

      setImportResult(result)
      
      toast({
        title: t('admin.leads.import.importCompleted'),
        description: replaceParams(t('admin.leads.import.importSuccessToast'), {
          success: result.success,
          errors: result.errors,
          duplicates: result.duplicates,
        }),
        variant: result.success > 0 ? 'default' : 'destructive',
      })

    } catch (error) {
      toast({
        title: t('admin.leads.import.importFailed'),
        description: t('admin.leads.import.importFailedDesc'),
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadTemplate = () => {
    const template = [
      {
        fullName: 'John Doe',
        email: 'john@example.com',
        phone: '+966501234567',
        companyName: 'Example Corp',
        companyType: 'LLC',
        natureOfBusiness: 'Technology',
        designation: 'CEO',
        country: 'Saudi Arabia',
        city: 'Riyadh',
        howDidYouHear: 'Website',
        businessTypes: 'Technology,Software',
        source: 'Website',
        notes: 'Interested in our services'
      }
    ]

    const csv = Papa.unparse(template)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'leads_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const resetImport = () => {
    setFile(null)
    setCsvData([])
    setPreviewData([])
    setShowPreview(false)
    setImportResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <AdminPageTemplate
      title={t('admin.leads.importLeads')}
      description={t('admin.leads.import.description')}
      icon={<FileCheck className="h-6 w-6" />}
      showConstruction={false}
    >
      <div className="space-y-6 w-full max-w-none">
        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t('admin.leads.import.instructions')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">{t('admin.leads.import.requiredFields')}</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• {locale === 'ar' ? t('admin.leads.import.requiredListDisplay') : t('admin.leads.import.requiredList')}</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">{t('admin.leads.import.optionalFields')}</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• {locale === 'ar' ? t('admin.leads.import.optionalListDisplay') : t('admin.leads.import.optionalList')}</li>
                </ul>
              </div>
            </div>
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {t('admin.leads.import.columnNamesNote')}
              </AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                {t('admin.leads.import.downloadTemplate')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              {t('admin.leads.import.uploadCsv')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="csv-file">{t('admin.leads.import.selectCsv')}</Label>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  ref={fileInputRef}
                  className="mt-1"
                />
              </div>
              
              {file && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">{file.name}</span>
                  <span className="text-xs text-gray-500">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetImport}
                    className="ml-auto"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        {showPreview && previewData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t('admin.leads.import.preview')} ({csvData.length} {t('admin.leads.import.leads')})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {replaceParams(t('admin.leads.import.showingRows'), { count: csvData.length })}
                </div>
                
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-sm min-w-max">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-1 text-xs font-medium">{t('admin.leads.import.name')}</th>
                        <th className="text-left p-1 text-xs font-medium">{t('admin.leads.import.email')}</th>
                        <th className="text-left p-1 text-xs font-medium">{t('admin.leads.import.phone')}</th>
                        <th className="text-left p-1 text-xs font-medium">{t('admin.leads.import.company')}</th>
                        <th className="text-left p-1 text-xs font-medium">{t('admin.leads.import.type')}</th>
                        <th className="text-left p-1 text-xs font-medium">{t('admin.leads.import.business')}</th>
                        <th className="text-left p-1 text-xs font-medium">{t('admin.leads.import.designation')}</th>
                        <th className="text-left p-1 text-xs font-medium">{t('admin.leads.import.country')}</th>
                        <th className="text-left p-1 text-xs font-medium">{t('admin.leads.import.city')}</th>
                        <th className="text-left p-1 text-xs font-medium">{t('admin.leads.import.businessTypes')}</th>
                        <th className="text-left p-1 text-xs font-medium">{t('admin.leads.import.source')}</th>
                        <th className="text-left p-1 text-xs font-medium">{t('admin.leads.import.notes')}</th>
                        <th className="text-left p-1 text-xs font-medium">{t('admin.leads.import.status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((lead, index) => {
                        const errors = validateLead(lead)
                        return (
                          <tr key={index} className="border-b">
                            <td className="p-1 text-xs">{lead.fullName || '-'}</td>
                            <td className="p-1 text-xs">{lead.email || '-'}</td>
                            <td className="p-1 text-xs">{lead.phone || '-'}</td>
                            <td className="p-1 text-xs">{lead.companyName || '-'}</td>
                            <td className="p-1 text-xs">{lead.companyType || '-'}</td>
                            <td className="p-1 text-xs">{lead.natureOfBusiness || '-'}</td>
                            <td className="p-1 text-xs">{lead.designation || '-'}</td>
                            <td className="p-1 text-xs">
                              {lead.country ? (
                                isValidCountry(lead.country) ? (
                                  lead.country
                                ) : (
                                  <span className="text-red-600 font-medium" title={replaceParams(t('admin.leads.import.invalidCountryTooltip'), { country: lead.country })}>
                                    {lead.country} ⚠️
                                  </span>
                                )
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="p-1 text-xs">{lead.city || '-'}</td>
                            <td className="p-1 text-xs">{lead.businessTypes || '-'}</td>
                            <td className="p-1 text-xs">{lead.source || '-'}</td>
                            <td className="p-1 text-xs">{lead.notes || '-'}</td>
                            <td className="p-1 text-xs">
                              {errors.length > 0 ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge variant="destructive" className="text-xs cursor-help">
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                        {errors.length} {errors.length > 1 ? t('admin.leads.import.errors') : t('admin.leads.import.error')}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <div className="max-w-xs">
                                        <p className="font-medium mb-1">{t('admin.leads.import.validationErrors')}</p>
                                        <ul className="text-xs space-y-1">
                                          {errors.map((key, idx) => (
                                            <li key={idx} className="text-red-100">• {t(key)}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <Badge variant="default" className="text-xs">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  {t('admin.leads.import.valid')}
                                </Badge>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={importLeads} 
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        {t('admin.leads.import.importing')}
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        {replaceParams(t('admin.leads.import.importCount'), { count: csvData.length })}
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={resetImport}>
                    {t('admin.leads.import.cancel')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress */}
        {isProcessing && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-lg font-medium">{t('admin.leads.import.importingTitle')}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{t('admin.leads.import.pleaseWait')}</div>
                </div>
                <Progress value={50} className="w-full" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {importResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                {t('admin.leads.import.results')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{importResult.success}</div>
                    <div className="text-sm text-green-700 dark:text-green-300">{t('admin.leads.import.successful')}</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 dark:bg-red-950/30 rounded-lg">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">{importResult.errors}</div>
                    <div className="text-sm text-red-700 dark:text-red-300">{t('admin.leads.import.errors')}</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{importResult.duplicates}</div>
                    <div className="text-sm text-yellow-700 dark:text-yellow-300">{t('admin.leads.import.duplicates')}</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{importResult.total}</div>
                    <div className="text-sm text-gray-700 dark:text-gray-300">{t('admin.leads.import.total')}</div>
                  </div>
                </div>

                {importResult.errorDetails.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <div className="font-medium">{t('admin.leads.import.errorDetails')}</div>
                        <div className="max-h-32 overflow-y-auto text-sm">
                          {importResult.errorDetails.slice(0, 10).map((error, index) => (
                            <div key={index} className="text-red-600 dark:text-red-400">• {error}</div>
                          ))}
                          {importResult.errorDetails.length > 10 && (
                            <div className="text-gray-500 dark:text-gray-400">... {replaceParams(t('admin.leads.import.moreErrors'), { count: importResult.errorDetails.length - 10 })}</div>
                          )}
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button onClick={resetImport} className="flex-1">
                    {t('admin.leads.import.importMore')}
                  </Button>
                  <Button variant="outline" onClick={() => router.push('/admin/leads')}>
                    {t('admin.leads.import.viewAllLeads')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminPageTemplate>
  )
}
