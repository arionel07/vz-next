import 'server-only'

import { and, asc, count, eq, inArray, like, or } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'

import { db } from '@/db'
import { stores, storesImg } from '../../drizzle/schema'

export type AdminStoreStatus = 'all' | 'shown' | 'hidden'

const PAGE_SIZE = 30

export async function getAdminStoreList({ query, status, page }: { query: string; status: AdminStoreStatus; page: number }) {
  const conditions: SQL[] = []
  const normalizedQuery = query.trim().slice(0, 100)

  if (normalizedQuery) {
    const pattern = `%${normalizedQuery}%`
    const storeId = /^#?\d+$/u.test(normalizedQuery) ? Number(normalizedQuery.replace('#', '')) : null
    conditions.push(or(
      like(stores.titleRu, pattern),
      like(stores.titleRo, pattern),
      like(stores.textRu, pattern),
      like(stores.textRo, pattern),
      like(stores.phone, pattern),
      ...(storeId ? [eq(stores.id, storeId)] : []),
    )!)
  }
  if (status === 'shown') conditions.push(eq(stores.isShown, 1))
  if (status === 'hidden') conditions.push(eq(stores.isShown, 0))

  const where = conditions.length ? and(...conditions) : undefined
  const safePage = Math.max(1, Math.floor(page))
  const [rows, countRows, statsRows] = await Promise.all([
    db.select({
      id: stores.id,
      titleRu: stores.titleRu,
      titleRo: stores.titleRo,
      phone: stores.phone,
      coords: stores.coords,
      descRu: stores.descRu,
      descRo: stores.descRo,
      textRu: stores.textRu,
      textRo: stores.textRo,
      iframeGoogle: stores.iframeGoogle,
      delivery: stores.delivery,
      isShown: stores.isShown,
      sorder: stores.sorder,
      onBottom: stores.onBottom,
    }).from(stores).where(where).orderBy(asc(stores.sorder), asc(stores.id)).limit(PAGE_SIZE).offset((safePage - 1) * PAGE_SIZE),
    db.select({ value: count() }).from(stores).where(where),
    db.select({ isShown: stores.isShown, delivery: stores.delivery, value: count() }).from(stores).groupBy(stores.isShown, stores.delivery),
  ])

  const ids = rows.map((row) => row.id)
  const images = ids.length
    ? await db.select({ id: storesImg.id, storesId: storesImg.storesId, img: storesImg.img, sorder: storesImg.sorder, isShown: storesImg.isShown })
      .from(storesImg).where(inArray(storesImg.storesId, ids)).orderBy(asc(storesImg.sorder), asc(storesImg.id))
    : []
  const imagesByStore = new Map<number, typeof images>()
  for (const image of images) imagesByStore.set(image.storesId, [...(imagesByStore.get(image.storesId) ?? []), image])

  const total = Number(countRows[0]?.value ?? 0)
  const stats = { total: 0, shown: 0, hidden: 0, delivery: 0 }
  for (const row of statsRows) {
    const value = Number(row.value)
    stats.total += value
    if (row.isShown === 1) stats.shown += value
    else stats.hidden += value
    if (row.delivery === 1 && row.isShown === 1) stats.delivery += value
  }

  return {
    rows: rows.map((row) => ({ ...row, images: imagesByStore.get(row.id) ?? [] })),
    total,
    page: safePage,
    pageSize: PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    stats,
  }
}
