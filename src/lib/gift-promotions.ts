import { and, asc, eq, gt, gte, inArray, isNull, lte, or, sql } from 'drizzle-orm'

import { db } from '@/db'
import {
  brands,
  giftPromotionBrands,
  giftPromotions,
  gifts,
  products,
  productsImg,
  productsVariable,
} from '../../drizzle/schema'
import type { StoreLocale } from './locale-routing'

export type GiftCartInput = {
  id: number
  variantId?: number | null
  quantity: number
}

export type GiftVariantOption = { id: number; label: string; stock: number }

export type GiftCartItem = {
  id: number
  variantId: number | null
  variantLabel: string | null
  giftVariantOptions: GiftVariantOption[]
  giftVariantRequired: boolean
  title: string
  brand: string
  price: 1
  image: string | null
  quantity: 1
  isGift: true
  giftPromotionId: number
  giftPromotionTitle: string
}

export type GiftProductPromotion = {
  id: number
  title: string | null
  uri: null
  sale: string
  progressMode: string
  dateTo: string
  remainingStock: number
  isGift: true
  conditionQty: number
}

type ActiveGiftPromotion = {
  promotionId: number
  title: string
  conditionQty: number
  giftId: number
  productId: number | null
  variantId: number | null
}

function todayInShopTimeZone() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Chisinau', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}

function variantLabel(variant: { titleRu: string | null; titleRo: string; volumeVar: string; colorRu: string; colorRo: string }, locale: StoreLocale) {
  const value = locale === 'ro'
    ? [variant.titleRo, variant.volumeVar, variant.colorRo].filter(Boolean)[0]
    : [variant.titleRu, variant.volumeVar, variant.colorRu].filter(Boolean)[0]
  return String(value ?? '').trim()
}

function activeDateConditions() {
  const today = todayInShopTimeZone()
  return and(
    or(isNull(giftPromotions.dateFrom), sql`CAST(${giftPromotions.dateFrom} AS CHAR) IN ('', '0000-00-00')`, lte(giftPromotions.dateFrom, today)),
    or(isNull(giftPromotions.dateTo), sql`CAST(${giftPromotions.dateTo} AS CHAR) IN ('', '0000-00-00')`, gte(giftPromotions.dateTo, today)),
  )
}

export async function getActiveGiftPromotionForProduct(productId: number, locale: StoreLocale = 'ru'): Promise<GiftProductPromotion | null> {
  const [product] = await db.select({ brandId: products.brandId }).from(products).where(eq(products.id, productId)).limit(1)
  if (!product?.brandId) return null

  const [promotion] = await db.select({
    id: giftPromotions.id,
    title: locale === 'ro' ? giftPromotions.titleRo : giftPromotions.titleRu,
    progressMode: giftPromotions.progressMode,
    dateTo: giftPromotions.dateTo,
    conditionQty: giftPromotions.conditionQty,
    giftId: gifts.id,
    productId: gifts.productId,
    variantId: gifts.variantId,
  }).from(giftPromotionBrands)
    .innerJoin(giftPromotions, eq(giftPromotionBrands.promotionId, giftPromotions.id))
    .innerJoin(gifts, eq(giftPromotions.giftId, gifts.id))
    .where(and(
      eq(giftPromotionBrands.brandId, product.brandId),
      eq(giftPromotions.isEnabled, 1), eq(giftPromotions.showOnSite, 1), inArray(giftPromotions.isOnline, [1, 2]),
      eq(gifts.isEnabled, 1), eq(gifts.showOnSite, 1), activeDateConditions(),
    ))
    .orderBy(asc(giftPromotions.sorder), asc(giftPromotions.id)).limit(1)
  if (!promotion?.productId) return null

  const [giftProduct] = await db.select({ onStock: products.onStock, isShown: products.isShown, isGift: products.isGift })
    .from(products).where(eq(products.id, promotion.productId)).limit(1)
  if (giftProduct?.isShown !== 1 || giftProduct.isGift !== 1) return null
  const variants = await db.select({ id: productsVariable.id, qty: productsVariable.qty, isShown: productsVariable.isShown })
    .from(productsVariable).where(and(eq(productsVariable.productId, promotion.productId), eq(productsVariable.isShown, 1), gt(productsVariable.qty, 0)))
  const fixedVariant = promotion.variantId ? variants.find((variant) => variant.id === promotion.variantId) : null
  const remainingStock = promotion.variantId
    ? Number(fixedVariant?.qty ?? 0)
    : Math.max(Number(giftProduct.onStock ?? 0), variants.reduce((sum, variant) => sum + Number(variant.qty ?? 0), 0))
  if (remainingStock <= 0) return null

  return {
    id: promotion.id,
    title: promotion.title,
    uri: null,
    sale: locale === 'ro' ? 'Cadou' : 'Подарок',
    progressMode: promotion.progressMode,
    dateTo: promotion.dateTo ?? '',
    remainingStock,
    isGift: true,
    conditionQty: promotion.conditionQty ?? 1,
  }
}

