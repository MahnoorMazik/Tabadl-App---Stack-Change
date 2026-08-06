/**
 * Utility helpers to handle bilingual text stored as JSON strings: `{"en":"...","ar":"..."}`
 * or legacy plain strings.
 */

export interface BilingualText {
  en: string
  ar: string
}

/**
 * Encodes English and Arabic strings into a JSON string `{"en":"...","ar":"..."}`.
 */
export function encodeBilingualText(en: string, ar: string): string {
  const cleanEn = en.trim()
  const cleanAr = ar.trim()
  return JSON.stringify({ en: cleanEn, ar: cleanAr })
}

/**
 * Parses a string that might be a JSON object `{"en":"...","ar":"..."}` or a legacy plain string.
 */
export function parseBilingualText(raw: string | null | undefined): BilingualText {
  if (!raw) return { en: '', ar: '' }

  const trimmed = raw.trim()
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed && typeof parsed === 'object') {
        return {
          en: typeof parsed.en === 'string' ? parsed.en : '',
          ar: typeof parsed.ar === 'string' ? parsed.ar : '',
        }
      }
    } catch {
      // Fallback to plain string if JSON parsing fails
    }
  }

  // Legacy plain string fallback: set both en and ar to raw
  return { en: raw, ar: raw }
}

/**
 * Formats bilingual text for display according to active locale ('en' | 'ar').
 */
export function getLocalizedText(raw: string | null | undefined, locale: string = 'en'): string {
  if (!raw) return ''
  const parsed = parseBilingualText(raw)
  if (locale === 'ar') {
    return parsed.ar || parsed.en || raw
  }
  return parsed.en || parsed.ar || raw
}
