import 'server-only'

import { and, count, desc, eq, like, ne, or, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'

import { db } from '@/db'
import { clients, orders, ordersProducts, promocodeEvents } from '../../drizzle/schema'

export type AdminCustomerListStatus = 'registered' | 'pending' | 'all'

const PAGE_SIZE = 40

export async function getAdminCustomerList({ query, status, page }: { query: string; status: AdminCustomerListStatus; page: number }) {
  const conditions: SQL[] = []
  const normalizedQuery = query.trim().slice(0, 100)

  if (status === 'registered') conditions.push(eq(clients.code, 1))
  if (status === 'pending') conditions.push(ne(clients.code, 1))
  if (normalizedQuery) {
    const pattern = `%${normalizedQuery}%`
    const customerId = /^#?\d+$/u.test(normalizedQuery) ? Number(normalizedQuery.replace('#', '')) : null
    conditions.push(or(
      like(clients.name, pattern),
      like(clients.surname, pattern),
      like(clients.email, pattern),
      like(clients.phone, pattern),
      ...(customerId ? [eq(clients.id, customerId)] : []),
    )!)
  }

  const where = conditions.length ? and(...conditions) : undefined
  const safePage = Math.max(1, Math.floor(page))

  const [rows, countRows, statsRows] = await Promise.all([
    db.select({
      id: clients.id,
      name: clients.name,
      surname: clients.surname,
      email: clients.email,
      phone: clients.phone,
      bonus: clients.bonus,
      discount: clients.discount,
      active: clients.active,
      code: clients.code,
      isb2B: clients.isb2B,
      isCreator: clients.isCreator,
      ordersCount: sql<number>`(SELECT COUNT(*) FROM ${orders} WHERE ${orders.clientId} = ${clients.id})`,
      completedTotal: sql<string>`(SELECT COALESCE(SUM(CAST(REPLACE(REPLACE(REPLACE(${orders.total}, 'MDL', ''), ' ', ''), ',', '.') AS DECIMAL(12,2))), 0) FROM ${orders} WHERE ${orders.clientId} = ${clients.id} AND ${orders.status} = 'finished')`,
    }).from(clients)
      .where(where)
      .orderBy(desc(clients.id))
      .limit(PAGE_SIZE)
      .offset((safePage - 1) * PAGE_SIZE),
    db.select({ value: count() }).from(clients).where(where),
    db.select({
      total: count(),
      registered: sql<number>`COALESCE(SUM(CASE WHEN ${clients.code} = 1 THEN 1 ELSE 0 END), 0)`,
      business: sql<number>`COALESCE(SUM(CASE WHEN ${clients.isb2B} = 1 THEN 1 ELSE 0 END), 0)`,
      active: sql<number>`COALESCE(SUM(CASE WHEN ${clients.active} = 1 THEN 1 ELSE 0 END), 0)`,
    }).from(clients),
  ])

  const total = Number(countRows[0]?.value ?? 0)
  const stats = statsRows[0]
  return {
    rows: rows.map((row) => ({
      ...row,
      ordersCount: Number(row.ordersCount ?? 0),
      completedTotal: Number(row.completedTotal ?? 0),
    })),
    total,
    page: safePage,
    pageSize: PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    stats: {
      total: Number(stats?.total ?? 0),
      registered: Number(stats?.registered ?? 0),
      business: Number(stats?.business ?? 0),
      active: Number(stats?.active ?? 0),
    },
  }
}

export async function getAdminCustomerDetail(id: number) {
  const [customer] = await db.select({
    id: clients.id,
    name: clients.name,
    surname: clients.surname,
    email: clients.email,
    phone: clients.phone,
    address: clients.address,
    city: clients.city,
    house: clients.house,
    apartament: clients.apartament,
    porch: clients.porch,
    bonus: clients.bonus,
    discount: clients.discount,
    active: clients.active,
    code: clients.code,
    isb2B: clients.isb2B,
    isCreator: clients.isCreator,
    smsSubscribe: clients.smsSubscribe,
    mailSubscribe: clients.mailSubscribe,
    birthday: clients.birthday,
    sex: clients.sex,
  }).from(clients).where(eq(clients.id, id)).limit(1)

  if (!customer) return null

  const [summaryRows, recentOrders, promoEvents] = await Promise.all([
    db.select({
      ordersCount: count(),
      completedTotal: sql<string>`COALESCE(SUM(CASE WHEN ${orders.status} = 'finished' THEN CAST(REPLACE(REPLACE(REPLACE(${orders.total}, 'MDL', ''), ' ', ''), ',', '.') AS DECIMAL(12,2)) ELSE 0 END), 0)`,
    }).from(orders).where(eq(orders.clientId, id)),
    db.select({
      id: orders.id,
      orderId: orders.orderId,
      status: orders.status,
      total: orders.total,
      added: orders.added,
      delivery: orders.delivery,
      payment: orders.payment,
      paySuccess: orders.paySuccess,
      itemCount: sql<number>`(SELECT COALESCE(SUM(${ordersProducts.qty}), 0) FROM ${ordersProducts} WHERE ${ordersProducts.orderId} = ${orders.id})`,
    }).from(orders).where(eq(orders.clientId, id)).orderBy(desc(orders.added), desc(orders.id)).limit(20),
    db.select({
      id: promocodeEvents.id,
      code: promocodeEvents.code,
      eventType: promocodeEvents.eventType,
      discountAmount: promocodeEvents.discountAmount,
      finalTotal: promocodeEvents.finalTotal,
      reason: promocodeEvents.reason,
      createdAt: promocodeEvents.createdAt,
    }).from(promocodeEvents).where(eq(promocodeEvents.clientId, id)).orderBy(desc(promocodeEvents.createdAt), desc(promocodeEvents.id)).limit(20),
  ])

  return {
    customer,
    summary: {
      ordersCount: Number(summaryRows[0]?.ordersCount ?? 0),
      completedTotal: Number(summaryRows[0]?.completedTotal ?? 0),
    },
    orders: recentOrders.map((order) => ({ ...order, itemCount: Number(order.itemCount ?? 0) })),
    promoEvents,
  }
}
