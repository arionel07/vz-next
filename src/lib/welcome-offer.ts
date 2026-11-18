import { and, eq, inArray, isNull } from 'drizzle-orm'

import { db } from '@/db'
import { brands, clients, promocodeExcludedBrands, promocodes } from '../../drizzle/schema'

function dateTimestamp(value: string | null) {
  if (!value) return null
  const timestamp = Date.parse(value.replace(' ', 'T'))
  return Number.isFinite(timestamp) ? timestamp : null
}

function mysqlDate(value: Date) {
  return value.toISOString().slice(0, 19).replace('T', ' ')
}

function normalizedBrand(value: string | null) {
  return String(value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export async function activateWelcomeOffer(clientId: number): Promise<number | null> {
  const [promo] = await db.select().from(promocodes)
    .where(eq(promocodes.code, 'WELCOME18'))
    .limit(1)

  const now = Date.now()
  const startsAt = dateTimestamp(promo?.startsAt ?? null)
  const endsAt = dateTimestamp(promo?.endsAt ?? null)
  if (
    !promo
    || promo.status !== 'active'
    || promo.type !== 'percentage'
    || Number(promo.value) !== 18
    || Number(promo.perUserLimit) !== 1
    || promo.allowDiscounted !== 1
    || promo.brandScope !== 'all'
    || promo.minAmount !== null
    || promo.maxDiscount !== null
    || (startsAt !== null && startsAt > now)
    || (endsAt !== null && endsAt <= now)
  ) return null

  const excludedRows = await db.select({ brandId: promocodeExcludedBrands.brandId })
    .from(promocodeExcludedBrands)
    .where(eq(promocodeExcludedBrands.promocodeId, promo.id))
    .limit(4)
  if (excludedRows.length !== 3) return null

  const excludedBrandIds = excludedRows.map((row) => row.brandId)
  const excludedBrands = await db.select({ title: brands.title })
    .from(brands)
    .where(inArray(brands.id, excludedBrandIds))
  if (excludedBrands.length !== 3) return null

  const normalizedTitles = excludedBrands.map((brand) => normalizedBrand(brand.title))
  const excludesShik = normalizedTitles.some((title) => title.includes('SHIK'))
  const excludesMac = normalizedTitles.some((title) => title === 'MAC' || title.startsWith('MACCOSMETICS'))
  const excludesAnastasia = normalizedTitles.some((title) => title.includes('ANASTASIABEVERLYHILLS'))
  if (!excludesShik || !excludesMac || !excludesAnastasia) return null

  const startedAt = new Date()
  const expiresAt = new Date(startedAt.getTime() + 14 * 24 * 60 * 60 * 1000)
  const [result] = await db.update(clients)
    .set({ welcomeOfferStartedAt: mysqlDate(startedAt), welcomeOfferExpiresAt: mysqlDate(expiresAt) })
    .where(and(eq(clients.id, clientId), isNull(clients.welcomeOfferStartedAt)))

  return Number(result.affectedRows) === 1 ? Math.floor(expiresAt.getTime() / 1000) : null
}
