import { and, asc, desc, eq, inArray, or } from 'drizzle-orm'

import { db } from '@/db'
import type { StoreLocale } from '@/lib/locale-routing'
import {
  brands,
  clients,
  orders,
  ordersProducts,
  products,
  productsImg,
  wishlistItems,
} from '../../drizzle/schema'

export type AccountProfile = {
  id: number
  name: string
  surname: string
  email: string
  phone: string
  address: string
  apartment: string
  city: string
  house: string
  porch: string
  birthday: string
  sex: number
  smsSubscribe: boolean
  mailSubscribe: boolean
  bonus: number
  discount: number
}

export type AccountProduct = {
  id: number
  title: string
  brand: string
  image: string | null
  sku: string | null
  volume: string | null
  price: number
  discountPrice: number | null
}

export type AccountOrder = {
  id: number
  orderId: number | null
  status: string
  delivery: number | null
  total: number
  deliveryPrice: number
  bonusPlus: number
  bonusMinus: number
  added: string | null
  products: Array<AccountProduct & { quantity: number; lineTotal: number }>
}

export type AccountData = {
  profile: AccountProfile
  favorites: AccountProduct[]
  orders: AccountOrder[]
  favoriteIds: number[]
}

function asNumber(value: unknown) {
  const result = Number(value)
  return Number.isFinite(result) ? result : 0
}

function profileFromClient(client: typeof clients.$inferSelect): AccountProfile {
  return {
    id: client.id,
    name: client.name ?? '',
    surname: client.surname ?? '',
    email: client.email ?? '',
    phone: client.phone ?? '',
    address: client.address ?? '',
    apartment: client.apartament ?? '',
    city: client.city ?? '',
    house: client.house ?? '',
    porch: client.porch ?? '',
    birthday: client.birthday ?? '',
    sex: client.sex ?? 0,
    smsSubscribe: client.smsSubscribe === 1,
    mailSubscribe: client.mailSubscribe === 1,
    bonus: asNumber(client.bonus),
    discount: asNumber(client.discount),
  }
}

async function loadProducts(productIds: number[], locale: StoreLocale) {
  if (!productIds.length) return new Map<number, AccountProduct>()

  const rows = await db
    .select({
      id: products.id,
      titleRu: products.titleRu,
      titleRo: products.titleRo,
      brand: brands.title,
      sku: products.sku,
      volume: products.volume,
      price: products.price,
      discountPrice: products.discountPrice,
    })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(inArray(products.id, productIds))

  const imageRows = await db
    .select({ productId: productsImg.productId, image: productsImg.img })
    .from(productsImg)
    .where(inArray(productsImg.productId, productIds))
    .orderBy(asc(productsImg.sorder), asc(productsImg.id))

  const imageByProduct = new Map<number, string>()
  for (const row of imageRows) {
    if (!imageByProduct.has(row.productId)) imageByProduct.set(row.productId, row.image)
  }

  return new Map(rows.map((row) => [row.id, {
    id: row.id,
    title: (locale === 'ro' ? row.titleRo : row.titleRu) ?? row.titleRu ?? 'Товар без названия',
    brand: row.brand ?? 'VIZAJE-NICA',
    image: imageByProduct.get(row.id) ?? null,
    sku: row.sku ?? null,
    volume: row.volume ?? null,
    price: asNumber(row.price),
    discountPrice: row.discountPrice == null ? null : asNumber(row.discountPrice),
  }]))
}

function accountOrderFromProducts(
  order: typeof orders.$inferSelect,
  productsForOrder: AccountOrder['products'],
): AccountOrder {
  return {
    id: order.id,
    orderId: order.orderId,
    status: order.status,
    delivery: order.delivery,
    total: asNumber(order.total),
    deliveryPrice: asNumber(order.deliveryPrice),
    bonusPlus: asNumber(order.bonusPlus),
    bonusMinus: asNumber(order.bonusMinus),
    added: order.added,
    products: productsForOrder,
  }
}

function productsFromRows(
  orderProductRows: Array<typeof ordersProducts.$inferSelect>,
  productById: Map<number, AccountProduct>,
) {
  const productsForOrder: AccountOrder['products'] = []
  for (const row of orderProductRows) {
    const product = row.productId ? productById.get(row.productId) : null
    if (!product) continue
    const quantity = Number(row.qty ?? 0)
    const lineTotal = asNumber(row.total) || asNumber(row.price) * quantity
    productsForOrder.push({ ...product, quantity, lineTotal })
  }
  return productsForOrder
}

export async function getAccountData(clientId: number, locale: StoreLocale = 'ru'): Promise<AccountData | null> {
  const [client] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1)
  if (!client) return null

  const [favoriteRows, orderRows] = await Promise.all([
    db.select({ productId: wishlistItems.productId })
      .from(wishlistItems)
      .where(eq(wishlistItems.contactId, clientId))
      .orderBy(desc(wishlistItems.id)),
    db.select().from(orders)
      .where(eq(orders.clientId, clientId))
      .orderBy(desc(orders.added), desc(orders.id))
      .limit(100),
  ])

  const orderIds = orderRows.map((order) => order.id)
  const orderProductRows = orderIds.length
    ? await db.select().from(ordersProducts).where(inArray(ordersProducts.orderId, orderIds))
    : []
  const favoriteIds = favoriteRows.map((row) => row.productId)
  const orderProductIds = orderProductRows.map((row) => row.productId).filter((id): id is number => Boolean(id))
  const productById = await loadProducts([...new Set([...favoriteIds, ...orderProductIds])], locale)

  const favorites = favoriteIds
    .map((productId) => productById.get(productId))
    .filter((product): product is AccountProduct => Boolean(
      product &&
      product.image?.trim() &&
      ((product.discountPrice ?? 0) > 0 || product.price > 0),
    ))
  const visibleFavoriteIds = favorites.map((product) => product.id)

  const orderProductsByOrder = new Map<number, Array<AccountOrder['products'][number]>>()
  for (const row of orderProductRows) {
    const product = row.productId ? productById.get(row.productId) : null
    if (!product) continue
    const quantity = Number(row.qty ?? 0)
    const lineTotal = asNumber(row.total) || asNumber(row.price) * quantity
    const items = orderProductsByOrder.get(row.orderId) ?? []
    items.push({ ...product, quantity, lineTotal })
    orderProductsByOrder.set(row.orderId, items)
  }

  const accountOrders: AccountOrder[] = orderRows.map((order) => accountOrderFromProducts(
    order,
    orderProductsByOrder.get(order.id) ?? [],
  ))

  return {
    profile: profileFromClient(client),
    favorites,
    orders: accountOrders,
    favoriteIds: visibleFavoriteIds,
  }
}

export async function getAccountOrder(clientId: number, orderNumber: number, locale: StoreLocale = 'ru'): Promise<AccountOrder | null> {
  const [order] = await db
    .select()
    .from(orders)
    .where(and(
      eq(orders.clientId, clientId),
      or(eq(orders.orderId, orderNumber), eq(orders.id, orderNumber)),
    ))
    .limit(1)

  if (!order) return null

  const orderProductRows = await db
    .select()
    .from(ordersProducts)
    .where(eq(ordersProducts.orderId, order.id))
  const productIds = orderProductRows
    .map((row) => row.productId)
    .filter((id): id is number => Boolean(id))
  const productById = await loadProducts([...new Set(productIds)], locale)

  return accountOrderFromProducts(order, productsFromRows(orderProductRows, productById))
}
