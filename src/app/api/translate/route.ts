import { NextResponse } from 'next/server'

/**
 * 100% Google GTX Translation Engine Route:
 * Zero API keys, zero credit card details required, instant response time (~150ms).
 */

async function translateWithGoogleGTX(text: string, source: string, target: string): Promise<string | null> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${target}&dt=t&q=${encodeURIComponent(text)}`
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) return null
    const data = await res.json()
    if (Array.isArray(data) && Array.isArray(data[0])) {
      const translatedParts = data[0].map((item: any) => item[0]).filter(Boolean)
      if (translatedParts.length > 0) {
        return translatedParts.join('')
      }
    }
    return null
  } catch (e) {
    console.warn('[Translate API] Google GTX Translate failed:', e)
    return null
  }
}

export async function POST(request: Request) {
  try {
    const { text, source = 'en', target = 'ar' } = await request.json()

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ translatedText: '' })
    }

    const cleanText = text.trim()

    // Translate exclusively via Google GTX endpoint
    const gtxResult = await translateWithGoogleGTX(cleanText, source, target)
    if (gtxResult) {
      return NextResponse.json({ translatedText: gtxResult })
    }

    return NextResponse.json({ translatedText: cleanText })
  } catch (error) {
    console.error('[Translate API] Error:', error)
    return NextResponse.json({ translatedText: '' }, { status: 500 })
  }
}
