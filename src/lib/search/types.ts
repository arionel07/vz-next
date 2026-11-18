import type { StoreLocale } from '@/lib/locale-routing'

export type SearchEntitySuggestion = {
  id: number
  title: string | null
  uri?: string | null
}

export type SearchProviderSuggestions = {
  productIds: number[]
  brands: SearchEntitySuggestion[]
  categories: SearchEntitySuggestion[]
  queries: string[]
}

export interface SearchProvider {
  searchProductIds(query: string, locale: StoreLocale, limit?: number): Promise<number[]>
  suggest(query: string, locale: StoreLocale): Promise<SearchProviderSuggestions>
  popularQueries(limit?: number, prefix?: string): Promise<string[]>
  recordSearch(query: string): Promise<boolean>
}

export function normalizeSearchQuery(value: unknown, maxLength = 80) {
  if (typeof value !== 'string') return ''
  return value
    .replace(/<[^>]*>/gu, ' ')
    .replace(/&(?:nbsp|amp|lt|gt|quot|#39);/giu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, maxLength)
}
