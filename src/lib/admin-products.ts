import 'server-only'

import { and, asc, count, desc, eq, inArray, like, or, sql, type SQL } from 'drizzle-orm'

import { db } from '@/db'
import { brands, categories, productCategories, products, productsImg, productsVariable, productsVariableImg } from '../../drizzle/schema'

export type AdminProductStatus = 'all' | 'shown' | 'hidden'

export type AdminProductFilters = {
  query?: string
  categoryId?: number
  brandId?: number
  status?: AdminProductStatus
  page?: number
}

export async function getAdminProductList(filters: AdminProductFilters = {}) {
  const conditions: SQL[] = []
  const query = filters.query?.trim().slice(0, 100) ?? ''
  const categoryId = filters.categoryId && filters.categoryId > 0 ? filters.categoryId : undefined
  const brandId = filters.brandId && filters.brandId > 0 ? filters.brandId : undefined
  const status = filters.status ?? 'all'
  const page = Math.max(1, filters.page ?? 1)
  const pageSize = 40

  if (query) {
    const pattern = `%${query}%`
    conditions.push(or(
      like(products.titleRu, pattern),
      like(products.titleRo, pattern),
      like(products.titleEn, pattern),
      like(products.sku, pattern),
      like(products.barcode, pattern),
    )!)
  }
  if (categoryId) conditions.push(eq(products.categoryId, categoryId))
  if (brandId) conditions.push(eq(products.brandId, brandId))
  if (status === 'shown') conditions.push(eq(products.isShown, 1))
  if (status === 'hidden') conditions.push(or(eq(products.isShown, 0), sql`${products.isShown} IS NULL`)!)
  const where = conditions.length ? and(...conditions) : undefined

  const [rows, countRows, statsRows, categoryRows, brandRows] = await Promise.all([
    db.select({
      id: products.id,
      sku: products.sku,
      titleRu: products.titleRu,
      titleRo: products.titleRo,
      price: products.price,
      discountPrice: products.discountPrice,
      isShown: products.isShown,
      isNew: products.isNew,
      bestSelling: products.bestSelling,
      isGift: products.isGift,
      categoryId: products.categoryId,
      brandId: products.brandId,
      brandTitle: brands.title,
      categoryTitle: categories.titleRu,
      categoryTitleRo: categories.titleRo,
    })
      .from(products)
      .leftJoin(brands, eq(products.brandId, brands.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(where)
      .orderBy(desc(products.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ value: count() }).from(products).where(where),
    db.select({
      total: count(),
      shown: sql<number>`SUM(CASE WHEN ${products.isShown} = 1 THEN 1 ELSE 0 END)`,
      hidden: sql<number>`SUM(CASE WHEN ${products.isShown} = 0 OR ${products.isShown} IS NULL THEN 1 ELSE 0 END)`,
    }).from(products),
    db.select({ id: categories.id, titleRu: categories.titleRu, titleRo: categories.titleRo })
      .from(categories).orderBy(asc(categories.titleRu), asc(categories.id)),
    db.select({ id: brands.id, title: brands.title }).from(brands).orderBy(asc(brands.title), asc(brands.id)),
  ])

  const ids = rows.map((row) => row.id)
  const [imageRows, variantImageRows, variantRows, categoryRelations] = ids.length ? await Promise.all([
    db.select({ productId: productsImg.productId, image: productsImg.img })
      .from(productsImg)
      .where(and(inArray(productsImg.productId, ids), eq(productsImg.isShown, 1), sql`TRIM(${productsImg.img}) <> ''`))
      .orderBy(asc(productsImg.sorder), asc(productsImg.id)),
    db.select({ productId: productsVariableImg.productId, image: productsVariableImg.img })
      .from(productsVariableImg)
      .where(and(inArray(productsVariableImg.productId, ids), eq(productsVariableImg.isShown, 1), sql`TRIM(${productsVariableImg.img}) <> ''`))
      .orderBy(asc(productsVariableImg.sorder), asc(productsVariableImg.id)),
    db.select({ productId: productsVariable.productId, price: productsVariable.price, discountPrice: productsVariable.discountPrice })
      .from(productsVariable)
      .where(inArray(productsVariable.productId, ids)),
    db.select({ productId: productCategories.productId, categoryId: productCategories.categoryId, titleRu: categories.titleRu, titleRo: categories.titleRo })
      .from(productCategories)
      .leftJoin(categories, eq(productCategories.categoryId, categories.id))
      .where(inArray(productCategories.productId, ids)),
  ]) : [[], [], [], []]

  const imageByProduct = new Map<number, string>()
  for (const image of imageRows) if (!imageByProduct.has(image.productId)) imageByProduct.set(image.productId, image.image)
  for (const image of variantImageRows) if (!imageByProduct.has(image.productId)) imageByProduct.set(image.productId, image.image)
  const variantCountByProduct = new Map<number, number>()
  const variantMinimumByProduct = new Map<number, number>()
  const categoryIdsByProduct = new Map<number, Set<number>>()
  const categoryTitleByProduct = new Map<number, string>()
  const existingCategoryIds = new Set(categoryRows.map((category) => category.id))
  for (const relation of categoryRelations) {
    const categoriesForProduct = categoryIdsByProduct.get(relation.productId) ?? new Set<number>()
    categoriesForProduct.add(relation.categoryId)
    categoryIdsByProduct.set(relation.productId, categoriesForProduct)
    const title = relation.titleRu || relation.titleRo
    if (title && !categoryTitleByProduct.has(relation.productId)) categoryTitleByProduct.set(relation.productId, title)
  }
  for (const variant of variantRows) {
    variantCountByProduct.set(variant.productId, (variantCountByProduct.get(variant.productId) ?? 0) + 1)
    const variantPrice = Number.parseFloat(String(variant.discountPrice || '')) || Number(variant.price ?? 0)
    if (variantPrice > 0) variantMinimumByProduct.set(variant.productId, Math.min(variantMinimumByProduct.get(variant.productId) ?? Infinity, variantPrice))
  }
  const total = Number(countRows[0]?.value ?? 0)
  const stats = statsRows[0]

  return {
    rows: rows.map((row) => ({
      ...row,
      categoryTitle: row.categoryTitle || row.categoryTitleRo || categoryTitleByProduct.get(row.id) || null,
      image: imageByProduct.get(row.id) ?? null,
      missingCategory: ![row.categoryId, ...Array.from(categoryIdsByProduct.get(row.id) ?? [])]
        .some((categoryId) => categoryId !== null && categoryId !== undefined && existingCategoryIds.has(categoryId)),
      missingBrand: !row.brandId || !row.brandTitle,
      variantCount: variantCountByProduct.get(row.id) ?? 0,
      variantMinimumPrice: variantMinimumByProduct.get(row.id) ?? null,
    })),
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    stats: {
      total: Number(stats?.total ?? 0),
      shown: Number(stats?.shown ?? 0),
      hidden: Number(stats?.hidden ?? 0),
    },
    categories: categoryRows,
    brands: brandRows,
  }
}

export async function getAdminProductEditorOptions() {
  const [categoryRows, brandRows] = await Promise.all([
    db.select({ id: categories.id, titleRu: categories.titleRu, titleRo: categories.titleRo, featureType: categories.featureType })
      .from(categories).orderBy(asc(categories.titleRu), asc(categories.id)),
    db.select({ id: brands.id, title: brands.title }).from(brands).orderBy(asc(brands.title), asc(brands.id)),
  ])
  return { categories: categoryRows, brands: brandRows }
}

export async function getAdminProductEditorData(id: number) {
  const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1)
  if (!product) return null

  const [imageRows, variantRows, variantImageRows, relationRows, options] = await Promise.all([
    db.select({ id: productsImg.id, img: productsImg.img, sorder: productsImg.sorder, isShown: productsImg.isShown })
      .from(productsImg).where(eq(productsImg.productId, id)).orderBy(asc(productsImg.sorder), asc(productsImg.id)),
    db.select({
      id: productsVariable.id,
      sku: productsVariable.sku,
      titleRu: productsVariable.titleRu,
      titleRo: productsVariable.titleRo,
      titleEn: productsVariable.titleEn,
      colorRu: productsVariable.colorRu,
      colorRo: productsVariable.colorRo,
      colorEn: productsVariable.colorEn,
      colorHex: productsVariable.colorHex,
      volume: productsVariable.volumeVar,
      price: productsVariable.price,
      discountPrice: productsVariable.discountPrice,
      qty: productsVariable.qty,
      sorder: productsVariable.sorder,
      isShown: productsVariable.isShown,
    }).from(productsVariable).where(eq(productsVariable.productId, id)).orderBy(asc(productsVariable.sorder), asc(productsVariable.id)),
    db.select({ id: productsVariableImg.id, variableId: productsVariableImg.variableId, img: productsVariableImg.img, sorder: productsVariableImg.sorder, isShown: productsVariableImg.isShown })
      .from(productsVariableImg).where(and(eq(productsVariableImg.productId, id), eq(productsVariableImg.isShown, 1)))
      .orderBy(asc(productsVariableImg.sorder), asc(productsVariableImg.id)),
    db.select({ categoryId: productCategories.categoryId }).from(productCategories).where(eq(productCategories.productId, id)),
    getAdminProductEditorOptions(),
  ])
  const categoryIds = relationRows.map((row) => row.categoryId)
  if (!categoryIds.length && product.categoryId) categoryIds.push(product.categoryId)
  const imageByVariant = new Map<number, (typeof variantImageRows)[number]>()
  for (const image of variantImageRows) if (!imageByVariant.has(image.variableId)) imageByVariant.set(image.variableId, image)
  const variants = variantRows.map((variant) => ({ ...variant, image: imageByVariant.get(variant.id) ?? null }))
  return { product, images: imageRows, variants, categoryIds, ...options }
}
