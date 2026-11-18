import { and, count, eq, gt, inArray } from 'drizzle-orm'

import { db } from '@/db'
import {
  brands,
  clients,
  orders,
  products,
  productsVariable,
  promocodeBrands,
  promocodeExcludedBrands,
  promocodeUsages,
  promocodes,
} from '../../drizzle/schema'

export type PromoCartItem = {
  id: number
  variantId?: number | null
  quantity: number
}

export type AppliedPromo = {
  id: number
  code: string
  name: string
  type: 'percentage' | 'fixed'
  value: number
  discount: number
  subtotal: number
  eligibleSubtotal: number
  total: number
  lineDiscounts: Record<string, number>
}

export type PromoCalculation = {
  applied: boolean
  promo: AppliedPromo | null
  reason: string | null
  message: string | null
}

function emptyCalculation(reason: string | null = null, message: string | null = null): PromoCalculation {
  return { applied: false, promo: null, reason, message }
}

export function normalizePromoCode(value: unknown) {
  return String(value ?? '').trim().toUpperCase().slice(0, 64)
}

export function promoMessage(reason: string | null, locale: 'ru' | 'ro' = 'ru') {
  if (locale === 'ro') {
    switch (reason) {
      case 'PROMO_NOT_AUTHENTICATED':
        return 'Autentifică-te pentru a aplica codul promoțional.'
      case 'PROMO_NOT_FOUND':
        return 'Codul promoțional nu a fost găsit sau nu mai este disponibil.'
      case 'PROMO_NOT_STARTED':
        return 'Codul promoțional nu este încă valabil.'
      case 'PROMO_EXPIRED':
        return 'Codul promoțional a expirat.'
      case 'PROMO_USAGE_LIMIT_REACHED':
        return 'Limita de utilizări a acestui cod promoțional a fost atinsă.'
      case 'PROMO_ALREADY_USED':
        return 'Ai folosit deja acest cod promoțional.'
      case 'PROMO_MINIMUM_AMOUNT':
        return 'Suma minimă pentru acest cod promoțional nu a fost încă atinsă.'
      case 'PROMO_NOT_APPLICABLE':
        return 'Codul promoțional nu se aplică produselor din coș.'
      case 'PROMO_EMPTY_CART':
        return 'Adaugă produse în coș pentru a aplica codul promoțional.'
      case 'PROMO_INVALID':
        return 'Introdu un cod promoțional.'
      default:
        return 'Codul promoțional nu a putut fi aplicat.'
    }
  }

  switch (reason) {
    case 'PROMO_NOT_AUTHENTICATED':
      return 'Войдите в аккаунт, чтобы применить промокод.'
    case 'PROMO_NOT_FOUND':
      return 'Промокод не найден или больше недоступен.'
    case 'PROMO_NOT_STARTED':
      return 'Срок действия промокода ещё не начался.'
    case 'PROMO_EXPIRED':
      return 'Срок действия промокода закончился.'
    case 'PROMO_USAGE_LIMIT_REACHED':
      return 'Лимит использований этого промокода исчерпан.'
    case 'PROMO_ALREADY_USED':
      return 'Вы уже использовали этот промокод.'
    case 'PROMO_MINIMUM_AMOUNT':
      return 'Минимальная сумма товаров для промокода ещё не достигнута.'
    case 'PROMO_NOT_APPLICABLE':
      return 'Промокод не действует на товары в этой корзине.'
    case 'PROMO_EMPTY_CART':
      return 'Добавьте товары в корзину, чтобы применить промокод.'
    case 'PROMO_INVALID':
      return 'Введите промокод.'
    default:
      return 'Не удалось применить промокод.'
  }
}

function dateTimestamp(value: string | null) {
  if (!value) return null
  const timestamp = Date.parse(value.replace(' ', 'T'))
  return Number.isFinite(timestamp) ? timestamp : null
}

function itemKey(item: Pick<PromoCartItem, 'id' | 'variantId'>) {
  return `${item.id}:${item.variantId ?? 0}`
}

function isAlwaysExcludedBrand(title: string | null) {
  const compact = String(title ?? '').toUpperCase().replace(/[^A-Z0-9]+/g, '')
  return compact === 'MAC'
    || compact.startsWith('MACCOSMETICS')
    || compact === 'ABH'
    || compact.startsWith('ANASTASIABEVERLYHILLS')
    || compact === 'SHIK'
    || compact.startsWith('SHIK')
}

