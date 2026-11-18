import { and, asc, eq, inArray } from 'drizzle-orm'

import { db } from '@/db'
import { legacyAssetIfExists } from '@/lib/legacy-server-assets'
import type { StoreLocale } from '@/lib/locale-routing'
import { products, productsVariable, productsVariableImg } from '../../drizzle/schema'

export type GiftCardOption = {
  amount: number
  variantId: number
  image: string | null
}

export type GiftCardPageData = {
  productId: number
  title: string
  options: GiftCardOption[]
}

const PRODUCT_ID = 10086
const AMOUNTS = [200, 300, 500, 1000]

export async function getGiftCardPage(locale: StoreLocale = 'ru') {
  const [productRows, variants] = await Promise.all([
    db
      .select({ title: locale === 'ro' ? products.titleRo : products.titleRu })
      .from(products)
      .where(and(eq(products.id, PRODUCT_ID), eq(products.isShown, 1)))
      .limit(1),
    db
      .select({
        id: productsVariable.id,
        price: productsVariable.price,
      })
      .from(productsVariable)
      .where(and(eq(productsVariable.productId, PRODUCT_ID), eq(productsVariable.isShown, 1)))
      .orderBy(asc(productsVariable.price), asc(productsVariable.id)),
  ])

  const variantIds = variants.map((variant) => variant.id)
  const imageRows = variantIds.length
    ? await db
        .select({ variantId: productsVariableImg.variableId, image: productsVariableImg.img })
        .from(productsVariableImg)
        .where(and(inArray(productsVariableImg.variableId, variantIds), eq(productsVariableImg.isShown, 1)))
        .orderBy(asc(productsVariableImg.sorder), asc(productsVariableImg.id))
    : []
  const imageByVariant = new Map<number, string>()
  for (const row of imageRows) {
    if (!imageByVariant.has(row.variantId)) imageByVariant.set(row.variantId, row.image)
  }

  const options = AMOUNTS.flatMap((amount) => {
    const variant = variants.find((item) => Number(item.price) === amount)
    return variant
      ? [{ amount, variantId: variant.id, image: imageByVariant.get(variant.id) ? legacyAssetIfExists(imageByVariant.get(variant.id), 'products_variable_img') : null }]
      : []
  })

  return {
    productId: PRODUCT_ID,
    title: productRows[0]?.title ?? (locale === 'ro' ? 'Carduri cadou' : 'Подарочные сертификаты'),
    options,
  } satisfies GiftCardPageData
}
