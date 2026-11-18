import 'server-only'

import { and, asc, count, desc, eq, inArray, like, or, type SQL } from 'drizzle-orm'

import { db } from '@/db'
import { offers, offersProducts, products } from '../../drizzle/schema'

const PAGE_SIZE = 25

export type AdminOfferStatus = 'all' | 'shown' | 'hidden'

export type AdminOfferProduct = {
  id: number
  sku: string
  titleRu: string | null
  titleRo: string
  isShown: number
}

export type AdminOffer = {
  id: number
  dateFrom: string
  dateTo: string
  titleRu: string | null
  titleRo: string | null
  descRu: string
  descRo: string
  descEn: string
  uriRu: string | null
  uriRo: string | null
  sale: string
  isOnline: number
  progressMode: string
  locationRu: string
  locationRo: string
  imgRu: string
  imgRo: string
  imgBru: string
  imgBro: string
  seoTitleRu: string | null
  seoTitleRo: string | null
  seoDescRu: string | null
  seoDescRo: string | null
  viewHome: number
  sorder: number
  isShown: number
  products: AdminOfferProduct[]
}

function offerCondition(query: string, status: AdminOfferStatus): SQL | undefined {
  const conditions: SQL[] = []
  if (status === 'shown') conditions.push(eq(offers.isShown, 1))
  if (status === 'hidden') conditions.push(eq(offers.isShown, 0))
  const search = query.trim()
  if (search) {
    const pattern = `%${search}%`
    conditions.push(or(
      like(offers.titleRu, pattern), like(offers.titleRo, pattern),
      like(offers.uriRu, pattern), like(offers.uriRo, pattern), like(offers.sale, pattern),
    )!)
  }
  return conditions.length ? and(...conditions) : undefined
}

function offerSelect() {
  return {
    id: offers.id,
    dateFrom: offers.dateFrom,
    dateTo: offers.dateTo,
    titleRu: offers.titleRu,
    titleRo: offers.titleRo,
    descRu: offers.descRu,
    descRo: offers.descRo,
    descEn: offers.descEn,
    uriRu: offers.uriRu,
    uriRo: offers.uriRo,
    sale: offers.sale,
    isOnline: offers.isOnline,
    progressMode: offers.progressMode,
    locationRu: offers.locationRu,
    locationRo: offers.locationRo,
    imgRu: offers.imgRu,
    imgRo: offers.imgRo,
    imgBru: offers.imgBru,
    imgBro: offers.imgBro,
    seoTitleRu: offers.seoTitleRu,
    seoTitleRo: offers.seoTitleRo,
    seoDescRu: offers.seoDescRu,
    seoDescRo: offers.seoDescRo,
    viewHome: offers.viewHome,
    sorder: offers.sorder,
    isShown: offers.isShown,
  }
}

async function getProductsByOfferIds(offerIds: number[]) {
  if (!offerIds.length) return new Map<number, AdminOfferProduct[]>()
  const rows = await db.select({
    offerId: offersProducts.offersId,
    id: products.id,
    sku: products.sku,
    titleRu: products.titleRu,
    titleRo: products.titleRo,
    isShown: offersProducts.isShown,
  }).from(offersProducts)
    .innerJoin(products, eq(products.id, offersProducts.productId))
    .where(inArray(offersProducts.offersId, offerIds))
    .orderBy(asc(offersProducts.sorder), asc(offersProducts.id))
  const map = new Map<number, AdminOfferProduct[]>()
  for (const row of rows) {
    const productsForOffer = map.get(row.offerId) ?? []
    productsForOffer.push({ id: row.id, sku: row.sku, titleRu: row.titleRu, titleRo: row.titleRo, isShown: Number(row.isShown) })
    map.set(row.offerId, productsForOffer)
  }
  return map
}

export async function getAdminOfferList(options: { query?: string; status?: AdminOfferStatus; page?: number } = {}) {
  const condition = offerCondition(options.query?.trim() ?? '', options.status ?? 'all')
  const [{ total }] = await db.select({ total: count() }).from(offers).where(condition)
  const totalCount = Number(total ?? 0)
  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const page = Math.min(Math.max(1, Math.floor(options.page ?? 1)), pageCount)
  const rows = await db.select(offerSelect()).from(offers).where(condition)
    .orderBy(asc(offers.sorder), desc(offers.id))
    .limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE)
  const productsByOffer = await getProductsByOfferIds(rows.map((row) => row.id))

  return {
    items: rows.map((row) => ({
      ...row,
      isOnline: Number(row.isOnline),
      progressMode: row.progressMode ?? 'time',
      viewHome: Number(row.viewHome ?? 0),
      sorder: Number(row.sorder ?? 0),
      isShown: Number(row.isShown ?? 0),
      products: productsByOffer.get(row.id) ?? [],
    } satisfies AdminOffer)),
    total: totalCount,
    page,
    pageCount,
    pageSize: PAGE_SIZE,
  }
}

export async function getAdminOffer(id: number): Promise<AdminOffer | null> {
  const [row] = await db.select(offerSelect()).from(offers).where(eq(offers.id, id)).limit(1)
  if (!row) return null
  const productsByOffer = await getProductsByOfferIds([id])
  return {
    ...row,
    isOnline: Number(row.isOnline),
    progressMode: row.progressMode ?? 'time',
    viewHome: Number(row.viewHome ?? 0),
    sorder: Number(row.sorder ?? 0),
    isShown: Number(row.isShown ?? 0),
    products: productsByOffer.get(id) ?? [],
  }
}
