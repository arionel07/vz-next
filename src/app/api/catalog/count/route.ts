import { NextResponse } from 'next/server'

import {
  getBrandPage,
  getCatalogCollectionPage,
  getCatalogPage,
  getCategoryPage,
  getSearchPage,
} from '@/lib/catalog'
import { parseCatalogFilters, type CatalogQuery } from '@/lib/catalog-query'
import type { CatalogCountContext } from '@/lib/catalog-count'
import type { StoreLocale } from '@/lib/locale-routing'

type CountRequest = {
  context?: unknown
  locale?: unknown
  query?: unknown
}

function isCountContext(value: unknown): value is CatalogCountContext {
  if (!value || typeof value !== 'object') return false
  const context = value as Record<string, unknown>
  if (context.kind === 'catalog' || context.kind === 'sale') return true
  if (context.kind === 'category') return typeof context.uri === 'string' && context.uri.length > 0
  if (context.kind === 'search') return typeof context.query === 'string'
  return context.kind === 'brand' && typeof context.brandId === 'number' && Number.isInteger(context.brandId)
}

function isCatalogQuery(value: unknown): value is CatalogQuery {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as CountRequest
    if (!isCountContext(body.context)) {
      return NextResponse.json({ error: 'Invalid catalog context' }, { status: 400 })
    }

    const locale: StoreLocale = body.locale === 'ro' ? 'ro' : 'ru'
    const query = isCatalogQuery(body.query) ? body.query : {}
    const filters = parseCatalogFilters(query, 1)
    const categoryFilters = { ...filters }
    delete categoryFilters.categoryIds
    delete categoryFilters.categoryId

    const result = body.context.kind === 'catalog'
      ? await getCatalogPage({ ...filters, page: 1, pageSize: 1 }, locale)
      : body.context.kind === 'sale'
        ? await getCatalogCollectionPage('sale', { ...filters, page: 1, pageSize: 1 }, locale)
        : body.context.kind === 'category'
          ? await getCategoryPage(body.context.uri, { ...categoryFilters, page: 1, pageSize: 1 }, locale)
          : body.context.kind === 'brand'
            ? await getBrandPage(body.context.brandId, { ...filters, page: 1, pageSize: 1 }, locale)
            : await getSearchPage(body.context.query, { ...filters, page: 1, pageSize: 1 }, locale)

    return NextResponse.json({ count: result?.total ?? 0 })
  } catch {
    return NextResponse.json({ error: 'Unable to calculate catalog count' }, { status: 500 })
  }
}
