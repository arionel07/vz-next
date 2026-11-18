import { randomInt } from 'node:crypto'
import { and, asc, eq, gt, gte, inArray, isNull, lt, lte, ne, or } from 'drizzle-orm'

import { db } from '@/db'
import {
  gifts,
  orders,
  products,
  productsVariable,
  rouletteAccountState,
  roulettePrizes,
  rouletteSettings,
  rouletteSpins,
} from '../../drizzle/schema'
import type { StoreLocale } from './locale-routing'

const SHOP_TIME_ZONE = 'Europe/Bucharest'
const mysqlDate = (value: Date) => value.toISOString().slice(0, 19).replace('T', ' ')

type RoulettePrize = {
  id: number
  code: string
  titleRu: string
  titleRo: string
  rewardType: string
  rewardValue: number
  rewardPayload: string | null
  probability: number
  probabilityBasisPoints: number
}

type FormattedPrize = {
  id: number
  code: string
  type: string
  title: string
  value: number
  probability: number
  expiresAt?: string
}

function zonedParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SHOP_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return {
    year: Number(values.year), month: Number(values.month), day: Number(values.day),
    hour: Number(values.hour), minute: Number(values.minute), second: Number(values.second),
  }
}

function zonedMidnightUtc(year: number, month: number, day: number) {
  const target = Date.UTC(year, month - 1, day)
  let guess = target
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const local = zonedParts(new Date(guess))
    const represented = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second)
    guess += target - represented
  }
  return new Date(guess)
}

function currentWeeklyWindow(now: Date) {
  const local = zonedParts(now)
  const localDate = new Date(Date.UTC(local.year, local.month - 1, local.day))
  const dayFromMonday = (localDate.getUTCDay() + 6) % 7
  localDate.setUTCDate(localDate.getUTCDate() - dayFromMonday)
  const year = localDate.getUTCFullYear()
  const month = localDate.getUTCMonth() + 1
  const day = localDate.getUTCDate()
  const start = zonedMidnightUtc(year, month, day)
  const endDate = new Date(Date.UTC(year, month - 1, day + 7))
  return {
    start: mysqlDate(start),
    end: mysqlDate(zonedMidnightUtc(endDate.getUTCFullYear(), endDate.getUTCMonth() + 1, endDate.getUTCDate())),
  }
}

function parseDate(value: string | null | undefined) {
  if (!value) return null
  const timestamp = Date.parse(`${value.replace(' ', 'T')}Z`)
  return Number.isFinite(timestamp) ? new Date(timestamp) : null
}

function formatDate(value: string | null | undefined) {
  const parsed = parseDate(value)
  return parsed?.toISOString() ?? null
}

async function loadEnabledPrizes(): Promise<{ valid: boolean; prizes: RoulettePrize[] }> {
  const prizes = await db.select({
    id: roulettePrizes.id,
    code: roulettePrizes.code,
    titleRu: roulettePrizes.titleRu,
    titleRo: roulettePrizes.titleRo,
    rewardType: roulettePrizes.rewardType,
    rewardValue: roulettePrizes.rewardValue,
    rewardPayload: roulettePrizes.rewardPayload,
    probability: roulettePrizes.probability,
  }).from(roulettePrizes).where(eq(roulettePrizes.isEnabled, 1))
    .orderBy(asc(roulettePrizes.sortOrder), asc(roulettePrizes.id))

  let valid = prizes.length > 0
  const giftIds = [...new Set(prizes.flatMap((prize) => {
    const id = Number(prize.rewardPayload)
    return prize.rewardType === 'gift' && Number.isSafeInteger(id) && id > 0 ? [id] : []
  }))]
  const giftRows = giftIds.length
    ? await db.select({
        id: gifts.id,
        productId: gifts.productId,
        variantId: gifts.variantId,
        isEnabled: gifts.isEnabled,
        showOnSite: gifts.showOnSite,
        productShown: products.isShown,
        productIsGift: products.isGift,
        productStock: products.onStock,
      }).from(gifts).innerJoin(products, eq(gifts.productId, products.id))
        .where(inArray(gifts.id, giftIds))
    : []
  const giftProducts = [...new Set(giftRows.map((gift) => gift.productId).filter((id): id is number => Boolean(id)))]
  const giftVariants = giftProducts.length
    ? await db.select({ id: productsVariable.id, productId: productsVariable.productId, qty: productsVariable.qty, isShown: productsVariable.isShown })
        .from(productsVariable).where(and(inArray(productsVariable.productId, giftProducts), eq(productsVariable.isShown, 1), gt(productsVariable.qty, 0)))
    : []
  const variantsByProduct = new Map<number, typeof giftVariants>()
  for (const variant of giftVariants) {
    const rows = variantsByProduct.get(variant.productId) ?? []
    rows.push(variant)
    variantsByProduct.set(variant.productId, rows)
  }
  const giftById = new Map(giftRows.map((gift) => [gift.id, gift]))
  let probabilityTotal = 0
  const formatted: RoulettePrize[] = prizes.map((prize) => {
    const rewardValue = Number(prize.rewardValue ?? 0)
    const probability = Number(prize.probability ?? 0)
    const probabilityBasisPoints = Math.round(probability * 100)
    const giftId = Number(prize.rewardPayload)
    const gift = giftById.get(giftId)
    const availableVariants = gift?.productId ? variantsByProduct.get(gift.productId) ?? [] : []
    const giftInStock = Boolean(gift && gift.isEnabled === 1 && gift.showOnSite === 1 && gift.productShown === 1 && gift.productIsGift === 1 && (
      gift.variantId
        ? availableVariants.some((variant) => variant.id === gift.variantId)
        : Number(gift.productStock ?? 0) > 0 || availableVariants.length > 0
    ))
    const typeValid = prize.rewardType === 'discount_percent'
      ? rewardValue > 0 && rewardValue <= 100
      : prize.rewardType === 'free_shipping'
        ? true
        : prize.rewardType === 'gift' && giftInStock
    if (!typeValid || probability <= 0 || probability > 100 || probabilityBasisPoints < 1 || !prize.titleRu.trim() || !prize.titleRo.trim()) valid = false
    probabilityTotal += probabilityBasisPoints
    return {
      id: prize.id,
      code: prize.code,
      titleRu: prize.titleRu,
      titleRo: prize.titleRo,
      rewardType: prize.rewardType,
      rewardValue,
      rewardPayload: prize.rewardPayload,
      probability,
      probabilityBasisPoints,
    }
  })
  if (probabilityTotal !== 10000) valid = false
  return { valid, prizes: formatted }
}

