'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import type { StoreLocale } from '@/lib/locale-routing'
import { clearRecentSearches, readRecentSearches } from '@/lib/search/recent-searches'

export function SearchLandingSuggestions({ locale, popular }: { locale: StoreLocale; popular: string[] }) {
  const [recent, setRecent] = useState<string[]>([])
  const labels = locale === 'ro'
    ? { recent: 'Căutări recente', popular: 'Căutări populare', clear: 'Șterge istoricul' }
    : { recent: 'Недавние запросы', popular: 'Популярные запросы', clear: 'Очистить историю' }
  const searchPath = locale === 'ro' ? '/ro/cautare' : '/ru/search'
  const href = (query: string) => `${searchPath}?q=${encodeURIComponent(query)}`

  useEffect(() => setRecent(readRecentSearches()), [])

  return (
    <div className="grid gap-8 border-t border-fog py-8 sm:grid-cols-2">
      {recent.length ? (
        <section aria-labelledby="search-page-recent-title">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="search-page-recent-title" className="m-0 text-sm font-medium">{labels.recent}</h2>
            <button className="text-xs text-graphite underline decoration-hover-cream underline-offset-4" type="button" onClick={() => { clearRecentSearches(); setRecent([]) }}>{labels.clear}</button>
          </div>
          <ul className="m-0 grid list-none gap-2 p-0">
            {recent.map((query) => <li key={query}><Link className="text-sm text-midnight-ink hover:text-hover-cream" href={href(query)}>{query}</Link></li>)}
          </ul>
        </section>
      ) : null}
      {popular.length ? (
        <section aria-labelledby="search-page-popular-title">
          <h2 id="search-page-popular-title" className="mb-3 m-0 text-sm font-medium">{labels.popular}</h2>
          <ul className="m-0 grid list-none gap-2 p-0">
            {popular.map((query) => <li key={query}><Link className="text-sm text-midnight-ink hover:text-hover-cream" href={href(query)}>{query}</Link></li>)}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
