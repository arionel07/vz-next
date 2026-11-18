import { and, asc, desc, eq, gte, like, or, sql } from 'drizzle-orm'

import { db } from '@/db'
import type { StoreLocale } from '@/lib/locale-routing'

import { brands, categories, productSearch, products, searchQueryStats } from '../../../drizzle/schema'
import { normalizeSearchQuery, type SearchProvider, type SearchProviderSuggestions } from './types'

const MAX_PRODUCT_CANDIDATES = 10000

function escapeLikeValue(query: string) {
  return query.replace(/[\\%_]/gu, (character) => `\\${character}`)
}

function booleanQuery(query: string) {
  return (query.match(/[\p{L}\p{N}]+/gu) ?? [])
    .filter((word) => [...word].length >= 2)
    .slice(0, 8)
    .map((word) => `+${word}*`)
    .join(' ')
}

function likePattern(query: string) {
  return `%${escapeLikeValue(query)}%`
}

function dateDaysAgo(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - Math.max(0, days - 1))
  return date.toISOString().slice(0, 10)
}

function canRecordSearch(query: string) {
  if (query.length < 2 || query.length > 80 || !/\p{L}/u.test(query)) return false
  if (/[\w.+-]+@[\w.-]+\.[a-z]{2,}/iu.test(query)) return false
  const digits = query.match(/\d/gu)?.length ?? 0
  return digits < 10 && !(digits >= 7 && digits / query.length > 0.45)
}

export class MysqlSearchProvider implements SearchProvider {
  async searchProductIds(value: string, _locale: StoreLocale, limit = MAX_PRODUCT_CANDIDATES) {
    const query = normalizeSearchQuery(value)
    if ([...query].length < 2) return []

    const pattern = likePattern(query)
    const fullTextQuery = booleanQuery(query)
    const fallbackMatches = or(
      like(products.titleRu, pattern),
      like(products.titleRo, pattern),
      like(products.sku, pattern),
      like(products.barcode, pattern),
      like(products.searchTeg, pattern),
      like(productSearch.title, pattern),
      like(productSearch.sku, pattern),
      like(productSearch.guid, pattern),
      like(productSearch.color, pattern),
      like(productSearch.volume, pattern),
      like(productSearch.searchText, pattern),
      like(brands.title, pattern),
    )!

    if (!fullTextQuery) return this.findWithLike(fallbackMatches, limit)

    const relevance = sql<number>`MATCH(${productSearch.title}, ${productSearch.sku}, ${productSearch.guid}, ${productSearch.color}, ${productSearch.volume}, ${productSearch.searchText}) AGAINST (${fullTextQuery} IN BOOLEAN MODE)`
    const matches = or(sql<boolean>`${relevance} > 0`, fallbackMatches)!
    try {
      const rows = await db
        .select({ id: products.id, score: sql<number>`COALESCE(MAX(${relevance}), 0)` })
        .from(products)
        .leftJoin(productSearch, eq(productSearch.productId, products.id))
        .leftJoin(brands, eq(brands.id, products.brandId))
        .where(and(eq(products.isShown, 1), matches))
        .groupBy(products.id)
        .orderBy(
          desc(sql`COALESCE(MAX(${relevance}), 0)`),
          desc(products.stock),
          asc(products.sorder),
          desc(products.id),
        )
        .limit(Math.max(1, Math.min(MAX_PRODUCT_CANDIDATES, limit)))
      return rows.map((row) => Number(row.id))
    } catch {
      // Older MySQL snapshots may have the table without its FULLTEXT index.
      return this.findWithLike(fallbackMatches, limit)
    }
  }

  async suggest(value: string, locale: StoreLocale): Promise<SearchProviderSuggestions> {
    const query = normalizeSearchQuery(value)
    if ([...query].length < 2) return { productIds: [], brands: [], categories: [], queries: [] }

    const [productIds, metadata] = await Promise.all([
      this.searchProductIds(query, locale, 40),
      this.suggestMetadata(query, locale),
    ])

    return { productIds, ...metadata }
  }

  async suggestMetadata(value: string, locale: StoreLocale) {
    const query = normalizeSearchQuery(value)
    if ([...query].length < 2) return { brands: [], categories: [], queries: [] }

    const pattern = likePattern(query)
    const categoryTitle = locale === 'ro' ? categories.titleRo : categories.titleRu
    const [brandRows, categoryRows, queries] = await Promise.all([
      db.select({ id: brands.id, title: brands.title })
        .from(brands)
        .where(and(eq(brands.isShown, 1), like(brands.title, pattern)))
        .orderBy(asc(brands.sorder), desc(brands.id))
        .limit(5),
      db.select({ id: categories.id, title: categoryTitle, uri: locale === 'ro' ? categories.uriRo : categories.uriRu })
        .from(categories)
        .where(and(
          eq(categories.isShown, 1),
          or(like(categories.titleRu, pattern), like(categories.titleRo, pattern)),
        ))
        .orderBy(asc(categories.sorder), desc(categories.id))
        .limit(5),
      this.popularQueries(5, query),
    ])

    return { brands: brandRows, categories: categoryRows, queries }
  }

  async popularQueries(limit = 8, prefix = '') {
    const safeLimit = Math.max(1, Math.min(10, Math.floor(limit)))
    const conditions = [gte(searchQueryStats.queryDate, dateDaysAgo(30))]
    const normalizedPrefix = normalizeSearchQuery(prefix)
    if (normalizedPrefix) conditions.push(like(searchQueryStats.queryText, `${escapeLikeValue(normalizedPrefix)}%`))

    const totalSearches = sql<number>`SUM(${searchQueryStats.searchCount})`
    const lastUsed = sql<string>`MAX(${searchQueryStats.updatedAt})`
    try {
      const rows = await db
        .select({ query: searchQueryStats.queryText, total: totalSearches, lastUsed })
        .from(searchQueryStats)
        .where(and(...conditions))
        .groupBy(searchQueryStats.queryText)
        .having(gte(totalSearches, 2))
        .orderBy(desc(totalSearches), desc(lastUsed))
        .limit(safeLimit)

      return rows.map((row) => row.query)
    } catch {
      return []
    }
  }

  async recordSearch(value: string) {
    const query = normalizeSearchQuery(value).toLocaleLowerCase()
    if (!canRecordSearch(query)) return false

    const now = new Date()
    const updatedAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
    try {
      await db.insert(searchQueryStats).values({
        queryDate: updatedAt.slice(0, 10),
        queryText: query,
        searchCount: 1,
        updatedAt,
      }).onDuplicateKeyUpdate({
        set: {
          searchCount: sql`${searchQueryStats.searchCount} + 1`,
          updatedAt,
        },
      })
      return true
    } catch {
      return false
    }
  }

  private async findWithLike(matches: ReturnType<typeof or>, limit: number) {
    const rows = await db
      .select({ id: products.id })
      .from(products)
      .leftJoin(productSearch, eq(productSearch.productId, products.id))
      .leftJoin(brands, eq(brands.id, products.brandId))
      .where(and(eq(products.isShown, 1), matches))
      .groupBy(products.id)
      .orderBy(desc(products.stock), asc(products.sorder), desc(products.id))
      .limit(Math.max(1, Math.min(MAX_PRODUCT_CANDIDATES, limit)))
    return rows.map((row) => Number(row.id))
  }
}