function formatSpin(spin: {
  id: number
  prizeCodeSnapshot: string
  rewardTypeSnapshot: string
  rewardValueSnapshot: string | number | null
  titleRuSnapshot: string
  titleRoSnapshot: string
  expiresAt: string
}, locale: StoreLocale): FormattedPrize {
  return {
    id: spin.id,
    code: spin.prizeCodeSnapshot,
    type: spin.rewardTypeSnapshot,
    title: locale === 'ro' ? spin.titleRoSnapshot : spin.titleRuSnapshot,
    value: Number(spin.rewardValueSnapshot ?? 0),
    probability: 0,
    expiresAt: formatDate(spin.expiresAt) ?? undefined,
  }
}

export async function getRouletteState(clientId: number, locale: StoreLocale) {
  const now = new Date()
  const nowValue = mysqlDate(now)
  const window = currentWeeklyWindow(now)
  await db.update(rouletteSpins).set({ status: 'expired' }).where(and(
    eq(rouletteSpins.clientId, clientId), eq(rouletteSpins.status, 'active'), lte(rouletteSpins.expiresAt, nowValue),
  ))

  const [[settings], completedOrders, outstandingRows, weeklyRows, [account], prizeConfig] = await Promise.all([
    db.select().from(rouletteSettings).limit(1),
    db.select({ added: orders.added }).from(orders).where(and(
      eq(orders.clientId, clientId), eq(orders.status, 'finished'),
      or(isNull(orders.payment), ne(orders.payment, 2), eq(orders.paySuccess, 1)),
    )).orderBy(asc(orders.added)).limit(1),
    db.select().from(rouletteSpins).where(and(
      eq(rouletteSpins.clientId, clientId),
      or(
        and(eq(rouletteSpins.status, 'active'), isNull(rouletteSpins.orderId), gt(rouletteSpins.expiresAt, nowValue)),
        eq(rouletteSpins.status, 'reserved'),
      ),
    )).orderBy(asc(rouletteSpins.id)).limit(1),
    db.select({ id: rouletteSpins.id }).from(rouletteSpins).where(and(
      eq(rouletteSpins.clientId, clientId),
      gte(rouletteSpins.spunAt, window.start), lt(rouletteSpins.spunAt, window.end),
      ne(rouletteSpins.status, 'cancelled'),
    )).limit(1),
    db.select().from(rouletteAccountState).where(eq(rouletteAccountState.clientId, clientId)).limit(1),
    loadEnabledPrizes(),
  ])
  const completedAt = completedOrders[0]?.added ?? null
  const eligible = Boolean(completedAt)
  const outstanding = outstandingRows[0]
  const activeSpin = outstanding?.status === 'active' ? outstanding : null
  const paymentPending = outstanding?.status === 'reserved'
  const weeklySpinUsed = weeklyRows.length > 0
  const visible = settings?.isVisible === 1
  const enabled = settings?.isEnabled === 1
  const reason = paymentPending ? 'payment_pending'
    : !eligible ? 'completed_order_required'
      : activeSpin ? 'active_prize'
        : !visible ? 'roulette_hidden'
          : !enabled ? 'roulette_disabled'
            : !prizeConfig.valid ? 'prizes_not_configured'
              : weeklySpinUsed ? 'weekly_spin_used'
                : null
  const canSpin = eligible && visible && enabled && prizeConfig.valid && !paymentPending && !activeSpin && !weeklySpinUsed
  const nextSpinAt = weeklySpinUsed ? window.end
    : account?.nextSpinAt && account.nextSpinAt > nowValue ? account.nextSpinAt
      : null

  return {
    eligible,
    visible,
    canSpin,
    reason,
    serverTime: now.toISOString(),
    weeklyWindowStart: formatDate(window.start),
    weeklyWindowEnd: formatDate(window.end),
    weeklySpinUsed,
    settings: {
      title: locale === 'ro' ? settings?.titleRo ?? '' : settings?.titleRu ?? '',
      description: locale === 'ro' ? settings?.descriptionRo ?? '' : settings?.descriptionRu ?? '',
      rules: locale === 'ro' ? settings?.rulesRo ?? '' : settings?.rulesRu ?? '',
    },
    prizes: prizeConfig.valid ? prizeConfig.prizes.map((prize) => ({
      id: prize.id,
      code: prize.code,
      type: prize.rewardType,
      title: locale === 'ro' ? prize.titleRo : prize.titleRu,
      value: prize.rewardValue,
      probability: prize.probability,
    })) : [],
    nextSpinAt: formatDate(nextSpinAt),
    activePrize: activeSpin ? formatSpin(activeSpin, locale) : null,
    paymentPending: Boolean(paymentPending),
  }
}

