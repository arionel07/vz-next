import { and, asc, count, desc, eq, exists, gte, gt, inArray, lte, ne, or } from 'drizzle-orm'
import { cache } from 'react'

import { db } from '@/db'
import { legacyAsset } from '@/lib/legacy-assets'
import { brands, categories, giftPromotions, offers, offersProducts, products, productsImg, productsVariable, productsVariableImg } from '../../drizzle/schema'
import type { CatalogProduct } from './catalog'
import { enrichCatalogProducts } from './catalog-card-data'
import type { StoreLocale } from './locale-routing'

const OFFER_PAGE_SIZE = 20

export type OfferSummary = {
  id: number
  title: string | null
  description: string
  uri: string | null
  image: string | null
  isOnline: number
  dateFrom: string
  dateTo: string
  filterTypes: OfferFilter[]
}

export type OfferFilter = 'promo-code' | 'gift' | 'special-price' | 'announcement'

export type ProductOffer = {
  id: number
  title: string | null
  uri: string | null
  sale: string
  progressMode: string
  dateTo: string
  remainingStock: number
  isGift?: boolean
  conditionQty?: number
}

function activeDateCondition(column: typeof offers.dateFrom, today: string) {
  return lte(column, today)
}

function visibleOfferCondition(today: string) {
  return and(
    eq(offers.isShown, 1),
    inArray(offers.isOnline, [1, 2]),
    activeDateCondition(offers.dateFrom, today),
    or(
      gte(offers.dateTo, today),
    ),
  )
}

export async function getActiveOfferForProduct(productId: number, locale: StoreLocale = 'ru'): Promise<ProductOffer | null> {
  const isRomanian = locale === 'ro'
  const [product] = await db
    .select({ discountPrice: products.discountPrice, salePercent: products.salePercent })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1)

  if (!product || (product.discountPrice ?? 0) > 0 || (product.salePercent ?? 0) > 0) return null

  const [variableRows, offerRows] = await Promise.all([
    db
      .select({ discountPrice: productsVariable.discountPrice })
      .from(productsVariable)
      .where(and(eq(productsVariable.productId, productId), eq(productsVariable.isShown, 1))),
    db
      .select({
        id: offers.id,
        title: isRomanian ? offers.titleRo : offers.titleRu,
        uri: isRomanian ? offers.uriRo : offers.uriRu,
        sale: offers.sale,
        progressMode: offers.progressMode,
        dateTo: offers.dateTo,
        stock: products.stock,
      })
      .from(offersProducts)
      .innerJoin(offers, eq(offersProducts.offersId, offers.id))
      .innerJoin(products, eq(offersProducts.productId, products.id))
      .where(and(
        eq(offersProducts.productId, productId),
        eq(offersProducts.isShown, 1),
        eq(products.isShown, 1),
        gt(products.price, 0),
        or(gt(products.onStock, 0), gt(products.stock, 0)),
        visibleOfferCondition(new Date().toISOString().slice(0, 10)),
      )),
  ])

  if (variableRows.some((variable) => Number(variable.discountPrice) > 0)) return null
  const uniqueOffers = [...new Map(offerRows.map((offer) => [offer.id, offer])).values()]
  if (uniqueOffers.length !== 1) return null

  const offer = uniqueOffers[0]
  return {
    id: offer.id,
    title: offer.title,
    uri: offer.uri,
    sale: offer.sale,
    progressMode: offer.progressMode,
    dateTo: offer.dateTo,
    remainingStock: Number(offer.stock ?? 0),
  }
}

export async function getOffersPage(locale: StoreLocale = 'ru') {
  const isRomanian = locale === 'ro'
  const rows = await db
    .select({
      id: offers.id,
      title: isRomanian ? offers.titleRo : offers.titleRu,
      description: isRomanian ? offers.descRo : offers.descRu,
      uri: isRomanian ? offers.uriRo : offers.uriRu,
      image: isRomanian ? offers.imgRo : offers.imgRu,
      isOnline: offers.isOnline,
      sale: offers.sale,
      dateFrom: offers.dateFrom,
      dateTo: offers.dateTo,
    })
    .from(offers)
    .where(eq(offers.isShown, 1))
    .orderBy(asc(offers.sorder), desc(offers.dateTo), desc(offers.id))

  const offerIds = rows.map((offer) => offer.id)
  const giftRows = offerIds.length
    ? await db.select({ offerId: giftPromotions.offerId })
      .from(giftPromotions)
      .where(and(
        inArray(giftPromotions.offerId, offerIds),
        eq(giftPromotions.isEnabled, 1),
        eq(giftPromotions.showOnSite, 1),
      ))
    : []
  const giftOfferIds = new Set(giftRows.flatMap((row) => row.offerId === null ? [] : [row.offerId]))
  const today = new Date().toISOString().slice(0, 10)

  return rows.map((offer) => {
    const searchableText = `${offer.title ?? ''} ${offer.description} ${offer.sale}`.toLocaleLowerCase()
    const filterTypes: OfferFilter[] = []
    if (/(промокод|promo[ -]?code|cod promo|cod promoțional|voucher|coupon)/iu.test(searchableText)) filterTypes.push('promo-code')
    if (giftOfferIds.has(offer.id) || /(подар|cadou|\bgift\b)/iu.test(searchableText)) filterTypes.push('gift')
    if (offer.dateFrom > today) filterTypes.push('announcement')
    if (offer.sale.trim() || /(специальн.{0,12}цен|special price|preț special|reducere|скидк)/iu.test(searchableText)) filterTypes.push('special-price')
    return { ...offer, filterTypes }
  }) satisfies OfferSummary[]
}

