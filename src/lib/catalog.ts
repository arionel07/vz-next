import { asc, and, count, desc, eq, exists, gt, gte, inArray, isNotNull, like, lte, ne, notInArray, or, sql } from 'drizzle-orm'

import { db } from '@/db'
import { getActiveOfferForProduct } from '@/lib/offers'
import { getActiveGiftPromotionForProduct } from '@/lib/gift-promotions'
import { legacyAsset } from '@/lib/legacy-assets'
import { enrichCatalogProducts } from '@/lib/catalog-card-data'
import type { StoreLocale } from '@/lib/locale-routing'
import { normalizeSearchQuery, searchProvider } from '@/lib/search'
import {
  brands,
  categories,
  ordersProducts,
  products,
  productsFeatures,
  productsImg,
  productsMore,
  productsRelated,
  productCategories,
  productsVariable,
  productsVariableImg,
  shopFeature,
  shopFeatureValues,
} from '../../drizzle/schema'

export type CatalogProduct = {
  id: number
  title: string | null
  price: number | null
  discountPrice: number | null
  brand: string | null
  category: string | null
  sku: string
  image: string | null
  volume?: string | null
  hasBasePrice?: boolean
  gallery?: string[]
  stock?: number
  variants?: CatalogCardVariant[]
  locale?: StoreLocale
}

export type CatalogCardVariant = {
  id: number
  volume: string | null
  color: string | null
  colorHex: string | null
  colorData: string | null
  price: number | null
  discountPrice: number | null
  quantity: number
  images: string[]
}

export type ProductVariant = {
  id: number
  sku: string | null
  title: string | null
  color: string | null
  colorHex: string | null
  colorData: string | null
  volume: string
  price: number | null
  discountPrice: number | null
  quantity: number
  images: string[]
}

export type ProductCategoryLink = { id: number; title: string; uri: string | null; image: string | null }

export type CatalogProductSort = 'default' | 'popular' | 'price-asc' | 'price-desc' | 'discount' | 'new'

export type ProductFilters = {
  search?: string
  categoryId?: number
  categoryIds?: number[]
  brandId?: number
  brandIds?: number[]
  sex?: string[]
  inStock?: boolean
  discounted?: boolean
  priceMin?: number
  priceMax?: number
  features?: Record<number, number[]>
  collection?: 'new' | 'hits' | 'sale'
  sort?: CatalogProductSort
  page?: number
  pageSize?: number
  excludeProductId?: number
  excludeProductIds?: number[]
  productIds?: number[]
}

function getPublicCatalogConditions(isB2B = false) {
  const pricedVariantIds = db.select({ productId: productsVariable.productId })
    .from(productsVariable)
    .innerJoin(productsVariableImg, eq(productsVariableImg.variableId, productsVariable.id))
    .where(and(
      eq(productsVariable.isShown, 1),
      gt(isB2B ? productsVariable.priceWh : productsVariable.price, 0),
      gt(isB2B ? productsVariable.qtyWh : productsVariable.qty, 0),
      eq(productsVariableImg.isShown, 1),
      sql`TRIM(${productsVariableImg.img}) <> ''`,
    ))
  const imageCondition = or(
    exists(db.select({ id: productsImg.id }).from(productsImg).where(and(
      eq(productsImg.productId, products.id), eq(productsImg.isShown, 1), sql`TRIM(${productsImg.img}) <> ''`,
    ))),
    exists(db.select({ id: productsVariableImg.id }).from(productsVariableImg)
      .innerJoin(productsVariable, eq(productsVariableImg.variableId, productsVariable.id))
      .where(and(
        eq(productsVariable.productId, products.id),
        eq(productsVariable.isShown, 1),
        gt(isB2B ? productsVariable.priceWh : productsVariable.price, 0),
        eq(productsVariableImg.isShown, 1),
        sql`TRIM(${productsVariableImg.img}) <> ''`,
      ))),
  )!
  return [
    eq(products.isShown, 1),
    eq(products.isGift, 0),
    isB2B
      ? or(gt(products.priceWh, 0), inArray(products.id, pricedVariantIds))!
      : or(gt(products.price, 0), inArray(products.id, pricedVariantIds))!,
    imageCondition,
  ]
}

