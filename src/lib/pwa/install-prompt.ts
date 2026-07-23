/** Chromium BeforeInstallPromptEvent (not in all TS libs). */
export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export const PWA_INSTALLABLE_EVENT = 'tk-pwa-installable'
export const PWA_INSTALLED_EVENT = 'tk-pwa-installed'

declare global {
  interface Window {
    __tkDeferredInstallPrompt?: BeforeInstallPromptEvent
  }
}

export function getDeferredInstallPrompt(): BeforeInstallPromptEvent | null {
  if (typeof window === 'undefined') return null
  return window.__tkDeferredInstallPrompt ?? null
}

export function setDeferredInstallPrompt(event: BeforeInstallPromptEvent | null): void {
  if (typeof window === 'undefined') return
  if (event) {
    window.__tkDeferredInstallPrompt = event
  } else {
    delete window.__tkDeferredInstallPrompt
  }
}

export function isPwaInstalled(): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  return Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
}

export type PwaInstallPlatform = 'ios' | 'android' | 'desktop'

export function detectPwaInstallPlatform(): PwaInstallPlatform {
  if (typeof navigator === 'undefined') return 'desktop'
  const ua = navigator.userAgent
  const isIos =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (isIos) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}

export function requiresManualPwaInstall(): boolean {
  return detectPwaInstallPlatform() === 'ios'
}
