'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLocale } from '@/contexts/LocaleContext'

interface FileInputProps {
  id?: string
  disabled?: boolean
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  className?: string
  accept?: string
}

export function FileInput({ id, disabled, onChange, className, accept }: FileInputProps) {
  const { locale } = useLocale()
  const isRTL = locale === 'ar'
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFileName(file.name)
    } else {
      setSelectedFileName(null)
    }
    onChange?.(e)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (inputRef.current) {
      inputRef.current.value = ''
    }
    setSelectedFileName(null)
  }

  return (
    <div className={cn("relative w-full", className)}>
      <input
        ref={inputRef}
        id={id}
        type="file"
        disabled={disabled}
        onChange={handleFileChange}
        accept={accept}
        className="hidden"
      />
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors hover:bg-accent/50 cursor-pointer",
          disabled && "cursor-not-allowed opacity-50",
          isRTL ? "flex-row-reverse" : "flex-row"
        )}
      >
        <span className={cn("truncate text-muted-foreground", selectedFileName && "text-foreground font-medium")}>
          {selectedFileName || (isRTL ? 'لم يتم اختيار ملف' : 'No file chosen')}
        </span>
        <div className={cn("flex items-center gap-2 shrink-0", isRTL && "flex-row-reverse")}>
          {selectedFileName && (
            <button
              type="button"
              onClick={handleClear}
              className="text-muted-foreground hover:text-destructive transition-colors p-1"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled}
            className="h-7 text-xs font-medium gap-1.5 pointer-events-none"
          >
            <Upload className="h-3.5 w-3.5" />
            {isRTL ? 'اختر ملف' : 'Choose File'}
          </Button>
        </div>
      </div>
    </div>
  )
}
