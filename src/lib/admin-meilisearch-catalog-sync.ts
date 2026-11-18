import 'server-only'

import { and, eq, gt, inArray, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/mysql-core'

import { db } from '@/db'
import { brands, categories, products, productsImg, productsVariable } from '../../drizzle/schema'

import {
  isMeilisearchConfigured,
  meilisearchDeleteDocuments,
  meilisearchEnsureIndex,
  meilisearchGetIndex,
  meilisearchIndexName,
  meilisearchUpdateDocuments,
} from './admin-meilisearch-client'

/**
 * Rebuilds the public product projection sent to Meilisearch. Ported from
 * the legacy `Meilisearch_catalog_sync` library
 * (application/libraries/Meilisearch_catalog_sync.php) — same document
 * shape and the same eligibility rules (shown, not a gift, has an image,
 * has a resolvable price), so the index stays a drop-in replacement for
 * the legacy one rather than a second, diverging schema.
 */

export type MeilisearchReindexPhase = 'bestsellers' | 'remaining' | 'all'

type ProductSyncRow = {
  id: number
  sku: string
  guid: string
  barcode: string | null
  categoryId: number | null
  brandId: number | null
  titleRu: string | null
  titleRo: string | null
  titleEn: string | null
  uriRu: string | null
  uriRo: string | null
  price: number | null
  currentPrice: number | null
  priceWh: number | null
  discountPrice: number | null
  salePercent: number
  saleMdl: number
  stock: number
  bestSelling: number
  hasDiscount: number
  onStock: number
  onStockWh: number
  volume: string
  isNew: number | null
  sex: string | null
  searchTeg: string
  brandTitle: string | null
  categoryTitleRu: string | null
  categoryTitleRo: string | null
  categoryPathRu: string | null
  categoryPathRo: string | null
  categoryUriRu: string | null
  categoryUriRo: string | null
  image: string | null
  indexedSearchText: string | null
  variantSkus: string | null
  variantBarcodes: string | null
  hasVariants: number
}

export type MeilisearchProductDocument = {
  id: number
  SKU: string
  GUID: string
  barcode: string
  variant_barcodes: string
  titleRU: string
  titleRO: string
  titleEN: string
  brand_id: number
  brand: string
  category_id: number
  categoryRU: string
  categoryRO: string
  category_pathRU: string
  category_pathRO: string
  category_uriRU: string
  category_uriRO: string
  uriRU: string
  uriRO: string
  image: string
  volume: string
  price: number
  current_price: number
  priceWH: number
  discount_price: number
  has_discount: boolean
  sale_percent: number
  sale_mdl: number
  stock: number
  best_selling: number
  sex: string
  on_stock: number
  on_stockWH: number
  has_stock: 0 | 1
  is_new: number
  has_variants: boolean
  search_text: string
  variant_skus: string
}

const categoryParent1 = alias(categories, 'category_parent_1')
const categoryParent2 = alias(categories, 'category_parent_2')
const categoryParent3 = alias(categories, 'category_parent_3')
const categoryParent4 = alias(categories, 'category_parent_4')

function selectEligibleProducts(where: ReturnType<typeof and>, limit: number, orderByIdAsc: boolean) {
  return db
    .select({
      id: products.id,
      sku: products.sku,
      guid: products.guid,
      barcode: products.barcode,
      categoryId: products.categoryId,
      brandId: products.brandId,
      titleRu: products.titleRu,
      titleRo: products.titleRo,
      titleEn: products.titleEn,
      uriRu: products.uriRu,
      uriRo: products.uriRo,
      price: sql<number | null>`
        CASE WHEN ${products.price} > 0 THEN ${products.price}
        ELSE (
          SELECT MIN(pv.price) FROM products_variable pv
          WHERE pv.product_id = ${products.id} AND pv.isShown = 1 AND pv.price > 0 AND pv.qty > 0
        ) END`,
      currentPrice: sql<number | null>`
        COALESCE(
          (
            SELECT MIN(CASE
              WHEN CAST(NULLIF(pv.discount_price, '') AS DECIMAL(12, 2)) > 0
               AND CAST(NULLIF(pv.discount_price, '') AS DECIMAL(12, 2)) < pv.price
              THEN CAST(NULLIF(pv.discount_price, '') AS DECIMAL(12, 2))
              ELSE pv.price
            END)
            FROM products_variable pv
            WHERE pv.product_id = ${products.id} AND pv.isShown = 1 AND pv.price > 0 AND pv.qty > 0
          ),
          CASE
            WHEN ${products.discountPrice} > 0 AND ${products.discountPrice} < ${products.price}
            THEN ${products.discountPrice}
            ELSE ${products.price}
          END
        )`,
      priceWh: sql<number | null>`
        CASE WHEN ${products.priceWh} > 0 THEN ${products.priceWh}
        ELSE (
          SELECT MIN(pv.priceWh) FROM products_variable pv
          WHERE pv.product_id = ${products.id} AND pv.isShown = 1 AND pv.priceWh > 0 AND pv.qtyWh > 0
        ) END`,
      discountPrice: products.discountPrice,
      salePercent: products.salePercent,
      saleMdl: products.saleMdl,
      stock: products.stock,
      bestSelling: products.bestSelling,
      hasDiscount: sql<number>`
        CASE WHEN (
          ${products.discountPrice} > 0 AND ${products.discountPrice} < ${products.price}
        ) OR EXISTS(
          SELECT 1 FROM products_variable pv
          WHERE pv.product_id = ${products.id} AND pv.isShown = 1 AND pv.price > 0 AND pv.qty > 0
            AND CAST(NULLIF(pv.discount_price, '') AS DECIMAL(12, 2)) > 0
            AND CAST(NULLIF(pv.discount_price, '') AS DECIMAL(12, 2)) < pv.price
        ) THEN 1 ELSE 0 END`,
      onStock: sql<number>`
        CASE WHEN ${products.onStock} > 0 THEN ${products.onStock}
        ELSE (
          SELECT COALESCE(SUM(pv.qty), 0) FROM products_variable pv
          WHERE pv.product_id = ${products.id} AND pv.isShown = 1 AND pv.price > 0 AND pv.qty > 0
        ) END`,
      onStockWh: sql<number>`
        CASE WHEN ${products.onStockWh} > 0 THEN ${products.onStockWh}
        ELSE (
          SELECT COALESCE(SUM(pv.qtyWh), 0) FROM products_variable pv
          WHERE pv.product_id = ${products.id} AND pv.isShown = 1 AND pv.priceWh > 0 AND pv.qtyWh > 0
        ) END`,
      volume: products.volume,
      isNew: products.isNew,
      sex: products.sex,
      searchTeg: products.searchTeg,
      brandTitle: brands.title,
      categoryTitleRu: categories.titleRu,
      categoryTitleRo: categories.titleRo,
      categoryPathRu: sql<string | null>`CONCAT_WS(' ', ${categories.titleRu}, ${categoryParent1.titleRu}, ${categoryParent2.titleRu}, ${categoryParent3.titleRu}, ${categoryParent4.titleRu})`,
      categoryPathRo: sql<string | null>`CONCAT_WS(' ', ${categories.titleRo}, ${categoryParent1.titleRo}, ${categoryParent2.titleRo}, ${categoryParent3.titleRo}, ${categoryParent4.titleRo})`,
      categoryUriRu: categories.uriRu,
      categoryUriRo: categories.uriRo,
      image: sql<string | null>`(
        SELECT pi.img FROM products_img pi
        WHERE pi.product_id = ${products.id}
        ORDER BY pi.sorder ASC, pi.id DESC
        LIMIT 1
      )`,
      indexedSearchText: sql<string | null>`(
        SELECT GROUP_CONCAT(DISTINCT CONCAT_WS(' ', pv.titleRu, pv.titleRo, pv.titleEn, pv.colorRu, pv.colorRo, pv.colorEn, pv.VolumeVar) SEPARATOR ' ')
        FROM products_variable pv WHERE pv.product_id = ${products.id} AND pv.isShown = 1
      )`,
      variantSkus: sql<string | null>`(
        SELECT GROUP_CONCAT(DISTINCT pv.SKU SEPARATOR ' ') FROM products_variable pv
        WHERE pv.product_id = ${products.id} AND pv.isShown = 1
      )`,
      variantBarcodes: sql<string | null>`(
        SELECT GROUP_CONCAT(DISTINCT pv.barcode SEPARATOR ' ') FROM products_variable pv
        WHERE pv.product_id = ${products.id} AND pv.isShown = 1
      )`,
      hasVariants: sql<number>`EXISTS(
        SELECT 1 FROM products_variable pv WHERE pv.product_id = ${products.id} AND pv.isShown = 1
      )`,
    })
    .from(products)
    .leftJoin(brands, eq(brands.id, products.brandId))
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .leftJoin(categoryParent1, eq(categoryParent1.id, categories.parentId))
    .leftJoin(categoryParent2, eq(categoryParent2.id, categoryParent1.parentId))
    .leftJoin(categoryParent3, eq(categoryParent3.id, categoryParent2.parentId))
    .leftJoin(categoryParent4, eq(categoryParent4.id, categoryParent3.parentId))
    .where(where)
    .orderBy(orderByIdAsc ? sql`${products.id} ASC` : sql`${products.id} DESC`)
    .limit(limit)
}

function eligibilityConditions(extra: ReturnType<typeof sql> | undefined) {
  const base = [
    eq(products.isShown, 1),
    eq(products.isGift, 0),
    sql`EXISTS(SELECT 1 FROM products_img pi WHERE pi.product_id = ${products.id})`,
    sql`(${products.price} > 0 OR EXISTS(
      SELECT 1 FROM products_variable pv
      WHERE pv.product_id = ${products.id} AND pv.isShown = 1 AND pv.price > 0 AND pv.qty > 0
    ))`,
  ]
  return extra ? and(extra, ...base) : and(...base)
}

/** Products for an incremental reindex batch, ordered by id for stable pagination. */
export async function getProductRowsForSync(afterId: number, limit: number, phase: MeilisearchReindexPhase = 'all') {
  const safeLimit = Math.max(1, Math.min(1000, Math.floor(limit)))
  const phaseCondition =
    phase === 'bestsellers' ? and(gt(products.id, afterId), eq(products.bestSelling, 1))
    : phase === 'remaining' ? and(gt(products.id, afterId), sql`(${products.bestSelling} <> 1 OR ${products.bestSelling} IS NULL)`)
    : gt(products.id, afterId)

  return selectEligibleProducts(eligibilityConditions(phaseCondition), safeLimit, true) as Promise<ProductSyncRow[]>
}

/** Products whose indexed brand text can change after a brand edit. */
export async function getProductIdsForBrand(brandId: number) {
  if (!Number.isInteger(brandId) || brandId <= 0) return []
  const rows = await db.select({ id: products.id }).from(products).where(eq(products.brandId, brandId))
  return rows.map((row) => row.id)
}

/**
 * Products in a category subtree. Search documents embed ancestor names,
 * so editing a parent category must also refresh its descendants' documents.
 */
export async function getProductIdsForCategoryTree(categoryId: number) {
  if (!Number.isInteger(categoryId) || categoryId <= 0) return []

  const all = await db.select({ id: categories.id, parentId: categories.parentId }).from(categories)
  const childrenByParent = new Map<number, number[]>()
  for (const category of all) {
    const list = childrenByParent.get(category.parentId) ?? []
    list.push(category.id)
    childrenByParent.set(category.parentId, list)
  }

  const categoryIds = [categoryId]
  const seen = new Set(categoryIds)
  for (let i = 0; i < categoryIds.length; i += 1) {
    for (const childId of childrenByParent.get(categoryIds[i]) ?? []) {
      if (seen.has(childId)) continue
      seen.add(childId)
      categoryIds.push(childId)
    }
  }

  const rows = await db.select({ id: products.id }).from(products).where(inArray(products.categoryId, categoryIds))
  return rows.map((row) => row.id)
}

function cleanText(value: string | null | undefined) {
  if (!value) return ''
  return value.replace(/<[^>]*>/gu, ' ').trim()
}

export function makeMeilisearchDocument(row: ProductSyncRow): MeilisearchProductDocument {
  const searchText = [
    row.indexedSearchText, row.searchTeg, row.titleRu, row.titleRo, row.titleEn,
    row.brandTitle, row.categoryTitleRu, row.categoryTitleRo, row.categoryPathRu, row.categoryPathRo,
  ].filter((value) => (value ?? '').toString().trim() !== '').join(' ')

  return {
    id: row.id,
    SKU: row.sku ?? '',
    GUID: row.guid ?? '',
    barcode: row.barcode ?? '',
    variant_barcodes: cleanText(row.variantBarcodes),
    titleRU: cleanText(row.titleRu),
    titleRO: cleanText(row.titleRo),
    titleEN: cleanText(row.titleEn),
    brand_id: row.brandId ?? 0,
    brand: cleanText(row.brandTitle),
    category_id: row.categoryId ?? 0,
    categoryRU: cleanText(row.categoryTitleRu),
    categoryRO: cleanText(row.categoryTitleRo),
    category_pathRU: cleanText(row.categoryPathRu),
    category_pathRO: cleanText(row.categoryPathRo),
    category_uriRU: row.categoryUriRu ?? '',
    category_uriRO: row.categoryUriRo ?? '',
    uriRU: row.uriRu ?? '',
    uriRO: row.uriRo ?? '',
    image: row.image ?? '',
    volume: row.volume ?? '',
    price: Number(row.price) || 0,
    current_price: Number(row.currentPrice) || 0,
    priceWH: Number(row.priceWh) || 0,
    discount_price: Number(row.discountPrice) || 0,
    has_discount: Boolean(row.hasDiscount),
    sale_percent: Number(row.salePercent) || 0,
    sale_mdl: Number(row.saleMdl) || 0,
    stock: Number(row.stock) || 0,
    best_selling: Number(row.bestSelling) || 0,
    sex: row.sex ?? '',
    on_stock: Number(row.onStock) || 0,
    on_stockWH: Number(row.onStockWh) || 0,
    has_stock: Number(row.onStock) > 0 ? 1 : 0,
    is_new: Number(row.isNew) || 0,
    has_variants: Boolean(row.hasVariants),
    search_text: cleanText(searchText),
    variant_skus: cleanText(row.variantSkus),
  }
}

/**
 * Updates (or removes, if no longer eligible) the Meilisearch documents for
 * the given product ids. Best-effort: callers should treat `false` as "log
 * and move on", the same as the legacy import/admin flows do — a failed
 * sync must never block saving the product in MySQL.
 */
export async function syncProductsToMeilisearch(productIds: number[]): Promise<boolean> {
  const ids = [...new Set(productIds.filter((id) => Number.isInteger(id) && id > 0))]
  if (!ids.length) return true
  if (!isMeilisearchConfigured()) return false

  const index = meilisearchIndexName()
  if (!(await meilisearchGetIndex(index)).ok) {
    console.error('[admin-meilisearch] catalog sync skipped: index is unavailable')
    return false
  }

  let allSucceeded = true
  for (let offset = 0; offset < ids.length; offset += 500) {
    const chunk = ids.slice(offset, offset + 500)
    const rows = (await selectEligibleProducts(
      eligibilityConditions(inArray(products.id, chunk)),
      chunk.length,
      true,
    )) as ProductSyncRow[]

    const documents = rows.map((row) => makeMeilisearchDocument(row))
    const indexedIds = new Set(rows.map((row) => row.id))

    if (documents.length) {
      const result = await meilisearchUpdateDocuments(index, documents, 'id')
      if (!result.ok) {
        console.error('[admin-meilisearch] catalog sync failed updating documents', result.error)
        allSucceeded = false
      }
    }

    const removedIds = chunk.filter((id) => !indexedIds.has(id))
    if (removedIds.length) {
      const result = await meilisearchDeleteDocuments(index, removedIds)
      if (!result.ok) {
        console.error('[admin-meilisearch] catalog sync failed removing documents', result.error)
        allSucceeded = false
      }
    }
  }

  return allSucceeded
}

export async function ensureMeilisearchIndexReady() {
  return meilisearchEnsureIndex(meilisearchIndexName())
}
