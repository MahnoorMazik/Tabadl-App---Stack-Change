'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import {
  Upload,
  FileText,
  X
} from 'lucide-react'
import { PageUnderConstruction } from '@/components/PageUnderConstruction'
import { useMobileSidebar } from '@/hooks/use-mobile-sidebar'
import { MobileLayout } from '@/lib/mobile-layout-utils'

export default function UploadDocumentPage() {
  const { user } = useAuth()
  const { isSidebarCollapsed, isMobileSidebarOpen, toggleMobileSidebar, toggleDesktopSidebar, closeMobileSidebar } = useMobileSidebar()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleUpload = () => {
    if (!selectedFile) return
    // Handle upload logic
    alert('Document uploaded successfully!')
  }

  return (
    <MobileLayout
      isSidebarCollapsed={isSidebarCollapsed}
      isMobileSidebarOpen={isMobileSidebarOpen}
      onToggleMobile={toggleMobileSidebar}
      onToggleDesktop={toggleDesktopSidebar}
      onCloseMobile={closeMobileSidebar}
      title="Upload Document"
      description="Add new documents to your case"
      icon={<Upload className="h-5 w-5 text-emerald-600" />}
    >
      <div className="max-w-2xl mx-auto">
        <PageUnderConstruction
          title="Upload Documents"
          description="Direct uploads will be available soon."
        />
        <div className="hidden">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload New Document
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-emerald-500 transition-colors">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="font-medium mb-2">Drop files here or click to upload</h3>
                  <p className="text-sm text-gray-500 mb-4">Supported formats: PDF, JPG, PNG (Max 10MB)</p>
                  <Input
                    type="file"
                    onChange={handleFileChange}
                    className="max-w-xs mx-auto cursor-pointer"
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                </div>

                {selectedFile && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-emerald-700" />
                        <div>
                          <p className="font-medium">{selectedFile.name}</p>
                          <p className="text-sm text-gray-600">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedFile(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="docType">Document Type</Label>
                    <select
                      id="docType"
                      className="w-full mt-2 p-2 border rounded-md"
                    >
                      <option>Select document type</option>
                      <option>Passport Copy</option>
                      <option>Business Plan</option>
                      <option>Bank Statement</option>
                      <option>Proof of Address</option>
                      <option>Company License</option>
                      <option>Other</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <textarea
                      id="notes"
                      className="w-full mt-2 p-2 border rounded-md"
                      rows={4}
                      placeholder="Add any notes about this document..."
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleUpload}
                    disabled={!selectedFile}
                    className="flex-1 bg-emerald-700 hover:bg-emerald-800"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                  <Link href="/client/documents">
                    <Button variant="outline">Cancel</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
        </div>
      </div>
    </MobileLayout>
  )
}

