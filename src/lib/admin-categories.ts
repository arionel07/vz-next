import 'server-only'

import { and, asc, count, eq, inArray, isNull, like, or } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'

import { db } from '@/db'
import { categories, categoryBanner, products, productCategories, shopType } from '../../drizzle/schema'

export type AdminCategoryStatus = 'all' | 'shown' | 'hidden'

export async function getAdminCategoryList({ query, status, page }: { query: string; status: AdminCategoryStatus; page: number }) {
  const pageSize = 50
  const conditions: SQL[] = []
  if (query) {
    const pattern = `%${query}%`
    conditions.push(or(
      like(categories.titleRu, pattern), like(categories.titleRo, pattern),
      like(categories.uriRu, pattern), like(categories.uriRo, pattern),
      like(categories.h1Ru, pattern), like(categories.h1Ro, pattern),
    )!)
  }
  if (status === 'shown') conditions.push(eq(categories.isShown, 1))
  if (status === 'hidden') conditions.push(or(eq(categories.isShown, 0), isNull(categories.isShown))!)
  const where = conditions.length ? and(...conditions) : undefined

  const [rows, countRows, statsRows, parentOptions, featureTypes] = await Promise.all([
    db.select({
      id: categories.id,
      parentId: categories.parentId,
      featureType: categories.featureType,
      step: categories.step,
      titleRu: categories.titleRu,
      titleRo: categories.titleRo,
      h1Ru: categories.h1Ru,
      h1Ro: categories.h1Ro,
      breadcrumbTitleRu: categories.breadcrumbTitleRu,
      breadcrumbTitleRo: categories.breadcrumbTitleRo,
      uriRu: categories.uriRu,
      uriRo: categories.uriRo,
      img: categories.img,
      descRu: categories.descRu,
      descRo: categories.descRo,
      seoTitleRu: categories.seoTitleRu,
      seoTitleRo: categories.seoTitleRo,
      seoDescRu: categories.seoDescRu,
      seoDescRo: categories.seoDescRo,
      seoTextRu: categories.seoTextRu,
      seoTextRo: categories.seoTextRo,
      searchTeg: categories.searchTeg,
      calculator: categories.calculator,
      imgNav: categories.imgNav,
      imgNavHover: categories.imgNavHover,
      topMenu: categories.topMenu,
      footerMenu: categories.footerMenu,
      wallpaper: categories.wallpaper,
      isCustomMobile: categories.isCustomMobile,
      sorder: categories.sorder,
      isShown: categories.isShown,
    }).from(categories).where(where).orderBy(asc(categories.sorder), asc(categories.id)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ value: count() }).from(categories).where(where),
    db.select({ isShown: categories.isShown, value: count() }).from(categories).groupBy(categories.isShown),
    db.select({ id: categories.id, parentId: categories.parentId, step: categories.step, titleRu: categories.titleRu, titleRo: categories.titleRo })
      .from(categories).orderBy(asc(categories.step), asc(categories.sorder), asc(categories.id)),
    db.select({ id: shopType.id, name: shopType.name }).from(shopType).orderBy(asc(shopType.sorder), asc(shopType.id)),
  ])

  const ids = rows.map((row) => row.id)
  const [primaryUsage, relatedUsage, sharedUsage, bannerRows] = ids.length ? await Promise.all([
    db.select({ categoryId: products.categoryId, value: count() }).from(products)
      .where(inArray(products.categoryId, ids))
      .groupBy(products.categoryId),
    db.select({ categoryId: productCategories.categoryId, value: count() }).from(productCategories)
      .where(inArray(productCategories.categoryId, ids)).groupBy(productCategories.categoryId),
    db.select({ categoryId: products.categoryId, value: count() }).from(products)
      .innerJoin(productCategories, and(eq(productCategories.productId, products.id), eq(productCategories.categoryId, products.categoryId)))
      .where(inArray(products.categoryId, ids)).groupBy(products.categoryId),
    db.select({
      id: categoryBanner.id, categoryId: categoryBanner.categoryId,
      titleRu: categoryBanner.titleRu, titleRo: categoryBanner.titleRo,
      uriRu: categoryBanner.uriRu, uriRo: categoryBanner.uriRo,
      descRu: categoryBanner.descRu, descRo: categoryBanner.descRo,
      img: categoryBanner.img, sorder: categoryBanner.sorder, isShown: categoryBanner.isShown,
    }).from(categoryBanner).where(inArray(categoryBanner.categoryId, ids)).orderBy(asc(categoryBanner.id)),
  ]) : [[], [], [], []]

  const usageByCategory = new Map<number, number>()
  for (const row of [...primaryUsage, ...relatedUsage]) {
    if (row.categoryId === null) continue
    usageByCategory.set(row.categoryId, (usageByCategory.get(row.categoryId) ?? 0) + Number(row.value))
  }
  for (const row of sharedUsage) {
    if (row.categoryId === null) continue
    usageByCategory.set(row.categoryId, Math.max(0, (usageByCategory.get(row.categoryId) ?? 0) - Number(row.value)))
  }

  const bannersByCategory = new Map<number, typeof bannerRows>()
  for (const banner of bannerRows) bannersByCategory.set(banner.categoryId, [...(bannersByCategory.get(banner.categoryId) ?? []), banner])

  const parentsById = new Map(parentOptions.map((category) => [category.id, category]))
  const total = Number(countRows[0]?.value ?? 0)
  const stats = { total: 0, shown: 0, hidden: 0 }
  for (const row of statsRows) {
    const value = Number(row.value)
    stats.total += value
    if (row.isShown === 1) stats.shown += value
    else stats.hidden += value
  }

  return {
    rows: rows.map((row) => ({
      ...row,
      parentTitleRu: parentsById.get(row.parentId)?.titleRu ?? null,
      parentTitleRo: parentsById.get(row.parentId)?.titleRo ?? null,
      productCount: usageByCategory.get(row.id) ?? 0,
      banners: bannersByCategory.get(row.id) ?? [],
    })),
    parents: parentOptions,
    featureTypes,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    stats,
  }
}