export async function fetchProducts(filters: ProductFilters = {}, isB2B = false, locale: StoreLocale = 'ru') {
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? 24
  const offset = (page - 1) * pageSize
  const conditions = [...getPublicCatalogConditions(isB2B)]

  if (filters.categoryIds?.length) {
    conditions.push(filters.collection === 'sale'
      ? inArray(products.categoryId, filters.categoryIds)
      : exists(db.select({ id: productCategories.id }).from(productCategories).where(and(
        eq(productCategories.productId, products.id), inArray(productCategories.categoryId, filters.categoryIds),
      ))))
  } else if (filters.categoryId) {
    conditions.push(exists(db.select({ id: productCategories.id }).from(productCategories).where(and(
      eq(productCategories.productId, products.id), eq(productCategories.categoryId, filters.categoryId!),
    ))))
  }

  if (filters.brandId) {
    conditions.push(eq(products.brandId, filters.brandId))
  }
  if (filters.brandIds?.length) {
    conditions.push(inArray(products.brandId, filters.brandIds))
  }
  const allowedSex = (filters.sex ?? []).filter((value) => ['Женский', 'Мужской', 'Унисекс'].includes(value))
  if (allowedSex.length) conditions.push(inArray(products.sex, allowedSex))
  if (filters.inStock) {
    const stockedVariantProductIds = db.select({ productId: productsVariable.productId })
      .from(productsVariable)
      .where(and(
        eq(productsVariable.isShown, 1),
        gt(isB2B ? productsVariable.priceWh : productsVariable.price, 0),
        gt(isB2B ? productsVariable.qtyWh : productsVariable.qty, 0),
      ))
    conditions.push(or(
      gt(isB2B ? products.onStockWh : products.onStock, 0),
      inArray(products.id, stockedVariantProductIds),
    )!)
  }
  if (filters.discounted) {
    const discountedVariantProductIds = db.select({ productId: productsVariable.productId })
      .from(productsVariable)
      .where(and(
        eq(productsVariable.isShown, 1),
        gt(productsVariable.qty, 0),
        gt(productsVariable.price, 0),
        sql`CAST(NULLIF(${productsVariable.discountPrice}, '') AS DECIMAL(12, 2)) > 0`,
      ))
    conditions.push(or(
      gt(products.discountPrice, 0),
      inArray(products.id, discountedVariantProductIds),
    )!)
  }

  if (filters.collection === 'new') conditions.push(eq(products.isNew, 1))
  if (filters.collection === 'hits') conditions.push(eq(products.bestSelling, 1))
  if (filters.collection === 'sale') {
    const availableVariantProductIds = db.select({ productId: productsVariable.productId })
      .from(productsVariable)
      .where(and(eq(productsVariable.isShown, 1), gt(productsVariable.qty, 0)))
    conditions.push(
      gt(products.discountPrice, 0),
      or(gt(products.onStock, 0), inArray(products.id, availableVariantProductIds))!,
    )
  }

  const variantSortPrice = sql<number>`(
    SELECT MIN(${isB2B ? productsVariable.priceWh : productsVariable.price})
    FROM products_variable
    WHERE products_variable.product_id = ${products.id}
      AND products_variable.isShown = 1
      AND ${isB2B ? sql`products_variable.qtyWh` : sql`products_variable.qty`} > 0
      AND ${isB2B ? sql`products_variable.priceWh` : sql`products_variable.price`} > 0
  )`
  const baseSortPrice = isB2B ? products.priceWh : products.price
  const sortPrice = sql<number>`CASE WHEN ${baseSortPrice} > 0 THEN ${baseSortPrice} ELSE ${variantSortPrice} END`
  if (filters.priceMin !== undefined && Number.isFinite(filters.priceMin)) {
    conditions.push(gte(sortPrice, filters.priceMin))
  }
  if (filters.priceMax !== undefined && Number.isFinite(filters.priceMax)) {
    conditions.push(lte(sortPrice, filters.priceMax))
  }
  for (const [featureIdText, valueIds] of Object.entries(filters.features ?? {})) {
    const featureId = Number(featureIdText)
    const validValueIds = valueIds.filter((value) => Number.isInteger(value) && value > 0)
    if (!Number.isInteger(featureId) || featureId < 1 || !validValueIds.length) continue
    conditions.push(exists(db.select({ id: productsFeatures.id }).from(productsFeatures).where(and(
      eq(productsFeatures.productId, products.id),
      eq(productsFeatures.featureId, featureId),
      inArray(productsFeatures.featureValueId, validValueIds),
    ))))
  }

  if (filters.excludeProductId) {
    conditions.push(ne(products.id, filters.excludeProductId))
  }
  for (const productId of filters.excludeProductIds ?? []) {
    if (Number.isInteger(productId) && productId > 0) conditions.push(ne(products.id, productId))
  }

  if (filters.productIds?.length) {
    conditions.push(inArray(products.id, filters.productIds))
  }

  const search = filters.search?.trim()
  const productTitle = locale === 'ro' ? products.titleRo : products.titleRu
  const categoryTitle = locale === 'ro' ? categories.titleRo : categories.titleRu
  if (search && !filters.productIds?.length) {
    const term = `%${search}%`
    conditions.push(
      or(
        like(productTitle, term),
        like(products.sku, term),
        like(brands.title, term),
      )!,
    )
  }

  const explicitSortIdOrder = filters.brandId ? desc(products.id) : asc(products.id)
  const searchRankOrder = filters.search && filters.productIds?.length
    ? sql`FIELD(${products.id}, ${sql.join(filters.productIds.map((id) => sql`${id}`), sql`, `)})`
    : undefined
  const orderBy =
    filters.sort === 'popular'
      ? [desc(products.stock), desc(products.bestSelling), explicitSortIdOrder]
      : filters.sort === 'price-asc'
      ? [desc(products.stock), asc(sortPrice), explicitSortIdOrder]
      : filters.sort === 'price-desc'
        ? [desc(products.stock), desc(sortPrice), explicitSortIdOrder]
        : filters.sort === 'discount'
          ? [desc(products.stock), desc(products.saleMdl), explicitSortIdOrder]
        : filters.sort === 'new'
          ? [desc(products.isNew), desc(products.stock), asc(products.sorder), desc(products.id)]
          : searchRankOrder
            ? [searchRankOrder]
            : [desc(products.stock), asc(products.sorder), desc(products.id)]

  const rows = await db
    .select({
      id: products.id,
      title: productTitle,
      price: isB2B ? products.priceWh : products.price,
      discountPrice: isB2B ? sql<number | null>`NULL` : products.discountPrice,
      brand: brands.title,
      category: categoryTitle,
      sku: products.sku,
    })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(...conditions))
    .orderBy(...orderBy, asc(products.id))
    .limit(pageSize)
    .offset(offset)

  const [{ total }] = await db
    .select({ total: count() })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(and(...conditions))

  const catalogProducts: CatalogProduct[] = rows.map((product) => ({
    ...product,
    image: null,
    locale,
  }))

  return { products: await enrichCatalogProducts(catalogProducts), total: Number(total) }
}

/** "Bought together" recommendations: products that co-occurred in past orders with any of sourceProductIds. */
export async function getCoPurchasedProducts(
  sourceProductIds: number[],
  options: { exclude?: number[]; limit?: number; isB2B?: boolean; locale?: StoreLocale } = {},
): Promise<CatalogProduct[]> {
  const { exclude = [], limit = 8, isB2B = false, locale = 'ru' } = options
  const sourceIds = [...new Set(sourceProductIds.filter((value) => Number.isInteger(value) && value > 0))]
  if (!sourceIds.length) return []

  const excludeIds = [...new Set([...sourceIds, ...exclude])]

  const orderRows = await db
    .select({ orderId: ordersProducts.orderId })
    .from(ordersProducts)
    .where(inArray(ordersProducts.productId, sourceIds))

  const orderIds = [...new Set(orderRows.map((row) => row.orderId))]
  if (!orderIds.length) return []

  const coRows = await db
    .select({ productId: ordersProducts.productId, score: count() })
    .from(ordersProducts)
    .where(and(
      inArray(ordersProducts.orderId, orderIds),
      isNotNull(ordersProducts.productId),
      notInArray(ordersProducts.productId, excludeIds),
    ))
    .groupBy(ordersProducts.productId)
    .orderBy(desc(count()))
    .limit(limit * 4)

  const candidateIds = coRows.map((row) => row.productId).filter((value): value is number => value != null)
  if (!candidateIds.length) return []

  const { products: candidates } = await fetchProducts({ productIds: candidateIds, pageSize: candidateIds.length }, isB2B, locale)
  const rank = new Map(candidateIds.map((candidateId, index) => [candidateId, index]))
  return candidates
    .slice()
    .sort((a, b) => (rank.get(a.id) ?? candidateIds.length) - (rank.get(b.id) ?? candidateIds.length))
    .slice(0, limit)
}

