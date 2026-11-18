import type { CatalogProductSort, ProductFilters } from '@/lib/catalog'

export type CatalogQueryValue = string | string[] | undefined
export type CatalogQuery = Record<string, CatalogQueryValue>

function first(value: CatalogQueryValue) {
  return Array.isArray(value) ? value[0] : value
}

function all(query: CatalogQuery, key: string) {
  const value = query[key]
  return (Array.isArray(value) ? value : value ? [value] : []).filter(Boolean)
}

function positiveInteger(value: string | undefined) {
  const number = Number(value)
  return Number.isInteger(number) && number > 0 ? number : undefined
}

function nonNegativeNumber(value: string | undefined) {
  if (value === undefined || value.trim() === '') return undefined
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : undefined
}

export function catalogPageNumber(query: CatalogQuery) {
  return positiveInteger(first(query.page)) ?? 1
}

export function catalogSort(query: CatalogQuery): CatalogProductSort {
  const value = first(query.sort) ?? first(query.sorder)
  switch (value) {
    case '1':
    case 'popular': return 'popular'
    case '2':
    case 'price-asc': return 'price-asc'
    case '3':
    case 'price-desc': return 'price-desc'
    case '4':
    case 'discount': return 'discount'
    case 'new': return 'new'
    default: return 'default'
  }
}

export function parseCatalogFilters(query: CatalogQuery, pageSize: number): ProductFilters {
  const features: Record<number, number[]> = {}
  for (const [key, value] of Object.entries(query)) {
    const match = /^feature\[(\d+)\](?:\[\])?$/.exec(key)
    if (!match) continue
    const featureId = positiveInteger(match[1])
    if (!featureId) continue
    const values = (Array.isArray(value) ? value : value ? [value] : [])
      .map(positiveInteger)
      .filter((id): id is number => Boolean(id))
    if (values.length) features[featureId] = values
  }

  const categoryIds = [...new Set([...all(query, 'category[]'), ...all(query, 'category')]
    .map(positiveInteger)
    .filter((id): id is number => Boolean(id)))]
  const brandIds = [...new Set([...all(query, 'brand[]'), ...all(query, 'brand')]
    .map(positiveInteger)
    .filter((id): id is number => Boolean(id)))]
  const sex = [...new Set([...all(query, 'sex[]'), ...all(query, 'sex')])]
  const page = catalogPageNumber(query)
  const requestedPriceMin = nonNegativeNumber(first(query.price_min))
  const requestedPriceMax = nonNegativeNumber(first(query.price_max))

  return {
    search: first(query.q)?.trim() || undefined,
    sort: catalogSort(query),
    page,
    pageSize,
    categoryIds: categoryIds.length ? categoryIds : undefined,
    brandIds: brandIds.length ? brandIds : undefined,
    sex: sex.length ? sex : undefined,
    inStock: ['1', 'true', 'on'].includes((first(query.in_stock) ?? '').toLowerCase()),
    discounted: ['1', 'true', 'on'].includes((first(query.discounted) ?? '').toLowerCase()),
    priceMin: requestedPriceMin,
    priceMax: requestedPriceMax === undefined ? undefined : Math.max(requestedPriceMin ?? 0, requestedPriceMax),
    features: Object.keys(features).length ? features : undefined,
  }
}

export function catalogQueryString(query: CatalogQuery, page: number) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (key === 'page' || value === undefined) continue
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== '') search.append(key, item)
    }
  }
  if (page > 1) search.set('page', String(page))
  return search.toString()
}

