'use client'

import { useState } from 'react'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { UserPlus, Upload, Download, FileText, AlertCircle, CheckCircle2, Users } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { useToast } from '@/hooks/use-toast'
import axios from 'axios'
import Papa from 'papaparse'

function replaceParams(str: string, params: Record<string, string | number>): string {
  return str.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`))
}

function toArabicNumerals(str: string): string {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return str.replace(/\d/g, (digit) => arabicNumerals[parseInt(digit)]);
}

interface ClientData {
  name: string
  email: string
  phone?: string
  company: string
}

export default function ImportContactsPage() {
  const { token } = useAuth()
  const { t, formatNumber, locale } = useLocale()
  const { toast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [csvData, setCsvData] = useState<ClientData[]>([])
  const [previewData, setPreviewData] = useState<ClientData[]>([])
  const [showPreview, setShowPreview] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)
      setResults(null)
      parseCSV(selectedFile)
    }
  }

  const parseCSV = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as any[]
        const clients: ClientData[] = data.map(row => ({
          name: row.name || row.Name || '',
          email: row.email || row.Email || '',
          phone: row.phone || row.Phone || '',
          company: row.company || row.Company || row.companyName || ''
        }))

        setCsvData(clients)
        setPreviewData(clients) // Show all rows for preview
        setShowPreview(true)
      },
      error: (error: Error) => {
        toast({
          title: t('admin.clients.import.csvParseError'),
          description: error.message,
          variant: 'destructive',
        })
      }
    })
  }

  const validateEmail = (email: string): { isValid: boolean; errorKey: string } => {
    if (!email?.trim()) return { isValid: false, errorKey: 'admin.clients.import.emailRequired' }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) return { isValid: false, errorKey: 'admin.clients.import.invalidEmailFormat' }
    const parts = email.split('@')
    if (parts.length !== 2) return { isValid: false, errorKey: 'admin.clients.import.invalidEmailFormat' }
    const [localPart, domain] = parts
    if (!localPart.length || localPart.length > 64) return { isValid: false, errorKey: 'admin.clients.import.invalidEmailFormat' }
    if (!domain.length || domain.length > 255) return { isValid: false, errorKey: 'admin.clients.import.invalidEmailFormat' }
    if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) {
      return { isValid: false, errorKey: 'admin.clients.import.invalidEmailFormat' }
    }
    return { isValid: true, errorKey: '' }
  }

  const validateClient = (client: ClientData): string[] => {
    const errors: string[] = []
    if (!client.name?.trim()) errors.push('admin.clients.import.nameRequired')
    const emailValidation = validateEmail(client.email || '')
    if (!emailValidation.isValid) errors.push(emailValidation.errorKey)
    if (!client.company?.trim()) errors.push('admin.clients.import.companyRequired')
    if (client.phone && !/^[\+]?[0-9\s\-\(\)]+$/.test(client.phone)) errors.push('admin.clients.import.invalidPhoneFormat')
    return errors
  }

  const handleImport = async () => {
    if (!csvData.length) return

    setImporting(true)
    setResults(null)

    const result = {
      total: csvData.length,
      imported: 0,
      failed: 0,
      failedItems: [] as { email: string; error: string }[]
    }

    try {
      for (let i = 0; i < csvData.length; i++) {
        const client = csvData[i]
        const validationErrors = validateClient(client)
        
        if (validationErrors.length > 0) {
          result.failed++
          result.failedItems.push({ email: client.email, error: validationErrors.map((k) => t(k)).join(', ') })
          continue
        }

        try {
          const clientData = {
            name: client.name,
            email: client.email,
            phone: client.phone || '',
            company: client.company,
            password: 'client123', // Default password
          }

          await axios.post('/api/clients', clientData, {
            headers: { Authorization: `Bearer ${token}` }
          })

          result.imported++
        } catch (error: any) {
          result.failed++
          result.failedItems.push({
            email: client.email,
            error: error.response?.data?.error || t('admin.clients.import.failedToCreate'),
          })
        }
      }

      setResults(result)
      
      toast({
        title: t('admin.clients.import.importCompleted'),
        description: replaceParams(t('admin.clients.import.importSuccessToast'), { imported: result.imported, failed: result.failed }),
        variant: result.imported > 0 ? 'default' : 'destructive',
      })

    } catch (error) {
      toast({
        title: t('admin.clients.import.importFailed'),
        description: t('admin.clients.import.importFailedDesc'),
        variant: 'destructive',
      })
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = () => {
    const template = 'name,email,phone,company\nJohn Doe,john@example.com,+966501234567,ABC Company\nJane Smith,jane@example.com,+966509876543,XYZ Corporation'
    const blob = new Blob([template], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'client-import-template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <AdminPageTemplate
      title={t('admin.clients.importClients')}
      description={t('admin.clients.import.description')}
      icon={<UserPlus className="h-6 w-6" />}
      showConstruction={false}
    >
      <div className="space-y-6 w-full max-w-none">
        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t('admin.clients.import.howToImport')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <div className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">
                  1
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{t('admin.clients.import.step1')}</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">
                  2
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{t('admin.clients.import.step2')}</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">
                  3
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{t('admin.clients.import.step3')}</p>
              </div>
            </div>
            
            <Button onClick={downloadTemplate} variant="outline" className="w-full mt-4">
              <Download className="h-4 w-4 mr-2" />
              {t('admin.clients.import.downloadTemplate')}
            </Button>
          </CardContent>
        </Card>

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.clients.import.uploadCsv')}</CardTitle>
            <CardDescription>
              {t('admin.clients.import.uploadDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="csv-file">{t('admin.clients.import.csvFile')}</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">{t('admin.clients.import.noFileChosen')}</p>
            </div>

            {file && (
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  {t('admin.clients.import.selectedFile')} <strong>{file.name}</strong> ({formatNumber((file.size / 1024).toFixed(2))} KB)
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleImport}
              disabled={!file || importing}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              <Upload className="h-4 w-4 mr-2" />
              {importing ? t('admin.clients.import.importing') : t('admin.clients.import.importClients')}
            </Button>
          </CardContent>
        </Card>

        {/* Preview */}
        {showPreview && previewData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t('admin.clients.import.preview')} ({csvData.length} {t('admin.clients.import.clients')})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {replaceParams(t('admin.clients.import.showingRows'), { count: csvData.length })}
                </div>
                
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-sm min-w-max">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-1 text-xs font-medium">{t('admin.clients.import.name')}</th>
                        <th className="text-left p-1 text-xs font-medium">{t('admin.clients.import.email')}</th>
                        <th className="text-left p-1 text-xs font-medium">{t('admin.clients.import.phone')}</th>
                        <th className="text-left p-1 text-xs font-medium">{t('admin.clients.import.company')}</th>
                        <th className="text-left p-1 text-xs font-medium">{t('admin.clients.import.status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((client, index) => {
                        const errors = validateClient(client)
                        return (
                          <tr key={index} className="border-b">
                            <td className="p-1 text-xs">{client.name || '-'}</td>
                            <td className="p-1 text-xs">{client.email || '-'}</td>
                            <td className="p-1 text-xs">{client.phone || '-'}</td>
                            <td className="p-1 text-xs">{client.company || '-'}</td>
                            <td className="p-1 text-xs">
                              {errors.length > 0 ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge variant="destructive" className="text-xs cursor-help">
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                        {errors.length} {errors.length > 1 ? t('admin.clients.import.errors') : t('admin.clients.import.error')}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <div className="max-w-xs">
                                        <p className="font-medium mb-1">{t('admin.clients.import.validationErrors')}</p>
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
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  {t('admin.clients.import.valid')}
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
                    onClick={handleImport} 
                    disabled={importing}
                    className="flex-1"
                  >
                    {importing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        {t('admin.clients.import.importing')}
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        {replaceParams(t('admin.clients.import.importCount'), { count: csvData.length })}
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setShowPreview(false)
                    setCsvData([])
                    setPreviewData([])
                    setFile(null)
                    const fileInput = document.getElementById('csv-file') as HTMLInputElement
                    if (fileInput) fileInput.value = ''
                  }}>
                    {t('admin.clients.import.cancel')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Import Results */}
        {results && (
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.clients.import.results')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <div className="text-2xl font-bold">{results.total}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{t('admin.clients.import.totalRecords')}</div>
                </div>
                <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{results.imported}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{t('admin.clients.import.imported')}</div>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-950/30 rounded-lg">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">{results.failed}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{t('admin.clients.import.failed')}</div>
                </div>
              </div>

              {results.imported > 0 && (
                <Alert className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <AlertDescription className="text-emerald-800 dark:text-emerald-200">
                    {replaceParams(t('admin.clients.import.successCount'), { count: results.imported })}
                  </AlertDescription>
                </Alert>
              )}

              {results.failed > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {replaceParams(t('admin.clients.import.failedCount'), { count: results.failed })}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* CSV Format Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('admin.clients.import.csvFormatTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg font-mono text-sm">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t('admin.clients.import.csvHeaderNote')}</div>
              <div className="text-gray-700 dark:text-gray-300">{locale === 'ar' ? t('admin.clients.import.csvHeaderDisplay') : t('admin.clients.import.csvHeader')}</div>
              <div className="text-gray-500 dark:text-gray-400">
                {replaceParams(t('admin.clients.import.csvExample'), {
                  name: t('admin.clients.import.csvExampleName'),
                  email: t('admin.clients.import.csvExampleEmail'),
                  phone: locale === 'ar' ? toArabicNumerals(t('admin.clients.import.csvExamplePhone')) : t('admin.clients.import.csvExamplePhone'),
                  company: t('admin.clients.import.csvExampleCompany')
                })}
              </div>
            </div>
            
            <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <p>• <strong>{t('admin.clients.import.requiredColumns')}</strong> {locale === 'ar' ? t('admin.clients.import.requiredColsListDisplay') : t('admin.clients.import.requiredColsList')}</p>
              <p>• <strong>{t('admin.clients.import.optionalColumns')}</strong> {locale === 'ar' ? t('admin.clients.import.optionalColsListDisplay') : t('admin.clients.import.optionalColsList')}</p>
              <p>• <strong>{t('admin.clients.import.defaultPassword')}</strong> {t('admin.clients.import.defaultPasswordNote')}</p>
              <p>• <strong>{t('admin.clients.import.duplicatesNote')}</strong> {t('admin.clients.import.duplicatesDesc')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminPageTemplate>
  )
}

