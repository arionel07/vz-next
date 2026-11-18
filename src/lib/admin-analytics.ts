import { and, desc, eq, gte, gt, isNotNull, lt, ne, sql } from 'drizzle-orm'

import { db } from '@/db'
import { orders, ordersProducts, products } from '../../drizzle/schema'

export type AnalyticsRange = 7 | 30 | 90

function storeDate(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Chisinau',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function asNumber(value: string | number | null | undefined) {
  const number = Number(value ?? 0)
  return Number.isFinite(number) ? number : 0
}

function dayLabel(value: string, range: AnalyticsRange) {
  const date = new Date(`${value}T12:00:00.000Z`)
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Chisinau',
    day: 'numeric',
    ...(range === 7 ? { month: 'short' as const } : {}),
  }).format(date)
}

const orderAmount = sql<number>`CAST(REPLACE(REPLACE(REPLACE(${orders.total}, 'MDL', ''), ' ', ''), ',', '.') AS DECIMAL(12,2))`
const itemAmount = sql<number>`CAST(REPLACE(REPLACE(REPLACE(${ordersProducts.total}, 'MDL', ''), ' ', ''), ',', '.') AS DECIMAL(12,2))`
const orderDay = sql<string>`DATE(${orders.added})`

export async function getAdminAnalyticsSummary(range: AnalyticsRange = 7) {
  const today = storeDate(new Date())
  const startDate = shiftDate(today, -(range - 1))
  const endExclusive = shiftDate(today, 1)
  const [summary] = await db.select({
    sales: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} <> 'canceled' THEN ${orderAmount} ELSE 0 END), 0)`,
    orderCount: sql<number>`COUNT(*)`,
    activeOrderCount: sql<number>`SUM(CASE WHEN ${orders.status} <> 'canceled' THEN 1 ELSE 0 END)`,
    canceledCount: sql<number>`SUM(CASE WHEN ${orders.status} = 'canceled' THEN 1 ELSE 0 END)`,
    openOrderCount: sql<number>`SUM(CASE WHEN ${orders.status} IN ('new', 'progress') THEN 1 ELSE 0 END)`,
  })
    .from(orders)
    .where(and(
      gte(orders.added, `${startDate} 00:00:00`),
      lt(orders.added, `${endExclusive} 00:00:00`),
    ))

  const sales = asNumber(summary?.sales)
  const activeOrderCount = asNumber(summary?.activeOrderCount)

  return {
    range,
    sales,
    orderCount: asNumber(summary?.orderCount),
    activeOrderCount,
    canceledCount: asNumber(summary?.canceledCount),
    openOrderCount: asNumber(summary?.openOrderCount),
    averageOrder: activeOrderCount ? sales / activeOrderCount : 0,
  }
}

export async function getAdminAnalytics(range: AnalyticsRange) {
  const today = storeDate(new Date())
  const startDate = shiftDate(today, -(range - 1))
  const endExclusive = shiftDate(today, 1)
  const previousStart = shiftDate(startDate, -range)

  const currentWhere = and(
    gte(orders.added, `${startDate} 00:00:00`),
    lt(orders.added, `${endExclusive} 00:00:00`),
  )
  const trendWhere = and(
    gte(orders.added, `${previousStart} 00:00:00`),
    lt(orders.added, `${endExclusive} 00:00:00`),
  )

  const [dailyRows, statusRows, sourceRows, paymentRows, customerRows, productRows] = await Promise.all([
    db.select({
      date: orderDay,
      orderCount: sql<number>`COUNT(*)`,
      canceledCount: sql<number>`SUM(CASE WHEN ${orders.status} = 'canceled' THEN 1 ELSE 0 END)`,
      activeOrderCount: sql<number>`SUM(CASE WHEN ${orders.status} <> 'canceled' THEN 1 ELSE 0 END)`,
      sales: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} <> 'canceled' THEN ${orderAmount} ELSE 0 END), 0)`,
    })
      .from(orders)
      .where(trendWhere)
      .groupBy(orderDay)
      .orderBy(orderDay),
    db.select({ status: orders.status, count: sql<number>`COUNT(*)` })
      .from(orders)
      .where(currentWhere)
      .groupBy(orders.status),
    db.select({
      source: orders.orderSource,
      count: sql<number>`COUNT(*)`,
      sales: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} <> 'canceled' THEN ${orderAmount} ELSE 0 END), 0)`,
    })
      .from(orders)
      .where(currentWhere)
      .groupBy(orders.orderSource)
      .orderBy(desc(sql`COUNT(*)`)),
    db.select({ payment: orders.payment, count: sql<number>`COUNT(*)` })
      .from(orders)
      .where(currentWhere)
      .groupBy(orders.payment)
      .orderBy(desc(sql`COUNT(*)`)),
    db.select({ clientId: orders.clientId, orderCount: sql<number>`COUNT(*)` })
      .from(orders)
      .where(and(currentWhere, ne(orders.status, 'canceled'), gt(orders.clientId, 0)))
      .groupBy(orders.clientId),
    db.select({
      id: products.id,
      title: products.titleRu,
      alternateTitle: products.titleRo,
      quantity: sql<number>`COALESCE(SUM(${ordersProducts.qty}), 0)`,
      sales: sql<number>`COALESCE(SUM(${itemAmount}), 0)`,
    })
      .from(ordersProducts)
      .innerJoin(orders, eq(orders.id, ordersProducts.orderId))
      .innerJoin(products, eq(products.id, ordersProducts.productId))
      .where(and(
        currentWhere,
        ne(orders.status, 'canceled'),
        isNotNull(ordersProducts.productId),
      ))
      .groupBy(products.id, products.titleRu, products.titleRo)
      .orderBy(desc(sql`COALESCE(SUM(${itemAmount}), 0)`))
      .limit(6),
  ])

  const rowsByDate = new Map(dailyRows.map((row) => [String(row.date).slice(0, 10), row]))
  const chart = Array.from({ length: range }, (_, index) => {
    const date = shiftDate(startDate, index)
    const row = rowsByDate.get(date)
    return {
      date,
      label: dayLabel(date, range),
      orderCount: asNumber(row?.orderCount),
      activeOrderCount: asNumber(row?.activeOrderCount),
      sales: asNumber(row?.sales),
    }
  })
  const currentRows = dailyRows.filter((row) => String(row.date).slice(0, 10) >= startDate)
  const previousRows = dailyRows.filter((row) => {
    const date = String(row.date).slice(0, 10)
    return date >= previousStart && date < startDate
  })
  const sales = currentRows.reduce((total, row) => total + asNumber(row.sales), 0)
  const previousSales = previousRows.reduce((total, row) => total + asNumber(row.sales), 0)
  const orderCount = currentRows.reduce((total, row) => total + asNumber(row.orderCount), 0)
  const canceledCount = currentRows.reduce((total, row) => total + asNumber(row.canceledCount), 0)
  const activeOrderCount = currentRows.reduce((total, row) => total + asNumber(row.activeOrderCount), 0)
  const topSales = Math.max(...chart.map((day) => day.sales), 0)
  const topAverageOrder = Math.max(...chart.map((day) => day.activeOrderCount ? day.sales / day.activeOrderCount : 0), 0)

  return {
    range,
    startDate,
    endDate: today,
    sales,
    previousSales,
    orderCount,
    canceledCount,
    activeOrderCount,
    averageOrder: activeOrderCount ? sales / activeOrderCount : 0,
    customerCount: customerRows.length,
    returningCustomerRate: customerRows.length
      ? (customerRows.filter((row) => asNumber(row.orderCount) > 1).length / customerRows.length) * 100
      : 0,
    chart: chart.map((day) => {
      const averageOrder = day.activeOrderCount ? day.sales / day.activeOrderCount : 0
      return {
        ...day,
        barHeight: topSales ? Math.max(day.sales ? 2 : 0, (day.sales / topSales) * 100) : 0,
        averageOrder,
        averageBarHeight: topAverageOrder ? Math.max(averageOrder ? 2 : 0, (averageOrder / topAverageOrder) * 100) : 0,
      }
    }),
    statuses: statusRows.map((row) => ({ status: row.status, count: asNumber(row.count) })),
    sources: sourceRows.map((row) => ({ source: row.source, count: asNumber(row.count), sales: asNumber(row.sales) })),
    payments: paymentRows.map((row) => ({ payment: row.payment, count: asNumber(row.count) })),
    products: productRows.map((row) => ({
      id: row.id,
      title: row.title?.trim() || row.alternateTitle?.trim() || `Товар #${row.id}`,
      quantity: asNumber(row.quantity),
      sales: asNumber(row.sales),
    })),
  }
}