/** Recommendations for the favorites screen: similar categories first, sale fallback for an empty list. */
export async function getFavoriteRecommendations(favoriteIds: number[], locale: StoreLocale = 'ru', limit = 8) {
  const ids = [...new Set(favoriteIds.filter((id) => Number.isInteger(id) && id > 0))]

  if (ids.length) {
    const favoriteRows = await db
      .select({ categoryId: products.categoryId })
      .from(products)
      .where(inArray(products.id, ids))
    const categoryIds = [...new Set(favoriteRows.map((row) => row.categoryId).filter((id): id is number => typeof id === 'number' && Number.isInteger(id) && id > 0))]
    if (categoryIds.length) {
      const similar = await fetchProducts({
        categoryIds,
        discounted: true,
        inStock: true,
        excludeProductIds: ids,
        pageSize: limit,
        sort: 'popular',
      }, false, locale)
      if (similar.products.length) return similar.products
    }
  }

  const period = Math.floor(Date.now() / (2 * 24 * 60 * 60 * 1000))
  const firstPage = await fetchProducts({ discounted: true, inStock: true, page: 1, pageSize: limit, sort: 'discount' }, false, locale)
  const pageCount = Math.max(1, Math.ceil(firstPage.total / limit))
  const page = (period % pageCount) + 1
  if (page === 1) return firstPage.products

  const rotatingPage = await fetchProducts({ discounted: true, inStock: true, page, pageSize: limit, sort: 'discount' }, false, locale)
  return rotatingPage.products.length ? rotatingPage.products : firstPage.products
}

export async function getCatalogPreview(locale: StoreLocale = 'ru') {
  const result = await fetchProducts({ page: 1, pageSize: 40 }, false, locale)

  return result.products.filter((product) => product.image).slice(0, 8)
}

export async function getProductDescription(id: number, locale: StoreLocale = 'ru') {
  if (!Number.isInteger(id) || id < 1) return null
  const [row] = await db
    .select({
      description: locale === 'ro' ? products.textRo : products.textRu,
      shortDescription: locale === 'ro' ? products.descRo : products.descRu,
    })
    .from(products)
    .where(and(eq(products.id, id), eq(products.isShown, 1), eq(products.isGift, 0)))
    .limit(1)

  return row?.description?.trim() || row?.shortDescription?.trim() || null
}

/** Public product IDs used by the sitemap; shares the catalog's price/image eligibility rules. */
export async function getPublicProductSitemapRows() {
  return db
    .select({ id: products.id, updatedAt: products.updatedAt })
    .from(products)
    .where(and(...getPublicCatalogConditions()))
    .orderBy(asc(products.id))
}

export async function getCatalogPage(filters: ProductFilters = {}, locale: StoreLocale = 'ru') {
  const [result, categoryRows, facets] = await Promise.all([
    fetchProducts(filters, false, locale),
    db
      .select({
        id: categories.id,
        title: locale === 'ro' ? categories.titleRo : categories.titleRu,
        uri: locale === 'ro' ? categories.uriRo : categories.uriRu,
        image: categories.img,
      })
      .from(categories)
      .where(and(eq(categories.isShown, 1), eq(categories.parentId, 0)))
      .orderBy(asc(categories.sorder), asc(categories.id))
      .limit(30),
    getCatalogFacets(locale),
  ])

  return {
    ...result,
    categories: categoryRows,
    facets,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 32,
  }
}

export type CatalogCollection = 'new' | 'hits' | 'sale'
export type CatalogCollectionSort = CatalogProductSort

export async function getCatalogCollectionPage(
  collection: CatalogCollection,
  filters: ProductFilters = {},
  locale: StoreLocale = 'ru',
) {
  const pageSize = filters.pageSize ?? (collection === 'sale' ? 16 : 32)
  const page = filters.page ?? 1
  let collectionFilters = filters
  let facets: CollectionListingFacets | undefined
  let quickCategories: Array<{ id: number; title: string | null; uri: string | null; image: string | null; count: number; order: number }> = []

  if (collection === 'sale') {
    const saleConditions = [
      ...getPublicCatalogConditions(),
      gt(products.discountPrice, 0),
      or(
        gt(products.onStock, 0),
        exists(db.select({ id: productsVariable.id }).from(productsVariable)
          .where(and(eq(productsVariable.productId, products.id), eq(productsVariable.isShown, 1), gt(productsVariable.qty, 0)))),
      )!,
    ]
    const [categoryRows, brandRows, sexRows, priceRows, allCategories] = await Promise.all([
      db.select({
        id: categories.id,
        title: locale === 'ro' ? categories.titleRo : categories.titleRu,
        uri: locale === 'ro' ? categories.uriRo : categories.uriRu,
        image: categories.img,
        parentId: categories.parentId,
        count: sql<number>`COUNT(DISTINCT ${products.id})`,
        order: categories.sorder,
      })
        .from(products)
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .where(and(...saleConditions, eq(categories.isShown, 1)))
        .groupBy(categories.id, categories.titleRu, categories.titleRo, categories.uriRu, categories.uriRo, categories.img, categories.parentId, categories.sorder)
        .orderBy(asc(categories.sorder), asc(categories.id)),
      db.select({ id: brands.id, title: brands.title, count: sql<number>`COUNT(DISTINCT ${products.id})` })
        .from(products).innerJoin(brands, eq(products.brandId, brands.id))
        .where(and(...saleConditions, eq(brands.isShown, 1)))
        .groupBy(brands.id, brands.title)
        .orderBy(asc(brands.title), asc(brands.id)),
      db.select({ sex: products.sex }).from(products).where(and(...saleConditions)).groupBy(products.sex).orderBy(asc(products.sex)),
      db.select({
        min: sql<number>`MIN(CASE WHEN ${products.price} > 0 THEN ${products.price} ELSE (
          SELECT MIN(pv.price) FROM products_variable pv
          WHERE pv.product_id = ${products.id} AND pv.isShown = 1 AND pv.price > 0 AND pv.qty > 0
        ) END)`,
        max: sql<number>`MAX(CASE WHEN ${products.price} > 0 THEN ${products.price} ELSE (
          SELECT MIN(pv.price) FROM products_variable pv
          WHERE pv.product_id = ${products.id} AND pv.isShown = 1 AND pv.price > 0 AND pv.qty > 0
        ) END)`,
      })
        .from(products).where(and(...saleConditions)),
      db.select({
        id: categories.id,
        parentId: categories.parentId,
        title: locale === 'ro' ? categories.titleRo : categories.titleRu,
        uri: locale === 'ro' ? categories.uriRo : categories.uriRu,
        image: categories.img,
        order: categories.sorder,
      }).from(categories).where(eq(categories.isShown, 1)),
    ])
    const allowedCategoryIds = new Set(categoryRows.map((category) => category.id))
    const categoryById = new Map(allCategories.map((category) => [category.id, category]))
    const rootCounts = new Map<number, number>()
    for (const category of categoryRows) {
      let root = categoryById.get(category.id)
      const visited = new Set<number>()
      while (root && root.parentId !== 0 && !visited.has(root.id)) {
        visited.add(root.id)
        root = categoryById.get(root.parentId)
      }
      if (root?.parentId === 0) {
        rootCounts.set(root.id, (rootCounts.get(root.id) ?? 0) + Number(category.count))
      }
    }
    quickCategories = [...rootCounts.entries()]
      .map(([id, count]) => {
        const category = categoryById.get(id)!
        return { id, title: category.title, uri: category.uri, image: category.image, count, order: Number(category.order ?? 0) }
      })
      .sort((left, right) => left.order - right.order || left.id - right.id)

    const childrenByParent = new Map<number, number[]>()
    for (const category of allCategories) {
      const children = childrenByParent.get(category.parentId) ?? []
      children.push(category.id)
      childrenByParent.set(category.parentId, children)
    }
    const selectedCategoryIds = filters.categoryIds ?? []
    const expandedCategoryIds = new Set<number>()
    const addCategoryTree = (id: number) => {
      if (expandedCategoryIds.has(id)) return
      expandedCategoryIds.add(id)
      for (const childId of childrenByParent.get(id) ?? []) addCategoryTree(childId)
    }
    for (const id of selectedCategoryIds) addCategoryTree(id)
    collectionFilters = {
      ...filters,
      categoryIds: selectedCategoryIds.length
        ? [...expandedCategoryIds].filter((id) => allowedCategoryIds.has(id))
        : undefined,
    }
    facets = {
      brands: brandRows.map((row) => ({ ...row, count: Number(row.count) })),
      categories: categoryRows.map((row) => ({ ...row, count: Number(row.count) })) as CategoryOptionFacet[],
      sexes: sexRows.map((row) => row.sex).filter((value): value is string => Boolean(value)),
      priceMin: Number(priceRows[0]?.min ?? 0),
      priceMax: Number(priceRows[0]?.max ?? 0),
    }
  }

  const result = await fetchProducts({
    ...collectionFilters,
    collection,
    search: collection === 'sale' ? filters.search : undefined,
    sort: collection === 'sale' ? filters.sort : 'default',
    page,
    pageSize,
  }, false, locale)
  return { ...result, facets, quickCategories, page, pageSize }
}

