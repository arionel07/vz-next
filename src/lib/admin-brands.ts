import 'server-only'

import { and, asc, count, eq, inArray, isNull, like, or } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'

import { db } from '@/db'
import { brands, products } from '../../drizzle/schema'

export type AdminBrandStatus = 'all' | 'shown' | 'hidden'

export async function getAdminBrandList({ query, status, page }: { query: string; status: AdminBrandStatus; page: number }) {
  const pageSize = 50
  const conditions: SQL[] = []
  if (query) {
    const pattern = `%${query}%`
    conditions.push(or(like(brands.title, pattern), like(brands.uri, pattern), like(brands.h1Ru, pattern), like(brands.h1Ro, pattern))!)
  }
  if (status === 'shown') conditions.push(eq(brands.isShown, 1))
  if (status === 'hidden') conditions.push(or(eq(brands.isShown, 0), isNull(brands.isShown))!)
  const where = conditions.length ? and(...conditions) : undefined

  const [rows, countRows, statsRows] = await Promise.all([
    db.select({
      id: brands.id,
      title: brands.title,
      uri: brands.uri,
      img: brands.img,
      h1Ru: brands.h1Ru,
      h1Ro: brands.h1Ro,
      breadcrumbTitleRu: brands.breadcrumbTitleRu,
      breadcrumbTitleRo: brands.breadcrumbTitleRo,
      textRu: brands.textRu,
      textRo: brands.textRo,
      seoTitleRu: brands.seoTitleRu,
      seoTitleRo: brands.seoTitleRo,
      seoDescRu: brands.seoDescRu,
      seoDescRo: brands.seoDescRo,
      seoTextRu: brands.seoTextRu,
      seoTextRo: brands.seoTextRo,
      sorder: brands.sorder,
      top: brands.top,
      isShown: brands.isShown,
    }).from(brands).where(where).orderBy(asc(brands.sorder), asc(brands.title), asc(brands.id)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ value: count() }).from(brands).where(where),
    db.select({ isShown: brands.isShown, value: count() }).from(brands).groupBy(brands.isShown),
  ])

  const ids = rows.map((row) => row.id)
  const usageRows = ids.length
    ? await db.select({ brandId: products.brandId, value: count() }).from(products).where(inArray(products.brandId, ids)).groupBy(products.brandId)
    : []
  const usageByBrand = new Map(usageRows.map((row) => [row.brandId, Number(row.value)]))
  const total = Number(countRows[0]?.value ?? 0)
  const stats = { total: 0, shown: 0, hidden: 0 }
  for (const row of statsRows) {
    const value = Number(row.value)
    stats.total += value
    if (row.isShown === 1) stats.shown += value
    else stats.hidden += value
  }

  return {
    rows: rows.map((row) => ({ ...row, productCount: usageByBrand.get(row.id) ?? 0 })),
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    stats,
  }
}