export async function calculatePromoCode({
  code,
  items,
  clientId,
  isB2B = false,
  locale = 'ru',
}: {
  code: unknown
  items: PromoCartItem[]
  clientId: number | null | undefined
  isB2B?: boolean
  locale?: 'ru' | 'ro'
}): Promise<PromoCalculation> {
  const normalizedCode = normalizePromoCode(code)
  if (!normalizedCode) return emptyCalculation('PROMO_INVALID', promoMessage('PROMO_INVALID', locale))
  if (!clientId) return emptyCalculation('PROMO_NOT_AUTHENTICATED', promoMessage('PROMO_NOT_AUTHENTICATED', locale))
  if (!items.length) return emptyCalculation('PROMO_EMPTY_CART', promoMessage('PROMO_EMPTY_CART', locale))

  const [promo] = await db
    .select()
    .from(promocodes)
    .where(eq(promocodes.code, normalizedCode))
    .limit(1)

  if (!promo || promo.status !== 'active') {
    return emptyCalculation('PROMO_NOT_FOUND', promoMessage('PROMO_NOT_FOUND', locale))
  }

  const now = Date.now()
  const startsAt = dateTimestamp(promo.startsAt)
  const endsAt = dateTimestamp(promo.endsAt)
  if (startsAt !== null && startsAt > now) {
    return emptyCalculation('PROMO_NOT_STARTED', promoMessage('PROMO_NOT_STARTED', locale))
  }
  if (endsAt !== null && endsAt < now) {
    return emptyCalculation('PROMO_EXPIRED', promoMessage('PROMO_EXPIRED', locale))
  }

  const [[usageResult], [clientUsageResult]] = await Promise.all([
    db
      .select({ total: count() })
      .from(promocodeUsages)
      .where(eq(promocodeUsages.promocodeId, promo.id)),
    db
      .select({ total: count() })
      .from(promocodeUsages)
      .where(and(eq(promocodeUsages.promocodeId, promo.id), eq(promocodeUsages.clientId, clientId))),
  ])
  const usageCount = usageResult?.total ?? 0
  const clientUsageCount = clientUsageResult?.total ?? 0

  if (promo.usageLimit !== null && Number(usageCount) >= promo.usageLimit) {
    return emptyCalculation('PROMO_USAGE_LIMIT_REACHED', promoMessage('PROMO_USAGE_LIMIT_REACHED', locale))
  }
  if (promo.perUserLimit !== null && Number(clientUsageCount) >= promo.perUserLimit) {
    return emptyCalculation('PROMO_ALREADY_USED', promoMessage('PROMO_ALREADY_USED', locale))
  }

  if (normalizedCode === 'WELCOME18') {
    const [client] = await db
      .select({
        welcomeOfferStartedAt: clients.welcomeOfferStartedAt,
        welcomeOfferExpiresAt: clients.welcomeOfferExpiresAt,
      })
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1)

    const welcomeStart = dateTimestamp(client?.welcomeOfferStartedAt ?? null)
    const welcomeEnd = dateTimestamp(client?.welcomeOfferExpiresAt ?? null)
    const [{ total: orderCount }] = await db
      .select({ total: count() })
      .from(orders)
      .where(eq(orders.clientId, clientId))

    if (!client || welcomeStart === null || welcomeEnd === null || welcomeStart > now || welcomeEnd <= now) {
      return emptyCalculation('PROMO_EXPIRED', promoMessage('PROMO_EXPIRED', locale))
    }
    if (Number(orderCount) > 0) {
      return emptyCalculation('PROMO_ALREADY_USED', promoMessage('PROMO_ALREADY_USED', locale))
    }
  }

  const requestedItems = new Map<string, PromoCartItem>()
  for (const item of items) {
    const normalizedItem = {
      id: item.id,
      variantId: item.variantId ?? null,
      quantity: Math.max(1, Math.min(99, Math.floor(item.quantity))),
    }
    const key = itemKey(normalizedItem)
    const existing = requestedItems.get(key)
    requestedItems.set(key, {
      ...normalizedItem,
      quantity: (existing?.quantity ?? 0) + normalizedItem.quantity,
    })
  }

  const productIds = [...new Set([...requestedItems.values()].map((item) => item.id))]
  const productRows = await db
    .select({
      id: products.id,
      price: products.price,
      discountPrice: products.discountPrice,
      priceWh: products.priceWh,
      brandId: products.brandId,
      brandTitle: brands.title,
    })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(and(eq(products.isShown, 1), gt(isB2B ? products.priceWh : products.price, 0), inArray(products.id, productIds)))

  if (productRows.length !== productIds.length) {
    return emptyCalculation('PROMO_NOT_APPLICABLE', promoMessage('PROMO_NOT_APPLICABLE', locale))
  }

  const variantIds = [...new Set([...requestedItems.values()].flatMap((item) => item.variantId ? [item.variantId] : []))]
  const variantRows = variantIds.length
    ? await db
        .select({
          id: productsVariable.id,
          productId: productsVariable.productId,
          price: productsVariable.price,
          discountPrice: productsVariable.discountPrice,
          priceWh: productsVariable.priceWh,
          isShown: productsVariable.isShown,
        })
        .from(productsVariable)
        .where(inArray(productsVariable.id, variantIds))
    : []

  const productById = new Map(productRows.map((product) => [product.id, product]))
  const variantById = new Map(variantRows.map((variant) => [variant.id, variant]))
  const [selectedBrandRows, excludedBrandRows] = await Promise.all([
    db.select({ brandId: promocodeBrands.brandId }).from(promocodeBrands).where(eq(promocodeBrands.promocodeId, promo.id)),
    db.select({ brandId: promocodeExcludedBrands.brandId }).from(promocodeExcludedBrands).where(eq(promocodeExcludedBrands.promocodeId, promo.id)),
  ])
  const selectedBrandIds = new Set(selectedBrandRows.map((row) => row.brandId))
  const excludedBrandIds = new Set(excludedBrandRows.map((row) => row.brandId))

  const rows = [...requestedItems.values()].map((item) => {
    const product = productById.get(item.id)
    const variant = item.variantId ? variantById.get(item.variantId) : null
    if (!product || (item.variantId && (!variant || variant.productId !== item.id || variant.isShown !== 1))) {
      return null
    }

    const variantDiscount = isB2B ? 0 : variant ? Number(variant.discountPrice) : 0
    const basePrice = isB2B
      ? variant ? Number(variant.priceWh) : Number(product.priceWh)
      : variant ? Number(variant.price) : Number(product.price)
    const unitPrice = isB2B
      ? basePrice
      : variant
        ? (variantDiscount > 0 ? variantDiscount : basePrice)
        : (Number(product.discountPrice) > 0 ? Number(product.discountPrice) : basePrice)
    const currentTotal = Math.max(0, unitPrice) * item.quantity
    const hasProductDiscount = unitPrice < basePrice
    let eligible = currentTotal > 0

    if (!promo.allowDiscounted && hasProductDiscount) eligible = false
    if (isAlwaysExcludedBrand(product.brandTitle)) eligible = false
    if (promo.brandScope === 'selected' && !selectedBrandIds.has(product.brandId ?? 0)) eligible = false
    if (promo.brandScope === 'all' && excludedBrandIds.has(product.brandId ?? 0)) eligible = false

    return { key: itemKey(item), currentTotal, eligible }
  })

  if (rows.some((row) => row === null)) {
    return emptyCalculation('PROMO_NOT_APPLICABLE', promoMessage('PROMO_NOT_APPLICABLE', locale))
  }

  const validRows = rows.filter((row): row is NonNullable<typeof row> => row !== null)
  const subtotal = validRows.reduce((sum, row) => sum + row.currentTotal, 0)
  const eligibleSubtotal = validRows.reduce((sum, row) => sum + (row.eligible ? row.currentTotal : 0), 0)

  if (eligibleSubtotal <= 0) {
    return emptyCalculation('PROMO_NOT_APPLICABLE', promoMessage('PROMO_NOT_APPLICABLE', locale))
  }
  if (promo.minAmount !== null && eligibleSubtotal < Number(promo.minAmount)) {
    return emptyCalculation('PROMO_MINIMUM_AMOUNT', promoMessage('PROMO_MINIMUM_AMOUNT', locale))
  }

  let discount = promo.type === 'percentage'
    ? eligibleSubtotal * (Number(promo.value) / 100)
    : Math.min(Number(promo.value), eligibleSubtotal)

  if (promo.type === 'percentage' && promo.maxDiscount !== null && Number(promo.maxDiscount) > 0) {
    discount = Math.min(discount, Number(promo.maxDiscount))
  }

  discount = Math.min(Math.max(0, Math.round(discount * 100) / 100), eligibleSubtotal)
  if (discount <= 0) return emptyCalculation('PROMO_NOT_APPLICABLE', promoMessage('PROMO_NOT_APPLICABLE', locale))

  const lineDiscounts: Record<string, number> = {}
  let distributed = 0
  const eligibleRows = validRows.filter((row) => row.eligible)
  eligibleRows.forEach((row, index) => {
    const lineDiscount = index === eligibleRows.length - 1
      ? discount - distributed
      : Math.round(discount * (row.currentTotal / eligibleSubtotal) * 100) / 100
    const safeDiscount = Math.min(Math.max(0, lineDiscount), row.currentTotal)
    lineDiscounts[row.key] = safeDiscount
    distributed += safeDiscount
  })

  const appliedPromo: AppliedPromo = {
    id: promo.id,
    code: promo.code,
    name: promo.name,
    type: promo.type,
    value: Number(promo.value),
    discount,
    subtotal: Math.round(subtotal * 100) / 100,
    eligibleSubtotal: Math.round(eligibleSubtotal * 100) / 100,
    total: Math.max(0, Math.round((subtotal - discount) * 100) / 100),
    lineDiscounts,
  }

  return { applied: true, promo: appliedPromo, reason: null, message: null }
}