export type CatalogCategory = {
  id: number
  parentId: number
  featureType: number
  title: string | null
  h1: string | null
  breadcrumbTitle: string | null
  uri: string | null
  image: string | null
  seoText: string | null
  order: number
}

export type CatalogFacetOption = { id: number; title: string | null; count: number }
export type CatalogFeatureFacet = {
  id: number
  title: string | null
  values: Array<{ id: number; title: string | null; count: number }>
}
export type CategoryListingFacets = {
  brands: CatalogFacetOption[]
  sexes: string[]
  priceMin: number
  priceMax: number
  features: CatalogFeatureFacet[]
}
export type CategoryOptionFacet = CatalogFacetOption & { parentId: number; order: number }
export type CollectionListingFacets = {
  brands: CatalogFacetOption[]
  categories: CategoryOptionFacet[]
  sexes: string[]
  priceMin: number
  priceMax: number
}

async function getCatalogFacets(locale: StoreLocale): Promise<CollectionListingFacets> {
  const baseConditions = getPublicCatalogConditions()
  const priceExpression = sql<number>`CASE WHEN ${products.price} > 0 THEN ${products.price} ELSE (
    SELECT MIN(pv.price) FROM products_variable pv
    WHERE pv.product_id = ${products.id} AND pv.isShown = 1 AND pv.price > 0 AND pv.qty > 0
  ) END`
  const [brandRows, categoryRows, sexRows, priceRows] = await Promise.all([
    db.select({ id: brands.id, title: brands.title, count: sql<number>`COUNT(DISTINCT ${products.id})` })
      .from(products)
      .innerJoin(brands, eq(products.brandId, brands.id))
      .where(and(...baseConditions, eq(brands.isShown, 1)))
      .groupBy(brands.id, brands.title)
      .orderBy(asc(brands.title), asc(brands.id))
      .limit(100),
    db.select({
      id: categories.id,
      title: locale === 'ro' ? categories.titleRo : categories.titleRu,
      parentId: categories.parentId,
      count: sql<number>`COUNT(DISTINCT ${products.id})`,
      order: categories.sorder,
    })
      .from(products)
      .innerJoin(productCategories, eq(productCategories.productId, products.id))
      .innerJoin(categories, eq(categories.id, productCategories.categoryId))
      .where(and(...baseConditions, eq(categories.isShown, 1)))
      .groupBy(categories.id, categories.titleRu, categories.titleRo, categories.parentId, categories.sorder)
      .orderBy(asc(categories.sorder), asc(categories.id))
      .limit(100),
    db.select({ sex: products.sex })
      .from(products)
      .where(and(...baseConditions))
      .groupBy(products.sex)
      .orderBy(asc(products.sex)),
    db.select({ min: sql<number>`MIN(${priceExpression})`, max: sql<number>`MAX(${priceExpression})` })
      .from(products)
      .where(and(...baseConditions)),
  ])
  const bounds = priceRows[0]

  return {
    brands: brandRows.map((row) => ({ ...row, count: Number(row.count) })),
    categories: categoryRows.map((row) => ({ ...row, count: Number(row.count), parentId: Number(row.parentId ?? 0), order: Number(row.order ?? 0) })),
    sexes: sexRows.map((row) => row.sex).filter((value): value is string => Boolean(value)),
    priceMin: Number(bounds?.min ?? 0),
    priceMax: Number(bounds?.max ?? 0),
  }
}

