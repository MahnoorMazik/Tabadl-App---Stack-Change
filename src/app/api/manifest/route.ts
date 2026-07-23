import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

/**
 * Serves the correct PWA manifest based on the request Referer.
 * When the user is on an admin page (/admin), we return manifest-admin.json
 * so the installed PWA opens at /admin/dashboard. Otherwise we return the
 * public manifest so the main site is not installable as a full PWA from
 * public pages.
 */
export async function GET(request: NextRequest) {
  const referer = request.headers.get('referer') ?? ''
  const isAdmin = referer.includes('/admin')
  const manifestFile = isAdmin ? 'manifest-admin.json' : 'manifest-public.json'
  const filePath = path.join(process.cwd(), 'public', manifestFile)

  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const manifest = JSON.parse(content)
    return NextResponse.json(manifest, {
      headers: {
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'Manifest not found' },
      { status: 404 }
    )
  }
}
