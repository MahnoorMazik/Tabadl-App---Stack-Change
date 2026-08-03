'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Download, Eye, FileText, Loader2 } from 'lucide-react'
import { isWizardFileUrl, wizardFileDisplayName } from '@/lib/wizards/wizard-file-utils'

function viewUrl(fileUrl: string) {
  if (fileUrl.includes('?')) {
    return fileUrl.includes('view=') ? fileUrl : `${fileUrl}&view=true`
  }
  return `${fileUrl}?view=true`
}

function fileExtension(fileUrl: string, name?: string | null) {
  const source = name || fileUrl.split('?')[0]
  const match = source.toLowerCase().match(/\.([a-z0-9]+)$/)
  return match?.[1] ?? ''
}

type WizardFilePreviewProps = {
  fileUrl: string | null | undefined
  fileName?: string | null
  className?: string
}

export function WizardFilePreview({
  fileUrl,
  fileName,
  className,
}: WizardFilePreviewProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const url = fileUrl && isWizardFileUrl(fileUrl) ? fileUrl : null
  const displayName = wizardFileDisplayName(url, fileName)
  const ext = fileExtension(url || '', displayName)
  const isPdf = ext === 'pdf'
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)

  useEffect(() => {
    if (!open || !url) return

    let objectUrl: string | null = null
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      setPreviewUrl(null)
      try {
        if (isPdf) {
          const response = await axios.get(viewUrl(url), { responseType: 'blob' })
          const blob = new Blob([response.data], { type: 'application/pdf' })
          objectUrl = window.URL.createObjectURL(blob)
          if (!cancelled) setPreviewUrl(objectUrl)
        } else if (isImage) {
          const response = await axios.get(viewUrl(url), { responseType: 'blob' })
          objectUrl = window.URL.createObjectURL(
            new Blob([response.data], { type: response.data.type || `image/${ext}` })
          )
          if (!cancelled) setPreviewUrl(objectUrl)
        } else {
          if (!cancelled) {
            setError('Preview is not available for this file type. You can download it instead.')
          }
        }
      } catch {
        if (!cancelled) setError('Unable to load document preview.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
      if (objectUrl) window.URL.revokeObjectURL(objectUrl)
    }
  }, [open, url, isPdf, isImage, ext])

  if (!url) return null

  const handleDownload = async () => {
    try {
      const response = await axios.get(url, { responseType: 'blob' })
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = displayName
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2.5">
        <FileText className="h-4 w-4 shrink-0 text-emerald-700" />
        <span className="text-sm font-medium truncate min-w-0 flex-1" title={displayName}>
          {displayName}
        </span>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Eye className="h-3.5 w-3.5 mr-1.5" />
          Preview
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => void handleDownload()}>
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Download
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl w-[95vw] h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-4 py-3 border-b shrink-0">
            <DialogTitle className="truncate text-base">{displayName}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 bg-slate-50 relative">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              </div>
            )}
            {!loading && error && (
              <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button type="button" variant="outline" onClick={() => void handleDownload()}>
                  <Download className="h-4 w-4 mr-1.5" />
                  Download file
                </Button>
              </div>
            )}
            {!loading && !error && previewUrl && isPdf && (
              <iframe title={displayName} src={previewUrl} className="w-full h-full border-0" />
            )}
            {!loading && !error && previewUrl && isImage && (
              <div className="h-full overflow-auto flex items-center justify-center p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt={displayName}
                  className="max-w-full max-h-full object-contain rounded shadow-sm"
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