async function getCategoryFacets(categoryIds: number[], featureType: number, locale: StoreLocale) {
  const categoryCondition = exists(db.select({ id: productCategories.id }).from(productCategories).where(and(
    eq(productCategories.productId, products.id), inArray(productCategories.categoryId, categoryIds),
  )))
  const baseConditions = [...getPublicCatalogConditions(), categoryCondition]
  const priceExpression = sql<number>`CASE WHEN ${products.price} > 0 THEN ${products.price} ELSE (
    SELECT MIN(pv.price) FROM products_variable pv
    WHERE pv.product_id = ${products.id} AND pv.isShown = 1 AND pv.price > 0 AND pv.qty > 0
  ) END`
  const featureTitle = locale === 'ro' ? shopFeature.nameRo : shopFeature.nameRu
  const valueTitle = locale === 'ro' ? shopFeatureValues.nameRo : shopFeatureValues.nameRu

  const [brandRows, sexRows, priceRows, featureRows] = await Promise.all([
    db.select({ id: brands.id, title: brands.title, count: sql<number>`COUNT(DISTINCT ${products.id})` })
      .from(products)
      .innerJoin(brands, eq(products.brandId, brands.id))
      .where(and(...baseConditions, eq(brands.isShown, 1)))
      .groupBy(brands.id, brands.title)
      .orderBy(asc(brands.title), asc(brands.id)),
    db.select({ sex: products.sex }).from(products).where(and(...baseConditions)).groupBy(products.sex).orderBy(asc(products.sex)),
    db.select({ min: sql<number>`MIN(${priceExpression})`, max: sql<number>`MAX(${priceExpression})` })
      .from(products).where(and(...baseConditions)),
    db.select({
      featureId: shopFeature.id,
      featureTitle,
      valueId: shopFeatureValues.id,
      valueTitle,
      count: sql<number>`COUNT(DISTINCT ${products.id})`,
      featureOrder: shopFeature.sorder,
      valueOrder: shopFeatureValues.sorder,
    })
      .from(productsFeatures)
      .innerJoin(products, eq(productsFeatures.productId, products.id))
      .innerJoin(shopFeature, eq(productsFeatures.featureId, shopFeature.id))
      .innerJoin(shopFeatureValues, eq(productsFeatures.featureValueId, shopFeatureValues.id))
      .where(and(
        ...getPublicCatalogConditions(),
        inArray(productsFeatures.categoryId, categoryIds),
        featureType > 0 ? eq(shopFeature.typeId, featureType) : undefined,
      ))
      .groupBy(shopFeature.id, featureTitle, shopFeatureValues.id, valueTitle, shopFeature.sorder, shopFeatureValues.sorder)
      .orderBy(asc(shopFeature.sorder), asc(shopFeature.id), asc(shopFeatureValues.sorder), asc(shopFeatureValues.id)),
  ])

  const features = new Map<number, CatalogFeatureFacet>()
  for (const row of featureRows) {
    const facet = features.get(row.featureId) ?? { id: row.featureId, title: row.featureTitle, values: [] }
    facet.values.push({ id: row.valueId, title: row.valueTitle, count: Number(row.count) })
    features.set(row.featureId, facet)
  }
  const bounds = priceRows[0]

  return {
    brands: brandRows.map((row) => ({ ...row, count: Number(row.count) })) satisfies CatalogFacetOption[],
    sexes: sexRows.map((row) => row.sex).filter((value): value is string => Boolean(value)),
    priceMin: Number(bounds?.min ?? 0),
    priceMax: Number(bounds?.max ?? 0),
    features: [...features.values()],
  }
}

function normalizeCategoryUri(value: string | null | undefined) {
  return (value ?? '').replace(/^\/+|\/+$/g, '').toLocaleLowerCase()
}

export async function getCategoryPage(
  uri: string,
  filters: Omit<ProductFilters, 'categoryId' | 'categoryIds'> = {},
  locale: StoreLocale = 'ru',
) {
  const rows = await db
    .select({
      id: categories.id,
      parentId: categories.parentId,
      featureType: categories.featureType,
      title: locale === 'ro' ? categories.titleRo : categories.titleRu,
      h1: locale === 'ro' ? categories.h1Ro : categories.h1Ru,
      breadcrumbTitle: locale === 'ro' ? categories.breadcrumbTitleRo : categories.breadcrumbTitleRu,
      uri: locale === 'ro' ? categories.uriRo : categories.uriRu,
      alternateUri: locale === 'ro' ? categories.uriRu : categories.uriRo,
      image: categories.img,
      seoText: locale === 'ro' ? categories.seoTextRo : categories.seoTextRu,
      order: categories.sorder,
    })
    .from(categories)
    .where(eq(categories.isShown, 1))
    .orderBy(asc(categories.sorder), asc(categories.id))

  const category = rows.find((row) =>
    normalizeCategoryUri(row.uri) === normalizeCategoryUri(uri)
    || normalizeCategoryUri(row.alternateUri) === normalizeCategoryUri(uri),
  )
  if (!category) return null

  const childrenByParent = new Map<number, CatalogCategory[]>()
  const categoriesById = new Map<number, CatalogCategory>()
  for (const row of rows) {
    const item: CatalogCategory = {
      id: row.id,
      parentId: row.parentId,
      featureType: row.featureType,
      title: row.title,
      h1: row.h1,
      breadcrumbTitle: row.breadcrumbTitle,
      uri: row.uri,
      image: row.image,
      seoText: row.seoText,
      order: row.order ?? 0,
    }
    categoriesById.set(item.id, item)
    const siblings = childrenByParent.get(item.parentId) ?? []
    siblings.push(item)
    childrenByParent.set(item.parentId, siblings)
  }

  const categorySummary = categoriesById.get(category.id)!
  const descendants: number[] = []
  const collectDescendants = (parentId: number, depth: number) => {
    if (depth >= 2) return
    for (const child of childrenByParent.get(parentId) ?? []) {
      descendants.push(child.id)
      collectDescendants(child.id, depth + 1)
    }
  }
  collectDescendants(category.id, 0)

  const breadcrumbs: CatalogCategory[] = []
  let current: CatalogCategory | undefined = categorySummary
  while (current) {
    breadcrumbs.unshift(current)
    current = current.parentId ? categoriesById.get(current.parentId) : undefined
  }

  const categoryIds = [category.id, ...descendants]
  const [result, facets] = await Promise.all([fetchProducts({
    ...filters,
    categoryIds,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 16,
  }, false, locale), getCategoryFacets(categoryIds, category.featureType ?? 0, locale)])

  return {
    ...result,
    facets,
    category: categorySummary,
    children: childrenByParent.get(category.id) ?? [],
    breadcrumbs,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 16,
  }
}

export type SearchListingFacets = CollectionListingFacets

