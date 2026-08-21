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

  // Legacy plain string fallback: set en to raw, ar to empty string so dynamic translation triggers
  return { en: raw, ar: '' }
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

const translationCache = new Map<string, string>()

/**
 * Translates text between English and Arabic using LibreTranslate API endpoint with in-memory caching.
 */
export async function translateText(
  text: string,
  source: 'en' | 'ar' = 'en',
  target: 'en' | 'ar' = 'ar'
): Promise<string> {
  if (!text || typeof text !== 'string' || !text.trim()) return text || ''
  if (source === target) return text

  const cleanText = text.trim()
  const cacheKey = `${source}:${target}:${cleanText}`

  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!
  }

  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cleanText, source, target }),
    })
    if (!res.ok) {
      return cleanText
    }
    const data = await res.json()
    const translated = (data.translatedText && typeof data.translatedText === 'string' && data.translatedText.trim())
      ? data.translatedText
      : cleanText

    if (translated && translated !== cleanText) {
      translationCache.set(cacheKey, translated)
    }
    return translated
  } catch {
    return cleanText
  }
}
