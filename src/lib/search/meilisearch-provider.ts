import type { StoreLocale } from '@/lib/locale-routing'

import { MysqlSearchProvider } from './mysql-provider'
import type { SearchProvider, SearchProviderSuggestions } from './types'
import { normalizeSearchQuery } from './types'

const MAX_PRODUCT_CANDIDATES = 10_000
let fallbackWarningWritten = false

function configuredHost() {
  const value = process.env.MEILISEARCH_URL?.trim()
  if (!value) return ''

  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return ''
    if (url.username || url.password || url.search || url.hash) return ''
    return url.toString().replace(/\/+$/u, '')
  } catch {
    return ''
  }
}

function positiveIds(value: unknown) {
  if (!Array.isArray(value)) return []
  return [...new Set(value.flatMap((item) => {
    if (!item || typeof item !== 'object' || !('id' in item)) return []
    const id = Number(item.id)
    return Number.isSafeInteger(id) && id > 0 ? [id] : []
  }))]
}

export class MeilisearchProvider implements SearchProvider {
  private readonly host = configuredHost()
  private readonly index = process.env.MEILISEARCH_INDEX?.trim() || 'vizaje_nica_products'
  private readonly apiKey = process.env.MEILISEARCH_SEARCH_KEY?.trim() ?? ''
  private readonly fallback: MysqlSearchProvider

  constructor(fallback = new MysqlSearchProvider()) {
    this.fallback = fallback
  }

  async searchProductIds(value: string, locale: StoreLocale, limit = MAX_PRODUCT_CANDIDATES) {
    const query = normalizeSearchQuery(value)
    if ([...query].length < 2) return []

    const indexedIds = await this.searchIndex(query, limit)
    return indexedIds ?? this.fallback.searchProductIds(query, locale, limit)
  }

  async suggest(value: string, locale: StoreLocale): Promise<SearchProviderSuggestions> {
    const query = normalizeSearchQuery(value)
    if ([...query].length < 2) return { productIds: [], brands: [], categories: [], queries: [] }

    const [indexedIds, metadata] = await Promise.all([
      this.searchIndex(query, 40),
      this.fallback.suggestMetadata(query, locale),
    ])
    const productIds = indexedIds ?? await this.fallback.searchProductIds(query, locale, 40)
    return { ...metadata, productIds }
  }

  popularQueries(limit = 8, prefix = '') {
    return this.fallback.popularQueries(limit, prefix)
  }

  recordSearch(query: string) {
    return this.fallback.recordSearch(query)
  }

  private async searchIndex(query: string, limit: number): Promise<number[] | null> {
    if (!this.host) return null

    const safeLimit = Math.max(1, Math.min(MAX_PRODUCT_CANDIDATES, Math.floor(limit)))
    const url = `${this.host}/indexes/${encodeURIComponent(this.index)}/search`
    const headers = new Headers({ 'Content-Type': 'application/json', Accept: 'application/json' })
    if (this.apiKey) headers.set('Authorization', `Bearer ${this.apiKey}`)
    const timeoutMs = Math.max(250, Math.min(10_000, Number(process.env.MEILISEARCH_TIMEOUT_MS) || 2000))

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ q: query, limit: safeLimit, attributesToRetrieve: ['id'] }),
        cache: 'no-store',
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (!response.ok) return this.fallbackToMysql()

      const payload: unknown = await response.json()
      if (!payload || typeof payload !== 'object' || !('hits' in payload)) return this.fallbackToMysql()
      return positiveIds(payload.hits)
    } catch {
      return this.fallbackToMysql()
    }
  }

  private fallbackToMysql(): null {
    if (!fallbackWarningWritten) {
      fallbackWarningWritten = true
      console.warn('[search] Meilisearch is unavailable; continuing with MySQL search.')
    }
    return null
  }
}

export function createMeilisearchProvider(fallback?: MysqlSearchProvider): SearchProvider | null {
  if (!configuredHost()) return null
  return new MeilisearchProvider(fallback)
}
