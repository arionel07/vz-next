'use client'

import { useEffect } from 'react'

export function SearchTelemetry({ query }: { query: string }) {
  useEffect(() => {
    const normalized = query.trim().replace(/\s+/gu, ' ').toLocaleLowerCase()
    if ([...normalized].length < 2) return

    const key = 'vizaje-nica:search-telemetry:last'
    try {
      if (window.sessionStorage.getItem(key) === normalized) return
      window.sessionStorage.setItem(key, normalized)
    } catch {
      // Continue without session-level deduplication if storage is unavailable.
    }

    void fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      keepalive: true,
    }).catch(() => undefined)
  }, [query])

  return null
}
