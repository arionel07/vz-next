import 'server-only'

import { and, asc, count, eq, inArray, like, or } from 'drizzle-orm'

import { db } from '@/db'
import {
  brands,
  giftPromotionBrands,
  giftPromotions,
  gifts,
  offers,
  products,
  productsImg,
  productsVariable,
  promocodeBrands,
  promocodeExcludedBrands,
  promocodeUsages,
  promocodes,
} from '../../drizzle/schema'

export type AdminGiftProductOption = { id: number; sku: string; titleRu: string | null; titleRo: string; image: string | null }
export type AdminGiftVariantOption = { id: number; productId: number; sku: string | null; titleRu: string | null; titleRo: string; volume: string; colorRu: string; colorRo: string; isShown: number | null }
export type AdminBrandOption = { id: number; title: string | null }

export type AdminGift = {
  id: number; titleRu: string; titleRo: string; descriptionRu: string | null; descriptionRo: string | null
  productId: number | null; variantId: number | null; productTitle: string | null; productTitleRo: string | null; productSku: string | null
  productImage: string | null; variantLabel: string | null; isEnabled: number; showOnSite: number; sorder: number
}

export type AdminGiftPromotion = {
  id: number; titleRu: string; titleRo: string; descriptionRu: string | null; descriptionRo: string | null
  giftId: number; giftTitle: string | null; offerId: number | null; offerTitle: string | null
  conditionQty: number; isEnabled: number; showOnSite: number; isOnline: number; progressMode: string
  dateFrom: string | null; dateTo: string | null; sorder: number; brandIds: number[]; brandTitles: string[]
}

export type AdminPromocode = {
  id: number; name: string; code: string; type: 'percentage' | 'fixed'; value: string
  minAmount: string | null; maxDiscount: string | null; usageLimit: number | null; perUserLimit: number | null
  allowDiscounted: number; startsAt: string | null; endsAt: string | null; status: 'draft' | 'active' | 'disabled'
  brandScope: 'all' | 'selected'; brandIds: number[]; excludedBrandIds: number[]; usages: number
}

export type AdminGiftsPromocodesData = {
  gifts: AdminGift[]
  giftPromotions: AdminGiftPromotion[]
  promocodes: AdminPromocode[]
  brands: AdminBrandOption[]
  offers: { id: number; titleRu: string | null; uriRu: string | null }[]
}