async function getSearchFacets(productIds: number[], locale: StoreLocale): Promise<SearchListingFacets> {
  if (!productIds.length) return { brands: [], categories: [], sexes: [], priceMin: 0, priceMax: 0 }

  const candidates = inArray(products.id, productIds)
  const baseConditions = [...getPublicCatalogConditions(), candidates]
  const priceExpression = sql<number>`CASE WHEN ${products.price} > 0 THEN ${products.price} ELSE (
    SELECT MIN(pv.price) FROM products_variable pv
    WHERE pv.product_id = ${products.id} AND pv.isShown = 1 AND pv.price > 0 AND pv.qty > 0
  ) END`
  const [brandRows, categoryRows, sexRows, priceRows] = await Promise.all([
    db.select({ id: brands.id, title: brands.title, count: sql<number>`COUNT(DISTINCT ${products.id})` })
      .from(products)
      .innerJoin(brands, eq(products.brandId, brands.id))
      .where(and(...baseConditions, eq(brands.isShown, 1)))
      .groupBy(brands.id, brands.title)
      .orderBy(asc(brands.title), asc(brands.id))
      .limit(100),
    db.select({
      id: categories.id,
      title: locale === 'ro' ? categories.titleRo : categories.titleRu,
      parentId: categories.parentId,
      count: sql<number>`COUNT(DISTINCT ${products.id})`,
      order: categories.sorder,
    })
      .from(products)
      .innerJoin(productCategories, eq(productCategories.productId, products.id))
      .innerJoin(categories, eq(categories.id, productCategories.categoryId))
      .where(and(...baseConditions, eq(categories.isShown, 1)))
      .groupBy(categories.id, categories.titleRu, categories.titleRo, categories.parentId, categories.sorder)
      .orderBy(asc(categories.sorder), asc(categories.id))
      .limit(100),
    db.select({ sex: products.sex })
      .from(products)
      .where(and(...baseConditions))
      .groupBy(products.sex)
      .orderBy(asc(products.sex)),
    db.select({ min: sql<number>`MIN(${priceExpression})`, max: sql<number>`MAX(${priceExpression})` })
      .from(products)
      .where(and(...baseConditions)),
  ])
  const bounds = priceRows[0]

  return {
    brands: brandRows.map((row) => ({ ...row, count: Number(row.count) })),
    categories: categoryRows.map((row) => ({ ...row, count: Number(row.count), order: Number(row.order ?? 0) })),
    sexes: sexRows.map((row) => row.sex).filter((value): value is string => Boolean(value)),
    priceMin: Number(bounds?.min ?? 0),
    priceMax: Number(bounds?.max ?? 0),
  }
}

export async function getSearchPage(search: string, filters: ProductFilters = {}, locale: StoreLocale = 'ru') {
  const query = normalizeSearchQuery(search)
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? 24
  const term = `%${query.replace(/[\\%_]/gu, (character) => `\\${character}`)}%`
  if ([...query].length < 2) {
    return {
      products: [] as CatalogProduct[], total: 0, brands: [], categories: [],
      facets: await getSearchFacets([], locale), page, pageSize,
    }
  }

  const [productIds, brandRows, categoryRows] = await Promise.all([
    searchProvider.searchProductIds(query, locale),
    db.select({ id: brands.id, title: brands.title })
      .from(brands)
      .where(and(eq(brands.isShown, 1), like(brands.title, term)))
      .orderBy(asc(brands.sorder), desc(brands.id))
      .limit(8),
    db.select({
      id: categories.id,
      title: locale === 'ro' ? categories.titleRo : categories.titleRu,
      uri: locale === 'ro' ? categories.uriRo : categories.uriRu,
    })
      .from(categories)
      .where(and(
        eq(categories.isShown, 1),
          or(like(categories.titleRu, term), like(categories.titleRo, term)),
      ))
      .orderBy(asc(categories.sorder), desc(categories.id))
      .limit(8),
  ])

  if (!productIds.length) {
    return {
      products: [] as CatalogProduct[], total: 0, brands: brandRows, categories: categoryRows,
      facets: await getSearchFacets([], locale), page, pageSize,
    }
  }

  const [result, facets] = await Promise.all([
    fetchProducts({ ...filters, search: query, productIds, page, pageSize }, false, locale),
    getSearchFacets(productIds, locale),
  ])
  return { ...result, brands: brandRows, categories: categoryRows, facets, page, pageSize }
}

export async function getSearchSuggestions(query: string, locale: StoreLocale = 'ru') {
  const normalized = normalizeSearchQuery(query)
  const raw = await searchProvider.suggest(normalized, locale)
  const hydrated = raw.productIds.length
    ? await fetchProducts({ search: normalized, productIds: raw.productIds, page: 1, pageSize: raw.productIds.length }, false, locale)
    : { products: [] as CatalogProduct[] }

  const productById = new Map(hydrated.products.map((product) => [product.id, product]))
  return {
    products: raw.productIds.map((id) => productById.get(id)).filter((product): product is CatalogProduct => Boolean(product)).slice(0, 8),
    brands: raw.brands,
    categories: raw.categories,
    queries: raw.queries,
  }
}

export async function getPopularSearchQueries(limit = 8) {
  return searchProvider.popularQueries(limit)
}

export async function recordSearchQuery(query: string) {
  return searchProvider.recordSearch(query)
}

export type BrandSummary = {
  id: number
  title: string | null
  uri: string | null
  image: string | null
}

export async function getBrandsPage(search = '', locale: StoreLocale = 'ru') {
  const query = search.trim()
  const rows = await db
    .select({
      id: brands.id,
      title: locale === 'ro' ? sql<string | null>`COALESCE(${brands.h1Ro}, ${brands.title})` : sql<string | null>`COALESCE(${brands.h1Ru}, ${brands.title})`,
      uri: brands.uri,
      image: brands.img,
    })
    .from(brands)
    .where(
      query
        ? and(eq(brands.isShown, 1), like(brands.title, `%${query}%`))
        : eq(brands.isShown, 1),
    )
    .orderBy(asc(brands.title), asc(brands.id))
    .limit(500)

  return rows satisfies BrandSummary[]
}

