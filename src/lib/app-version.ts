// Get version from environment variable (set at build time) or package.json
import packageJson from '../../package.json'

let rawVersion = process.env.NEXT_PUBLIC_APP_VERSION

// If not set, read from package.json at build time
if (!rawVersion) {
  if (!packageJson || !packageJson.version) {
    throw new Error('Failed to read version from package.json')
  }
  rawVersion = packageJson.version
}

if (!rawVersion) {
  throw new Error('APP_VERSION is required but not found in package.json or NEXT_PUBLIC_APP_VERSION')
}

export const APP_VERSION = rawVersion

export const APP_VERSION_LABEL = rawVersion.toLowerCase().startsWith('v')
  ? rawVersion
  : `v${rawVersion}`