export async function getAdminGiftsPromocodesData(): Promise<AdminGiftsPromocodesData> {
  const [brandRows, giftRows, ruleRows, promoRows, offerRows] = await Promise.all([
    db.select({ id: brands.id, title: brands.title }).from(brands).orderBy(asc(brands.title)).limit(3000),
    db.select({
      id: gifts.id, titleRu: gifts.titleRu, titleRo: gifts.titleRo,
      descriptionRu: gifts.descriptionRu, descriptionRo: gifts.descriptionRo,
      productId: gifts.productId, variantId: gifts.variantId, isEnabled: gifts.isEnabled,
      showOnSite: gifts.showOnSite, sorder: gifts.sorder,
      productTitle: products.titleRu, productTitleRo: products.titleRo, productSku: products.sku,
      variantTitle: productsVariable.titleRu, variantVolume: productsVariable.volumeVar,
      variantColor: productsVariable.colorRu,
    }).from(gifts)
      .leftJoin(products, eq(gifts.productId, products.id))
      .leftJoin(productsVariable, eq(gifts.variantId, productsVariable.id))
      .orderBy(asc(gifts.sorder), asc(gifts.id)).limit(1000),
    db.select({
      id: giftPromotions.id, titleRu: giftPromotions.titleRu, titleRo: giftPromotions.titleRo,
      descriptionRu: giftPromotions.descriptionRu, descriptionRo: giftPromotions.descriptionRo,
      giftId: giftPromotions.giftId, giftTitle: gifts.titleRu,
      offerId: giftPromotions.offerId, offerTitle: offers.titleRu,
      conditionQty: giftPromotions.conditionQty, isEnabled: giftPromotions.isEnabled,
      showOnSite: giftPromotions.showOnSite, isOnline: giftPromotions.isOnline,
      progressMode: giftPromotions.progressMode, dateFrom: giftPromotions.dateFrom,
      dateTo: giftPromotions.dateTo, sorder: giftPromotions.sorder,
    }).from(giftPromotions)
      .leftJoin(gifts, eq(giftPromotions.giftId, gifts.id))
      .leftJoin(offers, eq(giftPromotions.offerId, offers.id))
      .orderBy(asc(giftPromotions.sorder), asc(giftPromotions.id)).limit(1000),
    db.select({
      id: promocodes.id, name: promocodes.name, code: promocodes.code, type: promocodes.type,
      value: promocodes.value, minAmount: promocodes.minAmount, maxDiscount: promocodes.maxDiscount,
      usageLimit: promocodes.usageLimit, perUserLimit: promocodes.perUserLimit,
      allowDiscounted: promocodes.allowDiscounted, startsAt: promocodes.startsAt, endsAt: promocodes.endsAt,
      status: promocodes.status, brandScope: promocodes.brandScope,
    }).from(promocodes).orderBy(asc(promocodes.createdAt), asc(promocodes.id)).limit(1000),
    db.select({ id: offers.id, titleRu: offers.titleRu, uriRu: offers.uriRu }).from(offers).orderBy(asc(offers.titleRu)).limit(1000),
  ])

  const [giftImages, ruleBrandRows, promoBrandRows, excludedBrandRows, promoUsageRows] = await Promise.all([
    giftRows.some((row) => row.productId)
      ? db.select({ productId: productsImg.productId, image: productsImg.img }).from(productsImg)
        .where(and(inArray(productsImg.productId, [...new Set(giftRows.flatMap((row) => row.productId ? [row.productId] : []))]), eq(productsImg.isShown, 1)))
        .orderBy(asc(productsImg.sorder), asc(productsImg.id))
      : Promise.resolve([]),
    ruleRows.length ? db.select().from(giftPromotionBrands).where(inArray(giftPromotionBrands.promotionId, ruleRows.map((row) => row.id))) : Promise.resolve([]),
    promoRows.length ? db.select().from(promocodeBrands).where(inArray(promocodeBrands.promocodeId, promoRows.map((row) => row.id))) : Promise.resolve([]),
    promoRows.length ? db.select().from(promocodeExcludedBrands).where(inArray(promocodeExcludedBrands.promocodeId, promoRows.map((row) => row.id))) : Promise.resolve([]),
    promoRows.length ? db.select({ promocodeId: promocodeUsages.promocodeId, total: count() }).from(promocodeUsages)
      .where(inArray(promocodeUsages.promocodeId, promoRows.map((row) => row.id))).groupBy(promocodeUsages.promocodeId) : Promise.resolve([]),
  ])

  const firstImageByProduct = new Map<number, string>()
  for (const image of giftImages) if (!firstImageByProduct.has(image.productId)) firstImageByProduct.set(image.productId, image.image)
  const brandTitle = new Map(brandRows.map((brand) => [brand.id, brand.title]))
  const ruleBrands = new Map<number, number[]>()
  for (const relation of ruleBrandRows) ruleBrands.set(relation.promotionId, [...(ruleBrands.get(relation.promotionId) ?? []), relation.brandId])
  const promoBrands = new Map<number, number[]>()
  for (const relation of promoBrandRows) promoBrands.set(relation.promocodeId, [...(promoBrands.get(relation.promocodeId) ?? []), relation.brandId])
  const excludedBrands = new Map<number, number[]>()
  for (const relation of excludedBrandRows) excludedBrands.set(relation.promocodeId, [...(excludedBrands.get(relation.promocodeId) ?? []), relation.brandId])
  const usages = new Map(promoUsageRows.map((row) => [row.promocodeId, Number(row.total)]))

  return {
    brands: brandRows,
    offers: offerRows,
    gifts: giftRows.map((row) => ({
      id: row.id, titleRu: row.titleRu, titleRo: row.titleRo,
      descriptionRu: row.descriptionRu, descriptionRo: row.descriptionRo,
      productId: row.productId, variantId: row.variantId,
      productTitle: row.productTitle, productTitleRo: row.productTitleRo, productSku: row.productSku,
      productImage: row.productId ? firstImageByProduct.get(row.productId) ?? null : null,
      variantLabel: [row.variantTitle, row.variantVolume, row.variantColor].filter(Boolean).join(' · ') || null,
      isEnabled: Number(row.isEnabled), showOnSite: Number(row.showOnSite), sorder: Number(row.sorder),
    })),
    giftPromotions: ruleRows.map((row) => {
      const ids = ruleBrands.get(row.id) ?? []
      return { ...row, conditionQty: Number(row.conditionQty), isEnabled: Number(row.isEnabled), showOnSite: Number(row.showOnSite), isOnline: Number(row.isOnline), sorder: Number(row.sorder), brandIds: ids, brandTitles: ids.map((id) => brandTitle.get(id)).filter((title): title is string => Boolean(title)) }
    }),
    promocodes: promoRows.map((row) => ({
      ...row, allowDiscounted: Number(row.allowDiscounted), brandIds: promoBrands.get(row.id) ?? [],
      excludedBrandIds: excludedBrands.get(row.id) ?? [], usages: usages.get(row.id) ?? 0,
    })),
  }
}

export async function searchAdminGiftProducts(query: string): Promise<AdminGiftProductOption[]> {
  const term = query.trim()
  if (term.length < 2) return []
  const pattern = `%${term}%`
  const conditions = [like(products.titleRu, pattern), like(products.titleRo, pattern), like(products.sku, pattern)]
  if (/^\d+$/.test(term)) conditions.push(eq(products.id, Number(term)))
  const rows = await db.select({
    id: products.id, sku: products.sku, titleRu: products.titleRu, titleRo: products.titleRo,
  }).from(products)
    .where(and(or(eq(products.isShown, 1), eq(products.isGift, 1)), or(...conditions)))
    .orderBy(asc(products.titleRu)).limit(15)
  if (!rows.length) return []
  const imageRows = await db.select({ productId: productsImg.productId, image: productsImg.img })
    .from(productsImg).where(and(inArray(productsImg.productId, rows.map((row) => row.id)), eq(productsImg.isShown, 1)))
    .orderBy(asc(productsImg.sorder), asc(productsImg.id))
  const images = new Map<number, string>()
  for (const row of imageRows) if (!images.has(row.productId)) images.set(row.productId, row.image)
  return rows.map((row) => ({ ...row, image: images.get(row.id) ?? null }))
}

export async function getAdminGiftVariants(productId: number): Promise<AdminGiftVariantOption[]> {
  if (!Number.isInteger(productId) || productId < 1) return []
  return db.select({
    id: productsVariable.id, productId: productsVariable.productId, sku: productsVariable.sku,
    titleRu: productsVariable.titleRu, titleRo: productsVariable.titleRo,
    volume: productsVariable.volumeVar, colorRu: productsVariable.colorRu,
    colorRo: productsVariable.colorRo, isShown: productsVariable.isShown,
  }).from(productsVariable).where(eq(productsVariable.productId, productId))
    .orderBy(asc(productsVariable.sorder), asc(productsVariable.id)).limit(500)
}