export async function getBrandPage(brandId: number, filters: ProductFilters = {}, locale: StoreLocale = 'ru') {
  const [brand] = await db
    .select({
      id: brands.id,
      title: locale === 'ro' ? sql<string | null>`COALESCE(${brands.h1Ro}, ${brands.title})` : sql<string | null>`COALESCE(${brands.h1Ru}, ${brands.title})`,
      uri: brands.uri,
      description: locale === 'ro' ? brands.textRo : brands.textRu,
    })
    .from(brands)
    .where(and(eq(brands.id, brandId), eq(brands.isShown, 1)))
    .limit(1)

  if (!brand) return null

  const brandConditions = [...getPublicCatalogConditions(), eq(products.brandId, brandId)]
  const priceExpression = sql<number>`CASE WHEN ${products.price} > 0 THEN ${products.price} ELSE (
    SELECT MIN(pv.price) FROM products_variable pv
    WHERE pv.product_id = ${products.id} AND pv.isShown = 1 AND pv.price > 0 AND pv.qty > 0
  ) END`
  const [categoryRows, priceRows, allCategories] = await Promise.all([
    db.select({
      id: categories.id,
      title: locale === 'ro' ? categories.titleRo : categories.titleRu,
      parentId: categories.parentId,
      count: sql<number>`COUNT(DISTINCT ${products.id})`,
      order: categories.sorder,
    })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(and(...brandConditions, eq(categories.isShown, 1)))
      .groupBy(categories.id, categories.titleRu, categories.titleRo, categories.parentId, categories.sorder)
      .orderBy(asc(categories.sorder), asc(categories.id)),
    db.select({ min: sql<number>`MIN(${priceExpression})`, max: sql<number>`MAX(${priceExpression})` })
      .from(products).where(and(...brandConditions)),
    db.select({ id: categories.id, parentId: categories.parentId }).from(categories).where(eq(categories.isShown, 1)),
  ])
  const allowedCategoryIds = new Set(categoryRows.map((item) => item.id))
  const childrenByParent = new Map<number, number[]>()
  for (const category of allCategories) {
    const children = childrenByParent.get(category.parentId) ?? []
    children.push(category.id)
    childrenByParent.set(category.parentId, children)
  }
  const selectedCategoryIds = filters.categoryIds ?? []
  const expandedCategoryIds = new Set<number>()
  const addCategoryTree = (id: number) => {
    if (expandedCategoryIds.has(id)) return
    expandedCategoryIds.add(id)
    for (const childId of childrenByParent.get(id) ?? []) addCategoryTree(childId)
  }
  for (const id of selectedCategoryIds) addCategoryTree(id)
  const categoryIds = selectedCategoryIds.length
    ? [...expandedCategoryIds].filter((id) => allowedCategoryIds.has(id))
    : undefined
  const result = await fetchProducts({
    ...filters,
    brandId,
    categoryIds,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 16,
  }, false, locale)

  return {
    brand,
    ...result,
    facets: {
      brands: [],
      categories: categoryRows.map((row) => ({ ...row, count: Number(row.count) })) as CategoryOptionFacet[],
      sexes: [],
      priceMin: Number(priceRows[0]?.min ?? 0),
      priceMax: Number(priceRows[0]?.max ?? 0),
      features: [],
    },
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 16,
  }
}