export type OfferSeo = {
  id: number
  title: string | null
  seoTitle: string | null
  seoDescription: string | null
  seoKeywords: string | null
  image: string | null
  uriRu: string | null
  uriRo: string | null
}

export const getOfferSeo = cache(async function getOfferSeo(uri: string, locale: StoreLocale = 'ru'): Promise<OfferSeo | null> {
  const isRomanian = locale === 'ro'
  const [row] = await db
    .select({
      id: offers.id,
      title: isRomanian ? offers.titleRo : offers.titleRu,
      seoTitle: isRomanian ? offers.seoTitleRo : offers.seoTitleRu,
      seoDescription: isRomanian ? offers.seoDescRo : offers.seoDescRu,
      seoKeywords: isRomanian ? offers.seoKeywordsRo : offers.seoKeywordsRu,
      image: offers.img,
      uriRu: offers.uriRu,
      uriRo: offers.uriRo,
    })
    .from(offers)
    .where(and(
      eq(offers.isShown, 1),
      or(eq(offers.uriRu, uri), eq(offers.uriRo, uri))!,
    ))
    .limit(1)

  if (!row) return null
  return { ...row, image: legacyAsset(row.image, 'offers') }
})

export async function getOfferPage(uri: string, page = 1, locale: StoreLocale = 'ru') {
  const isRomanian = locale === 'ro'
  const matchingOffer = /^\d+$/.test(uri)
    ? or(
      eq(isRomanian ? offers.uriRo : offers.uriRu, uri),
      eq(isRomanian ? offers.uriRu : offers.uriRo, uri),
      eq(offers.id, Number(uri)),
    )
    : or(
      eq(isRomanian ? offers.uriRo : offers.uriRu, uri),
      eq(isRomanian ? offers.uriRu : offers.uriRo, uri),
    )
  const [offer] = await db
    .select({
      id: offers.id,
      title: isRomanian ? offers.titleRo : offers.titleRu,
      description: isRomanian ? offers.descRo : offers.descRu,
      location: isRomanian ? offers.locationRo : offers.locationRu,
      dateFrom: offers.dateFrom,
      dateTo: offers.dateTo,
      desktopImage: isRomanian ? offers.imgBro : offers.imgBru,
      mobileImage: isRomanian ? offers.imgRo : offers.imgRu,
      uri: isRomanian ? offers.uriRo : offers.uriRu,
      isOnline: offers.isOnline,
    })
    .from(offers)
    .where(and(
      eq(offers.isShown, 1),
      matchingOffer,
    ))
    .limit(1)

  if (!offer) return null

  const productConditions = and(
    eq(offersProducts.offersId, offer.id),
    eq(offersProducts.isShown, 1),
    eq(products.isShown, 1),
    or(
      gt(products.price, 0),
      gt(products.discountPrice, 0),
      inArray(products.id, db.select({ productId: productsVariable.productId }).from(productsVariable).where(and(
        eq(productsVariable.isShown, 1), gt(productsVariable.price, 0), gt(productsVariable.qty, 0),
      ))),
    )!,
    or(
      gt(products.onStock, 0),
      gt(products.stock, 0),
      inArray(products.id, db.select({ productId: productsVariable.productId }).from(productsVariable).where(and(
        eq(productsVariable.isShown, 1), gt(productsVariable.qty, 0), gt(productsVariable.price, 0),
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

  const offset = (page - 1) * OFFER_PAGE_SIZE
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: products.id,
        title: isRomanian ? products.titleRo : products.titleRu,
        price: products.price,
        discountPrice: products.discountPrice,
        brand: brands.title,
        category: isRomanian ? categories.titleRo : categories.titleRu,
        sku: products.sku,
      })
      .from(offersProducts)
      .innerJoin(products, eq(offersProducts.productId, products.id))
      .leftJoin(brands, eq(products.brandId, brands.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(productConditions)
      .orderBy(desc(products.stock), asc(products.sorder), asc(products.id))
      .limit(OFFER_PAGE_SIZE)
      .offset(offset),
    db
      .select({ total: count() })
      .from(offersProducts)
      .innerJoin(products, eq(offersProducts.productId, products.id))
      .where(productConditions),
  ])

  const catalogProducts = await enrichCatalogProducts(rows.map((product) => ({
    ...product,
    image: null,
    locale,
  } satisfies CatalogProduct)))

  return {
    offer,
    products: catalogProducts,
    total: Number(total),
    page,
    pageSize: OFFER_PAGE_SIZE,
  }
}
