'use client'

import { useEffect } from 'react'

/**
 * This component removes browser extension attributes that cause hydration errors
 * Specifically targets Grammarly and other extensions that inject attributes
 */
export function DocumentFixer() {
  useEffect(() => {
    // Remove Grammarly and other extension attributes from body
    if (typeof window !== 'undefined') {
      const body = document.body
      const attributesToRemove = [
        'data-new-gr-c-s-check-loaded',
        'data-gr-ext-installed',
        'data-gr-ext-disabled',
        'grammarly-extension',
        'data-gramm',
        'data-gramm_editor',
        'data-gr-id',
      ]

      attributesToRemove.forEach(attr => {
        if (body.hasAttribute(attr)) {
          body.removeAttribute(attr)
        }
      })

      // Also check and remove from html element
      const html = document.documentElement
      attributesToRemove.forEach(attr => {
        if (html.hasAttribute(attr)) {
          html.removeAttribute(attr)
        }
      })
    }
  }, [])

  return null
}

