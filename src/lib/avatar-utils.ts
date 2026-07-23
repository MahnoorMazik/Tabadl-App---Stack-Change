/**
 * Normalize avatar value from DB (filename) or API (path) to a URL for <img src>.
 * Uses /api/static/ so uploads are served from the uploads directory in all environments
 * (production/Docker often only has uploads in a volume, not in public/).
 */
export function toAvatarUrl(avatar: string | null | undefined): string | null {
  if (!avatar) return null
  const filename = avatar.startsWith('/uploads/')
    ? avatar.slice('/uploads/'.length)
    : avatar.startsWith('/api/static/')
      ? avatar.slice('/api/static/'.length)
      : avatar
  return `/api/static/${filename}`
}