export async function calculateGiftItems(
  items: GiftCartInput[],
  locale: StoreLocale = 'ru',
  selectedVariants: Record<number, number | null> = {},
): Promise<GiftCartItem[]> {
  const paidItems = items.filter((item) => item.quantity > 0)
  if (!paidItems.length) return []

  const activePromotions = await db.select({
    promotionId: giftPromotions.id,
    title: locale === 'ro' ? giftPromotions.titleRo : giftPromotions.titleRu,
    conditionQty: giftPromotions.conditionQty,
    giftId: gifts.id,
    productId: gifts.productId,
    variantId: gifts.variantId,
  }).from(giftPromotions).innerJoin(gifts, eq(giftPromotions.giftId, gifts.id))
    .where(and(
      eq(giftPromotions.isEnabled, 1), eq(giftPromotions.showOnSite, 1), inArray(giftPromotions.isOnline, [1, 2]),
      eq(gifts.isEnabled, 1), eq(gifts.showOnSite, 1), activeDateConditions(),
    ))
    .orderBy(asc(giftPromotions.sorder), asc(giftPromotions.id))
  if (!activePromotions.length) return []

  const promotionIds = activePromotions.map((promotion) => promotion.promotionId)
  const giftProductIds = [...new Set(activePromotions.flatMap((promotion) => promotion.productId ? [promotion.productId] : []))]
  const productIds = [...new Set([...giftProductIds, ...paidItems.map((item) => item.id)])]
  const [brandRows, productRows, variantRows, imageRows] = await Promise.all([
    db.select({ promotionId: giftPromotionBrands.promotionId, brandId: giftPromotionBrands.brandId })
      .from(giftPromotionBrands).where(inArray(giftPromotionBrands.promotionId, promotionIds)),
    productIds.length ? db.select({
      id: products.id,
      titleRu: products.titleRu,
      titleRo: products.titleRo,
      brandId: products.brandId,
      brand: brands.title,
      onStock: products.onStock,
      isGift: products.isGift,
    }).from(products).leftJoin(brands, eq(products.brandId, brands.id))
      .where(and(inArray(products.id, productIds), eq(products.isShown, 1))) : Promise.resolve([]),
    giftProductIds.length ? db.select({
      id: productsVariable.id,
      productId: productsVariable.productId,
      titleRu: productsVariable.titleRu,
      titleRo: productsVariable.titleRo,
      volumeVar: productsVariable.volumeVar,
      colorRu: productsVariable.colorRu,
      colorRo: productsVariable.colorRo,
      qty: productsVariable.qty,
      isShown: productsVariable.isShown,
    }).from(productsVariable).where(and(inArray(productsVariable.productId, giftProductIds), eq(productsVariable.isShown, 1), gt(productsVariable.qty, 0))) : Promise.resolve([]),
    giftProductIds.length ? db.select({ productId: productsImg.productId, image: productsImg.img })
      .from(productsImg).where(and(inArray(productsImg.productId, giftProductIds), eq(productsImg.isShown, 1)))
      .orderBy(asc(productsImg.sorder), asc(productsImg.id)) : Promise.resolve([]),
  ])

  const brandIdsByPromotion = new Map<number, Set<number>>()
  for (const row of brandRows) {
    const ids = brandIdsByPromotion.get(row.promotionId) ?? new Set<number>()
    ids.add(row.brandId)
    brandIdsByPromotion.set(row.promotionId, ids)
  }
  const productById = new Map(productRows.map((product) => [product.id, product]))
  const variantsByProduct = new Map<number, typeof variantRows>()
  for (const variant of variantRows) {
    const variants = variantsByProduct.get(variant.productId) ?? []
    variants.push(variant)
    variantsByProduct.set(variant.productId, variants)
  }
  const imageByProduct = new Map<number, string>()
  for (const row of imageRows) if (!imageByProduct.has(row.productId)) imageByProduct.set(row.productId, row.image)

  return activePromotions.flatMap((promotion) => {
    if (!promotion.productId) return []
    const giftProduct = productById.get(promotion.productId)
    if (!giftProduct || giftProduct.isGift !== 1) return []
    const allowedBrands = brandIdsByPromotion.get(promotion.promotionId)
    const qualifyingQuantity = paidItems.reduce((sum, item) => {
      const product = productById.get(item.id)
      return product && allowedBrands?.has(product.brandId ?? 0) ? sum + item.quantity : sum
    }, 0)
    if (qualifyingQuantity < (promotion.conditionQty ?? 1)) return []

    const availableVariants = (variantsByProduct.get(promotion.productId) ?? []).map((variant) => ({
      id: variant.id,
      label: variantLabel(variant, locale) || String(variant.id),
      stock: Number(variant.qty ?? 0),
    }))
    let selectedVariant: GiftVariantOption | undefined
    let variantRequired = false
    if (promotion.variantId) {
      selectedVariant = availableVariants.find((variant) => variant.id === promotion.variantId)
      if (!selectedVariant) return []
    } else if (availableVariants.length) {
      selectedVariant = availableVariants.find((variant) => variant.id === selectedVariants[promotion.promotionId])
      variantRequired = !selectedVariant
    } else if (Number(giftProduct.onStock ?? 0) <= 0) {
      return []
    }

    const variant = selectedVariant ? (variantsByProduct.get(promotion.productId) ?? []).find((row) => row.id === selectedVariant?.id) : null
    return [{
      id: giftProduct.id,
      variantId: selectedVariant?.id ?? null,
      variantLabel: variant ? variantLabel(variant, locale) || null : null,
      giftVariantOptions: promotion.variantId ? [] : availableVariants,
      giftVariantRequired: variantRequired,
      title: (locale === 'ro' ? giftProduct.titleRo : giftProduct.titleRu) ?? promotion.title,
      brand: giftProduct.brand ?? 'VIZAJE-NICA',
      price: 1 as const,
      image: imageByProduct.get(giftProduct.id) ?? null,
      quantity: 1 as const,
      isGift: true as const,
      giftPromotionId: promotion.promotionId,
      giftPromotionTitle: promotion.title,
    }]
  })
}

