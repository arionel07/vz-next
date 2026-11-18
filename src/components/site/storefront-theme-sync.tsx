'use client'

import { useEffect } from 'react'

import { isSiteThemeKey } from '@/lib/site-theme-shared'

export function StorefrontThemeSync() {
  useEffect(() => {
    let cancelled = false

    void fetch('/api/site-theme', { cache: 'no-store' })
      .then((response) => response.json())
      .then((body: { themeKey?: unknown }) => {
        if (!cancelled && isSiteThemeKey(body.themeKey)) document.body.dataset.siteTheme = body.themeKey
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
      delete document.body.dataset.siteTheme
    }
  }, [])

  return null
}