export class RouletteSpinError extends Error {
  constructor(readonly reason: string, readonly status: number) {
    super(reason)
  }
}

export async function spinRoulette(clientId: number, requestId: string, locale: StoreLocale) {
  const state = await getRouletteState(clientId, locale)
  const now = new Date()
  const nowValue = mysqlDate(now)
  const window = currentWeeklyWindow(now)

  return db.transaction(async (tx) => {
    await tx.insert(rouletteAccountState).values({
      clientId,
      nextSpinAt: null,
      createdAt: nowValue,
      updatedAt: nowValue,
    }).onDuplicateKeyUpdate({ set: { updatedAt: nowValue } })
    await tx.select({ clientId: rouletteAccountState.clientId }).from(rouletteAccountState)
      .where(eq(rouletteAccountState.clientId, clientId)).for('update').limit(1)

    const [previous] = await tx.select().from(rouletteSpins).where(and(
      eq(rouletteSpins.clientId, clientId), eq(rouletteSpins.requestId, requestId),
    )).limit(1)
    if (previous) return { replayed: true, prize: formatSpin(previous, locale) }

    if (!state.canSpin) throw new RouletteSpinError(state.reason ?? 'spin_unavailable', 409)
    const [outstanding] = await tx.select({ id: rouletteSpins.id, status: rouletteSpins.status }).from(rouletteSpins).where(and(
      eq(rouletteSpins.clientId, clientId),
      or(
        and(eq(rouletteSpins.status, 'active'), isNull(rouletteSpins.orderId), gt(rouletteSpins.expiresAt, nowValue)),
        eq(rouletteSpins.status, 'reserved'),
      ),
    )).limit(1)
    if (outstanding) throw new RouletteSpinError(outstanding.status === 'reserved' ? 'payment_pending' : 'active_prize', 409)

    const [used] = await tx.select({ id: rouletteSpins.id }).from(rouletteSpins).where(and(
      eq(rouletteSpins.clientId, clientId),
      gte(rouletteSpins.spunAt, window.start), lt(rouletteSpins.spunAt, window.end),
      ne(rouletteSpins.status, 'cancelled'),
    )).limit(1)
    if (used) throw new RouletteSpinError('weekly_spin_used', 409)

    const prizeConfig = await loadEnabledPrizes()
    if (!prizeConfig.valid) throw new RouletteSpinError('prizes_not_configured', 409)
    const target = randomInt(1, 10001)
    let cumulative = 0
    const prize = prizeConfig.prizes.find((candidate) => {
      cumulative += candidate.probabilityBasisPoints
      return target <= cumulative
    })
    if (!prize) throw new RouletteSpinError('prizes_not_configured', 409)

    const spunAt = mysqlDate(now)
    const expiresAt = mysqlDate(new Date(now.getTime() + 24 * 60 * 60 * 1000))
    const [insertResult] = await tx.insert(rouletteSpins).values({
      clientId,
      prizeId: prize.id,
      requestId,
      prizeCodeSnapshot: prize.code,
      rewardTypeSnapshot: prize.rewardType,
      rewardValueSnapshot: String(prize.rewardValue),
      rewardPayloadSnapshot: prize.rewardPayload,
      titleRuSnapshot: prize.titleRu,
      titleRoSnapshot: prize.titleRo,
      probabilitySnapshot: String(prize.probability),
      spunAt,
      expiresAt,
      status: 'active',
      createdAt: spunAt,
    })
    await tx.update(rouletteAccountState).set({ nextSpinAt: window.end, updatedAt: spunAt })
      .where(eq(rouletteAccountState.clientId, clientId))
    const insertedId = Number(insertResult.insertId)
    const [savedSpin] = insertedId
      ? await tx.select().from(rouletteSpins).where(eq(rouletteSpins.id, insertedId)).limit(1)
      : []
    if (!savedSpin) throw new Error('Roulette result was not persisted')
    return { replayed: false, prize: formatSpin(savedSpin, locale) }
  })
}

