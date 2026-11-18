import { and, desc, eq, inArray, like, or, sql } from 'drizzle-orm'

import { db } from '@/db'
import { brands, orders, ordersProducts, products, productsImg, productsVariable } from '../../drizzle/schema'

export type AdminOrderStatus = 'new' | 'progress' | 'finished' | 'canceled'

const orderStatusLabels: Record<AdminOrderStatus, string> = {
  new: 'Новый',
  progress: 'В обработке',
  finished: 'Завершён',
  canceled: 'Отменён',
}

export function getOrderStatusLabel(status: AdminOrderStatus) {
  return orderStatusLabels[status]
}

export function parseOrderAmount(value: string | number | null | undefined) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const normalized = String(value ?? '').replace(/\s/g, '').replace(',', '.').replace(/[^\d.-]/g, '')
  const amount = Number.parseFloat(normalized)
  return Number.isFinite(amount) ? amount : 0
}

export function formatOrderAmount(value: string | number | null | undefined) {
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(parseOrderAmount(value))} MDL`
}

export function getOrderPaymentLabel(payment: number | null, paySuccess: number) {
  if (payment === 2 && paySuccess === 0) return 'Ошибка оплаты'
  if (payment === 1) return 'Наличными'
  if (payment === 2) return 'Онлайн оплата'
  if (payment === 3) return 'Оплата картой курьеру'
  if (payment === 0) return 'Оплата позднее'
  return 'Не указано'
}

export function getOrderPaymentStyle(payment: number | null, paySuccess: number) {
  if (payment === 2 && paySuccess === 0) return 'bg-[#fde8e8] text-[#9b1c31]'
  if (payment === 1) return 'bg-[#fff2cc] text-[#785700]'
  if (payment === 2) return 'bg-[#e6f0ff] text-[#2458a6]'
  if (payment === 3) return 'bg-[#f1eaff] text-[#6242a6]'
  return 'bg-[#f1f1f1] text-[#555]'
}

export function getOrderDeliveryLabel(delivery: number | null) {
  if (delivery === 1) return 'Самовывоз'
  if (delivery === 2) return 'Курьер'
  if (delivery === 3) return 'Срочная доставка'
  return 'Не указано'
}

export function getOrderSourceLabel(source: string) {
  if (source === 'web') return 'Сайт'
  if (source === 'app') return 'Приложение'
  if (source === 'admin') return 'Админка'
  return source === 'unknown' ? '—' : source.toUpperCase()
}

export async function getAdminNewOrderCount() {
  const [row] = await db.select({ count: sql<number>`count(*)` })
    .from(orders)
    .where(eq(orders.status, 'new'))
  return Number(row?.count ?? 0)
}

export async function getAdminOrders(options: { query?: string; status?: AdminOrderStatus }) {
  const conditions = []
  const query = options.query?.trim().slice(0, 100) ?? ''
  if (options.status) conditions.push(eq(orders.status, options.status))
  if (query) {
    const pattern = `%${query}%`
    conditions.push(or(
      sql`${orders.orderId} LIKE ${pattern}`,
      like(orders.name, pattern),
      like(orders.surname, pattern),
      like(orders.email, pattern),
      like(orders.phone, pattern),
      like(orders.postcode, pattern),
    ))
  }

  const [rows, groupedStatuses, todayRows] = await Promise.all([
    db.select().from(orders)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(orders.added), desc(orders.id))
      .limit(100),
    db.select({ status: orders.status, count: sql<number>`count(*)` })
      .from(orders)
      .groupBy(orders.status),
    db.select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(sql`DATE(${orders.added}) = CURRENT_DATE()`),
  ])

  const ids = rows.map((row) => row.id)
  const itemCounts = ids.length
    ? await db.select({ orderId: ordersProducts.orderId, count: sql<number>`COALESCE(SUM(${ordersProducts.qty}), 0)` })
        .from(ordersProducts)
        .where(inArray(ordersProducts.orderId, ids))
        .groupBy(ordersProducts.orderId)
    : []

  const counts = new Map(itemCounts.map((row) => [row.orderId, Number(row.count ?? 0)]))
  const statusCounts: Record<AdminOrderStatus, number> = { new: 0, progress: 0, finished: 0, canceled: 0 }
  for (const row of groupedStatuses) statusCounts[row.status] = Number(row.count ?? 0)

  return {
    rows: rows.map((order) => ({ ...order, itemCount: counts.get(order.id) ?? 0 })),
    stats: {
      today: Number(todayRows[0]?.count ?? 0),
      new: statusCounts.new,
      progress: statusCounts.progress,
      finished: statusCounts.finished,
    },
  }
}

export async function getAdminOrderDetail(id: number) {
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1)
  if (!order) return null

  const itemRows = await db.select().from(ordersProducts).where(eq(ordersProducts.orderId, order.id))
  const productIds = [...new Set(itemRows.map((item) => item.productId).filter((value): value is number => Boolean(value)))]
  const productRows = productIds.length
    ? await db.select({ id: products.id, titleRu: products.titleRu, titleRo: products.titleRo, sku: products.sku, barcode: products.barcode, warehouseName: products.warehouseName, brandId: products.brandId })
        .from(products).where(inArray(products.id, productIds))
    : []
  const brandIds = [...new Set(productRows.map((product) => product.brandId).filter((value): value is number => Boolean(value)))]
  const brandRows = brandIds.length ? await db.select({ id: brands.id, title: brands.title }).from(brands).where(inArray(brands.id, brandIds)) : []
  const imageRows = productIds.length
    ? await db.select({ productId: productsImg.productId, image: productsImg.img })
        .from(productsImg)
        .where(and(inArray(productsImg.productId, productIds), eq(productsImg.isShown, 1)))
        .orderBy(productsImg.sorder, productsImg.id)
    : []
  const variableIds = [...new Set(itemRows.map((item) => Number(item.options ?? 0)).filter((value) => value > 0))]
  const variableRows = variableIds.length
    ? await db.select({ id: productsVariable.id, titleRu: productsVariable.titleRu, titleRo: productsVariable.titleRo, volume: productsVariable.volumeVar, color: productsVariable.colorRu, sku: productsVariable.sku, barcode: productsVariable.barcode, warehouseName: productsVariable.warehouseName })
        .from(productsVariable).where(inArray(productsVariable.id, variableIds))
    : []
  const productsById = new Map(productRows.map((product) => [product.id, product]))
  const brandsById = new Map(brandRows.map((brand) => [brand.id, brand.title ?? '']))
  const imagesByProduct = new Map<number, string>()
  for (const image of imageRows) if (!imagesByProduct.has(image.productId)) imagesByProduct.set(image.productId, image.image)
  const variablesById = new Map(variableRows.map((variable) => [variable.id, variable]))

  return {
    order,
    items: itemRows.map((item) => {
      const product = item.productId ? productsById.get(item.productId) : null
      const variable = variablesById.get(Number(item.options ?? 0))
      const brand = product?.brandId ? brandsById.get(product.brandId) : ''
      return {
        id: item.id,
        productId: item.productId,
        title: product?.titleRu || product?.titleRo || (item.productId ? `Товар #${item.productId}` : 'Позиция заказа'),
        brand,
        sku: variable?.sku?.trim() || product?.sku || '',
        barcode: variable?.barcode?.trim() || product?.barcode || '',
        warehouseName: variable?.warehouseName?.trim() || product?.warehouseName || '',
        variant: variable?.titleRu || variable?.titleRo || variable?.volume || variable?.color || null,
        image: item.productId ? imagesByProduct.get(item.productId) ?? null : null,
        quantity: Number(item.qty ?? 0),
        price: parseOrderAmount(item.price),
        total: parseOrderAmount(item.total) || parseOrderAmount(item.price) * Number(item.qty ?? 0),
        promoDiscount: parseOrderAmount(item.promoDiscount),
        isGift: Boolean(item.rouletteGiftId || item.giftPromotionId),
      }
    }),
  }
}
