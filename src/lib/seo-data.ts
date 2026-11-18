import { cache } from 'react'
import { and, eq, or, sql } from 'drizzle-orm'

import { db } from '@/db'
import { legacyAsset } from '@/lib/legacy-assets'
import type { StoreLocale } from '@/lib/locale-routing'
import { brands, categories, products, productsImg } from '../../drizzle/schema'

export type ProductSeo = {
  id: number
  title: string | null
  seoTitle: string | null
  seoDescription: string | null
  seoKeywords: string | null
  brandTitle: string | null
  categoryTitle: string | null
  image: string | null
  uriRu: string | null
  uriRo: string | null
}

export const getProductSeoById = cache(async function getProductSeoById(
  id: number,
  locale: StoreLocale = 'ru',
): Promise<ProductSeo | null> {
  const titleCol = locale === 'ro' ? products.titleRo : products.titleRu
  const h1Col = locale === 'ro' ? products.h1Ro : products.h1Ru
  const seoTitleCol = locale === 'ro' ? products.seoTitleRo : products.seoTitleRu
  const seoDescCol = locale === 'ro' ? products.seoDescRo : products.seoDescRu
  const seoKeywordsCol = locale === 'ro' ? products.seoKeywordsRo : products.seoKeywordsRu
  const categoryTitleCol = locale === 'ro' ? categories.titleRo : categories.titleRu

  const [row] = await db
    .select({
      id: products.id,
      title: sql<string | null>`COALESCE(NULLIF(TRIM(${h1Col}), ''), NULLIF(TRIM(${titleCol}), ''))`,
      seoTitle: seoTitleCol,
      seoDescription: seoDescCol,
      seoKeywords: seoKeywordsCol,
      brandTitle: sql<string | null>`NULLIF(TRIM(${brands.title}), '')`,
      categoryTitle: categoryTitleCol,
      uriRu: products.uriRu,
      uriRo: products.uriRo,
    })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(products.id, id), eq(products.isShown, 1)))
    .limit(1)

  if (!row) return null

  const [imageRow] = await db
    .select({ image: productsImg.img })
    .from(productsImg)
    .where(and(eq(productsImg.productId, id), eq(productsImg.isShown, 1)))
    .orderBy(productsImg.sorder, productsImg.id)
    .limit(1)

  return { ...row, image: legacyAsset(imageRow?.image, 'products') }
})

export const getProductSeoByUri = cache(async function getProductSeoByUri(
  uri: string,
  locale: StoreLocale = 'ru',
): Promise<ProductSeo | null> {
  const [row] = await db
    .select({ id: products.id })
    .from(products)
    .where(and(
      eq(products.isShown, 1),
      or(
        eq(locale === 'ro' ? products.uriRo : products.uriRu, uri),
        eq(locale === 'ro' ? products.uriRu : products.uriRo, uri),
      )!,
    ))
    .limit(1)

  return row ? getProductSeoById(row.id, locale) : null
})

export type CategorySeo = {
  id: number
  title: string | null
  seoTitle: string | null
  seoDescription: string | null
  seoKeywords: string | null
  image: string | null
  uriRu: string | null
  uriRo: string | null
}

export const getCategorySeoByUri = cache(async function getCategorySeoByUri(
  uri: string,
  locale: StoreLocale = 'ru',
): Promise<CategorySeo | null> {
  const titleCol = locale === 'ro' ? categories.titleRo : categories.titleRu
  const h1Col = locale === 'ro' ? categories.h1Ro : categories.h1Ru
  const seoTitleCol = locale === 'ro' ? categories.seoTitleRo : categories.seoTitleRu
  const seoDescCol = locale === 'ro' ? categories.seoDescRo : categories.seoDescRu
  const seoKeywordsCol = locale === 'ro' ? categories.seoKeywordsRo : categories.seoKeywordsRu

  const [row] = await db
    .select({
      id: categories.id,
      title: sql<string | null>`COALESCE(NULLIF(TRIM(${h1Col}), ''), NULLIF(TRIM(${titleCol}), ''))`,
      seoTitle: seoTitleCol,
      seoDescription: seoDescCol,
      seoKeywords: seoKeywordsCol,
      image: categories.img,
      uriRu: categories.uriRu,
      uriRo: categories.uriRo,
    })
    .from(categories)
    .where(and(
      eq(categories.isShown, 1),
      or(eq(categories.uriRu, uri), eq(categories.uriRo, uri))!,
    ))
    .limit(1)

  if (!row) return null
  return { ...row, image: legacyAsset(row.image, 'categories') }
})

export type BrandSeo = {
  id: number
  title: string | null
  seoTitle: string | null
  seoDescription: string | null
  seoKeywords: string | null
  image: string | null
}

export const getBrandSeoById = cache(async function getBrandSeoById(
  id: number,
  locale: StoreLocale = 'ru',
): Promise<BrandSeo | null> {
  const h1Col = locale === 'ro' ? brands.h1Ro : brands.h1Ru
  const seoTitleCol = locale === 'ro' ? brands.seoTitleRo : brands.seoTitleRu
  const seoDescCol = locale === 'ro' ? brands.seoDescRo : brands.seoDescRu
  const seoKeywordsCol = locale === 'ro' ? brands.seoKeywordsRo : brands.seoKeywordsRu

  const [row] = await db
    .select({
      id: brands.id,
      title: sql<string | null>`COALESCE(NULLIF(TRIM(${h1Col}), ''), NULLIF(TRIM(${brands.title}), ''))`,
      seoTitle: seoTitleCol,
      seoDescription: seoDescCol,
      seoKeywords: seoKeywordsCol,
      image: brands.img,
    })
    .from(brands)
    .where(and(eq(brands.id, id), eq(brands.isShown, 1)))
    .limit(1)

  if (!row) return null
  return { ...row, image: legacyAsset(row.image, 'brands') }
})