export async function getProductById(id: number, isB2B = false, locale: StoreLocale = 'ru') {
  const productTitle = locale === 'ro' ? products.titleRo : products.titleRu
  const productH1 = locale === 'ro' ? products.h1Ro : products.h1Ru
  const brandDescription = locale === 'ro' ? brands.textRo : brands.textRu
  const productDescription = locale === 'ro' ? products.descRo : products.descRu
  const productText = locale === 'ro' ? products.textRo : products.textRu
  const instruction = locale === 'ro' ? products.instructionRo : products.instructionRu
  const components = locale === 'ro' ? products.componentsRo : products.componentsRu
  const pricedVariantIds = db
    .select({ productId: productsVariable.productId })
    .from(productsVariable)
    .innerJoin(productsVariableImg, eq(productsVariableImg.variableId, productsVariable.id))
    .where(and(
      eq(productsVariable.productId, products.id),
      eq(productsVariable.isShown, 1),
      gt(isB2B ? productsVariable.priceWh : productsVariable.price, 0),
      gt(isB2B ? productsVariable.qtyWh : productsVariable.qty, 0),
      eq(productsVariableImg.isShown, 1),
      sql`TRIM(${productsVariableImg.img}) <> ''`,
    ))

  const [row] = await db
    .select({
      id: products.id,
      title: sql<string | null>`COALESCE(NULLIF(TRIM(${productH1}), ''), NULLIF(TRIM(${productTitle}), ''))`,
      price: products.price,
      wholesalePrice: products.priceWh,
      discountPrice: products.discountPrice,
      brand: sql<string | null>`NULLIF(TRIM(${brands.title}), '')`,
      brandImage: brands.img,
      brandDescription,
      brandId: products.brandId,
      sku: products.sku,
      volume: products.volume,
      stock: products.stock,
      onStock: products.onStock,
      wholesaleStock: products.onStockWh,
      description: productDescription,
      text: productText,
      instruction,
      components,
      gender: products.sex,
      categoryId: products.categoryId,
      barcode: products.barcode,
      youtubeVideoId: products.youtubeVideoId,
      isNew: products.isNew,
      bestSelling: products.bestSelling,
      salePercent: products.salePercent,
    })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(and(
      eq(products.id, id),
      eq(products.isShown, 1),
      eq(products.isGift, 0),
      isB2B
        ? or(gt(products.priceWh, 0), inArray(products.id, pricedVariantIds))!
        : or(gt(products.price, 0), inArray(products.id, pricedVariantIds))!,
      or(
        exists(
          db
            .select({ id: productsImg.id })
            .from(productsImg)
            .where(and(
              eq(productsImg.productId, products.id),
              eq(productsImg.isShown, 1),
              sql`TRIM(${productsImg.img}) <> ''`,
            )),
        ),
        exists(
          db
            .select({ id: productsVariableImg.id })
            .from(productsVariableImg)
            .innerJoin(productsVariable, eq(productsVariableImg.variableId, productsVariable.id))
            .where(and(
              eq(productsVariable.productId, products.id),
              eq(productsVariable.isShown, 1),
              gt(isB2B ? productsVariable.priceWh : productsVariable.price, 0),
              eq(productsVariableImg.isShown, 1),
              sql`TRIM(${productsVariableImg.img}) <> ''`,
            )),
        ),
      )!,
    ))
    .limit(1)

  if (!row) return null

  const [imageRows, offer, giftPromotion, variantRows, featureRows, relatedRows, moreRows, allCategories] = await Promise.all([
    db
      .select({ image: productsImg.img })
      .from(productsImg)
      .where(and(eq(productsImg.productId, id), eq(productsImg.isShown, 1), sql`TRIM(${productsImg.img}) <> ''`))
      .orderBy(asc(productsImg.sorder), asc(productsImg.id)),
    getActiveOfferForProduct(id, locale),
    getActiveGiftPromotionForProduct(id, locale),
    db
      .select({
        id: productsVariable.id,
        sku: productsVariable.sku,
        title: locale === 'ro' ? productsVariable.titleRo : productsVariable.titleRu,
        color: productsVariable.color,
        colorHex: productsVariable.colorHex,
        colorData: productsVariable.colorData,
        volume: productsVariable.volumeVar,
        price: productsVariable.price,
        wholesalePrice: productsVariable.priceWh,
        discountPrice: productsVariable.discountPrice,
        quantity: productsVariable.qty,
        wholesaleQuantity: productsVariable.qtyWh,
      })
      .from(productsVariable)
      .where(and(
        eq(productsVariable.productId, id),
        eq(productsVariable.isShown, 1),
        gt(isB2B ? productsVariable.priceWh : productsVariable.price, 0),
      ))
      .orderBy(asc(productsVariable.sorder), asc(productsVariable.id)),
    db
      .select({
        feature: locale === 'ro' ? shopFeature.nameRo : shopFeature.nameRu,
        value: locale === 'ro' ? shopFeatureValues.nameRo : shopFeatureValues.nameRu,
        featureId: shopFeature.id,
        sort: shopFeature.sorder,
      })
      .from(productsFeatures)
      .innerJoin(shopFeature, eq(productsFeatures.featureId, shopFeature.id))
      .leftJoin(shopFeatureValues, eq(productsFeatures.featureValueId, shopFeatureValues.id))
      .where(eq(productsFeatures.productId, id))
      .orderBy(asc(shopFeature.sorder), asc(shopFeature.id)),
    db
      .select({ id: productsRelated.relatedId })
      .from(productsRelated)
      .where(eq(productsRelated.productId, id)),
    db
      .select({ id: productsMore.relatedId })
      .from(productsMore)
      .where(eq(productsMore.productId, id)),
    row.categoryId
      ? db
          .select({ id: categories.id, parentId: categories.parentId, title: locale === 'ro' ? categories.titleRo : categories.titleRu, uri: locale === 'ro' ? categories.uriRo : categories.uriRu, image: categories.img })
          .from(categories)
          .where(eq(categories.isShown, 1))
      : Promise.resolve([]),
  ])

  const categoryById = new Map(allCategories.map((category) => [category.id, category]))
  const categoryTrail: ProductCategoryLink[] = []
  const seenCategoryIds = new Set<number>()
  let categoryId = row.categoryId
  while (categoryId && categoryTrail.length < 6 && !seenCategoryIds.has(categoryId)) {
    seenCategoryIds.add(categoryId)
    const category = categoryById.get(categoryId)
    if (!category) break
    categoryTrail.push({ id: category.id, title: category.title?.trim() ?? '', uri: category.uri, image: category.image })
    categoryId = category.parentId
  }

  const variantIds = variantRows.map((variant) => variant.id)
  const variantImageRows = variantIds.length
    ? await db
        .select({ variantId: productsVariableImg.variableId, image: productsVariableImg.img })
        .from(productsVariableImg)
        .where(and(
          inArray(productsVariableImg.variableId, variantIds),
          eq(productsVariableImg.isShown, 1),
          sql`TRIM(${productsVariableImg.img}) <> ''`,
        ))
        .orderBy(asc(productsVariableImg.sorder), asc(productsVariableImg.id))
    : []

  const imagesByVariant = new Map<number, string[]>()
  for (const image of variantImageRows) {
    const images = imagesByVariant.get(image.variantId) ?? []
    images.push(image.image)
    imagesByVariant.set(image.variantId, images)
  }

  const variations: ProductVariant[] = variantRows.map((variant) => {
    const discount = Number.parseFloat(variant.discountPrice ?? '')
    return {
      ...variant,
      price: isB2B ? Number(variant.wholesalePrice) : variant.price === null ? null : Number(variant.price),
      discountPrice: !isB2B && Number(variant.price) > 0 && Number.isFinite(discount) && discount > 0 ? discount : null,
      quantity: Number(isB2B ? variant.wholesaleQuantity : variant.quantity ?? 0),
      images: (imagesByVariant.get(variant.id) ?? []).map((image) => legacyAsset(image, 'products_variable_img') ?? image),
    }
  }).filter((variant) => (variant.price ?? 0) > 0 && variant.images.length > 0)

  const uniqueFeatures = new Map<string, { name: string; value: string }>()
  for (const feature of featureRows) {
    const name = feature.feature?.trim()
    const value = feature.value?.trim()
    if (name && value && !uniqueFeatures.has(`${feature.featureId}:${value}`)) {
      uniqueFeatures.set(`${feature.featureId}:${value}`, { name, value })
    }
  }

  const relatedIds = relatedRows.map((related) => related.id).filter((relatedId) => relatedId !== id)
  const moreIds = moreRows.map((more) => more.id).filter((moreId) => moreId !== id)
  const [brandShelf, similarProducts, curatedFrequentlyBought] = await Promise.all([
    row.brandId ? fetchProducts({ brandId: row.brandId, excludeProductId: id, pageSize: 4, sort: 'popular' }, isB2B, locale) : Promise.resolve({ products: [], total: 0 }),
    row.categoryId ? fetchProducts({ categoryId: row.categoryId, excludeProductId: id, pageSize: 8, sort: 'popular' }, isB2B, locale) : Promise.resolve({ products: [], total: 0 }),
    moreIds.length ? fetchProducts({ productIds: moreIds, pageSize: moreIds.length, sort: 'popular' }, isB2B, locale) : Promise.resolve({ products: [], total: 0 }),
  ])

  const relatedProducts = relatedIds.length
    ? await fetchProducts({ productIds: relatedIds, excludeProductId: id, pageSize: 8, sort: 'popular' }, isB2B, locale)
    : { products: [], total: 0 }
  const actualSimilarProducts = relatedProducts.products.length ? relatedProducts.products : similarProducts.products

  // Admin-curated "more" list wins when set; otherwise fall back to real co-purchase history from past orders.
  const frequentlyBoughtProducts = curatedFrequentlyBought.products.length
    ? curatedFrequentlyBought.products
    : await getCoPurchasedProducts([id], { exclude: [id], limit: 8, isB2B, locale })
  const displayedRow = {
    ...row,
    price: isB2B ? Number(row.wholesalePrice) : row.price,
    discountPrice: isB2B ? null : row.discountPrice,
    onStock: isB2B ? row.wholesaleStock : row.onStock,
  }

  return {
    ...displayedRow,
    images: imageRows.map((image) => image.image),
    categoryTrail: categoryTrail.reverse().filter((category) => category.title),
    variations,
    features: Array.from(uniqueFeatures.values()),
    brandProducts: brandShelf.products,
    similarProducts: actualSimilarProducts,
    frequentlyBoughtProducts,
    offer: offer ?? giftPromotion,
  }
}

export type ProductDetailData = NonNullable<Awaited<ReturnType<typeof getProductById>>> & { locale?: StoreLocale }

export async function getProductByUri(uri: string, isB2B = false, locale: StoreLocale = 'ru') {
  const [row] = await db
    .select({ id: products.id })
    .from(products)
    .where(and(
      eq(products.isShown, 1),
      or(eq(locale === 'ro' ? products.uriRo : products.uriRu, uri), eq(locale === 'ro' ? products.uriRu : products.uriRo, uri))!,
    ))
    .limit(1)

  return row ? getProductById(row.id, isB2B, locale) : null
}
