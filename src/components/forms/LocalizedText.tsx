'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useLocale } from '@/contexts/LocaleContext'
import { parseBilingualText, translateText } from '@/lib/multilingual-text'

interface LocalizedTextProps {
  raw: string | null | undefined
  fallback?: string
  className?: string
  as?: React.ElementType
}

/**
 * Reusable Component for Dynamic English / Arabic Localized Rendering with LibreTranslate & In-Memory Caching:
 * - Admin flow saves raw content (e.g. English).
 * - Client flow:
 *   - If locale === 'en': returns original English content instantly without calling API.
 *   - If locale === 'ar': returns pre-saved Arabic text if distinct. If missing or identical to English,
 *     dynamically translates English content into Arabic via LibreTranslate (/api/translate) with caching.
 *   - If translation fails, gracefully falls back to original English content.
 */
export function LocalizedText({ raw, fallback = '', className, as: Component = 'span' }: LocalizedTextProps) {
  const { locale } = useLocale()
  const parsed = parseBilingualText(raw)

  const [loading, setLoading] = useState<boolean>(() => {
    if (!raw) return false
    if (locale === 'ar') {
      return !(parsed.ar && parsed.ar !== parsed.en)
    }
    return false
  })

  const [displayText, setDisplayText] = useState<string>(() => {
    if (!raw) return fallback
    if (locale === 'ar') {
      return parsed.ar && parsed.ar !== parsed.en ? parsed.ar : parsed.en || raw
    }
    return parsed.en || parsed.ar || raw
  })

  useEffect(() => {
    if (!raw) {
      setDisplayText(fallback)
      setLoading(false)
      return
    }

    if (locale === 'ar') {
      // 1. If stored Arabic text is valid and different from English, use it immediately
      if (parsed.ar && parsed.ar !== parsed.en) {
        setDisplayText(parsed.ar)
        setLoading(false)
        return
      }

      // 2. Otherwise, set loading state and dynamically translate English -> Arabic via API
      const englishText = parsed.en || raw
      if (englishText) {
        setLoading(true)
        let isMounted = true
        translateText(englishText, 'en', 'ar').then((translated) => {
          if (isMounted) {
            setDisplayText(translated || englishText)
            setLoading(false)
          }
        })
        return () => {
          isMounted = false
        }
      }
    } else {
      // English mode: always show original English content immediately without API call
      setDisplayText(parsed.en || parsed.ar || raw)
      setLoading(false)
    }
  }, [raw, locale, fallback, parsed.en, parsed.ar])

  if (loading) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-muted-foreground ${className || ''}`}>
        <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600 shrink-0" />
      </span>
    )
  }

  return <Component className={className}>{displayText}</Component>
}
