import { asc, and, eq, exists, gt, inArray, ne, or } from 'drizzle-orm'

import { db } from '@/db'
import type { StoreLocale } from '@/lib/locale-routing'
import { beautySelectionProducts, beautySelections, brands, categories, products, productsImg, productsVariable, productsVariableImg } from '../../drizzle/schema'
import type { CatalogProduct } from './catalog'
import { enrichCatalogProducts } from './catalog-card-data'

export type BeautySelectionSummary = {
  id: number
  title: string
  uri: string
  description: string | null
  image: string | null
}

export async function getBeautySelectionsPage(locale: StoreLocale = 'ru') {
  const isRomanian = locale === 'ro'
  const rows = await db
    .select({
      id: beautySelections.id,
      title: isRomanian ? beautySelections.titleRo : beautySelections.titleRu,
      uri: isRomanian ? beautySelections.uriRo : beautySelections.uriRu,
      description: isRomanian ? beautySelections.descRo : beautySelections.descRu,
      image: isRomanian ? beautySelections.imgRo : beautySelections.imgRu,
    })
    .from(beautySelections)
    .where(eq(beautySelections.isShown, 1))
    .orderBy(asc(beautySelections.sorder), asc(beautySelections.id))

  return rows satisfies BeautySelectionSummary[]
}

export async function getBeautySelectionPage(uri: string, locale: StoreLocale = 'ru') {
  const isRomanian = locale === 'ro'
  const uriCondition = or(
    eq(isRomanian ? beautySelections.uriRo : beautySelections.uriRu, uri),
    eq(isRomanian ? beautySelections.uriRu : beautySelections.uriRo, uri),
  )
  const lookupCondition = /^\d+$/.test(uri)
    ? or(uriCondition, eq(beautySelections.id, Number(uri)))
    : uriCondition
  const [selection] = await db
    .select({
      id: beautySelections.id,
      title: isRomanian ? beautySelections.titleRo : beautySelections.titleRu,
      uri: isRomanian ? beautySelections.uriRo : beautySelections.uriRu,
      description: isRomanian ? beautySelections.descRo : beautySelections.descRu,
      text: isRomanian ? beautySelections.textRo : beautySelections.textRu,
      image: isRomanian ? beautySelections.imgRo : beautySelections.imgRu,
    })
    .from(beautySelections)
    .where(and(lookupCondition, eq(beautySelections.isShown, 1)))
    .limit(1)

  if (!selection) return null

  const productConditions = and(
    eq(beautySelectionProducts.selectionId, selection.id),
    eq(products.isShown, 1),
    or(
      gt(products.price, 0),
      gt(products.discountPrice, 0),
      inArray(products.id, db.select({ productId: productsVariable.productId }).from(productsVariable).where(and(
        eq(productsVariable.isShown, 1), gt(productsVariable.price, 0), gt(productsVariable.qty, 0),
      ))),
    )!,
    or(
      exists(db.select({ id: productsImg.id }).from(productsImg).where(and(
        eq(productsImg.productId, products.id), eq(productsImg.isShown, 1), ne(productsImg.img, ''),
      ))),
      exists(db.select({ id: productsVariableImg.id }).from(productsVariableImg).where(and(
        eq(productsVariableImg.productId, products.id), eq(productsVariableImg.isShown, 1), ne(productsVariableImg.img, ''),
      ))),
    )!,
  )

  const rows = await db
    .select({
      id: products.id,
      title: isRomanian ? products.titleRo : products.titleRu,
      price: products.price,
      discountPrice: products.discountPrice,
      brand: brands.title,
      category: isRomanian ? categories.titleRo : categories.titleRu,
      sku: products.sku,
    })
    .from(beautySelectionProducts)
    .innerJoin(products, eq(beautySelectionProducts.productId, products.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(productConditions)
    .orderBy(asc(beautySelectionProducts.sorder), asc(beautySelectionProducts.id))

  const selectionProducts = await enrichCatalogProducts(rows.map((product) => ({
    ...product,
    image: null,
    locale,
  } satisfies CatalogProduct)))

  return { selection, products: selectionProducts }
}
