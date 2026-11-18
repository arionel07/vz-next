import { and, eq, gt, inArray, isNull } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db'
import { AUTH_SESSION_COOKIE, findClientById, getUserBySessionToken } from '@/lib/auth'
import { calculateGiftItems } from '@/lib/gift-promotions'
import { calculatePromoCode } from '@/lib/promocodes'
import { EXPRESS_DELIVERY_PRICE } from '@/lib/delivery-constants'
import { brands, constants, gifts, menu, products, productsVariable, rouletteSettings, rouletteSpins } from '../../../../../drizzle/schema'

const requestSchema = z.object({
  items: z.array(z.object({
    id: z.number().int().positive(),
    variantId: z.number().int().positive().nullable().optional(),
    quantity: z.number().int().min(1).max(99),
    isGift: z.boolean().optional(),
    giftPromotionId: z.number().int().positive().nullable().optional(),
    rouletteGiftId: z.number().int().positive().nullable().optional(),
  })).max(100),
  promoCode: z.string().trim().max(64).default(''),
  discountChoice: z.enum(['promo', 'roulette', 'none']).default('promo'),
  bonusAmount: z.number().int().min(0).max(1000000).default(0),
  deliveryMethod: z.enum(['delivery', 'pickup', 'express']).default('delivery'),
  locale: z.enum(['ru', 'ro']).default('ru'),
})

function numberOrZero(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function excludedRouletteBrand(title: string | null) {
  const compact = String(title ?? '').toUpperCase().replace(/[^A-Z0-9]+/g, '')
  return compact === 'MAC' || compact.startsWith('MACCOSMETICS')
    || compact === 'ABH' || compact.startsWith('ANASTASIABEVERLYHILLS')
    || compact === 'SHIK' || compact.startsWith('SHIK')
}

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json())
    if (body.deliveryMethod === 'express') {
      const [expressOption] = await db.select({ id: menu.id }).from(menu)
        .where(and(eq(menu.id, 39), eq(menu.isShown, 1))).limit(1)
      if (!expressOption) {
        return NextResponse.json({ message: 'Срочная доставка сейчас недоступна.' }, { status: 409 })
      }
    }
    const cookieStore = await cookies()
    const authUser = await getUserBySessionToken(cookieStore.get(AUTH_SESSION_COOKIE)?.value)
    const client = authUser ? await findClientById(authUser.id) : null
    const requestedPaidItems = body.items.filter((item) => !item.isGift)
    const requestedGifts = body.items.filter((item) => item.isGift)
    const giftMarkers = new Set<string>()
    for (const item of body.items) {
      if (item.isGift) {
        const hasPromotionMarker = Boolean(item.giftPromotionId)
        const hasRouletteMarker = Boolean(item.rouletteGiftId)
        if (item.quantity !== 1 || hasPromotionMarker === hasRouletteMarker) {
          return NextResponse.json({ message: 'Подарочная строка больше недоступна.' }, { status: 409 })
        }
        const marker = hasPromotionMarker ? `promotion:${item.giftPromotionId}` : `roulette:${item.rouletteGiftId}`
        if (giftMarkers.has(marker)) return NextResponse.json({ message: 'Подарочная строка добавлена несколько раз.' }, { status: 409 })
        giftMarkers.add(marker)
      } else if (item.giftPromotionId || item.rouletteGiftId) {
        return NextResponse.json({ message: 'Некорректная подарочная строка.' }, { status: 409 })
      }
    }

    const paidItemsByKey = new Map<string, (typeof requestedPaidItems)[number]>()
    for (const item of requestedPaidItems) {
      const key = `${item.id}:${item.variantId ?? 0}`
      const existing = paidItemsByKey.get(key)
      const quantity = (existing?.quantity ?? 0) + item.quantity
      if (quantity > 99) return NextResponse.json({ message: 'Количество товара превышает допустимое.' }, { status: 400 })
      paidItemsByKey.set(key, { ...item, quantity })
    }
    const requestedItems = [...paidItemsByKey.values()]
    const productIds = [...new Set(requestedItems.map((item) => item.id))]
    const variantIds = [...new Set(requestedItems.flatMap((item) => item.variantId ? [item.variantId] : []))]

    const [productRows, variantRows, constantRows] = await Promise.all([
      productIds.length
        ? db.select({
            id: products.id,
            title: products.titleRu,
            price: products.price,
            discountPrice: products.discountPrice,
            onStock: products.onStock,
            priceWh: products.priceWh,
            onStockWh: products.onStockWh,
            brandId: products.brandId,
            brand: brands.title,
            isShown: products.isShown,
            isGift: products.isGift,
          }).from(products).leftJoin(brands, eq(products.brandId, brands.id))
            .where(inArray(products.id, productIds))
        : Promise.resolve([]),
      variantIds.length
        ? db.select({
            id: productsVariable.id,
            productId: productsVariable.productId,
            price: productsVariable.price,
            discountPrice: productsVariable.discountPrice,
            qty: productsVariable.qty,
            priceWh: productsVariable.priceWh,
            qtyWh: productsVariable.qtyWh,
            isShown: productsVariable.isShown,
          }).from(productsVariable).where(inArray(productsVariable.id, variantIds))
        : Promise.resolve([]),
      db.select({ name: constants.name, value: constants.ru }).from(constants)
        .where(inArray(constants.name, ['FREE_SHIPPING_VALUE', 'SHIPPING_PRICE'])),
    ])

    const productsById = new Map(productRows.map((product) => [product.id, product]))
    const variantsById = new Map(variantRows.map((variant) => [variant.id, variant]))
    const rows = requestedItems.map((item) => {
      const product = productsById.get(item.id)
      const variant = item.variantId ? variantsById.get(item.variantId) : null
      if (!product || product.isShown !== 1 || (item.variantId && (!variant || variant.productId !== item.id || variant.isShown !== 1))) {
        throw new Error('Один из товаров больше недоступен.')
      }
      if (product.isGift === 1) throw new Error('Подарочный товар можно получить только при выполнении условий акции.')
      const availableStock = numberOrZero(
        authUser?.isB2B
          ? (variant ? variant.qtyWh : product.onStockWh)
          : (variant ? variant.qty : product.onStock),
      )

      const originalPrice = authUser?.isB2B
        ? variant ? numberOrZero(variant.priceWh) : numberOrZero(product.priceWh)
        : variant ? numberOrZero(variant.price) : numberOrZero(product.price)
      const discountedPrice = authUser?.isB2B
        ? 0
        : variant ? numberOrZero(variant.discountPrice) : numberOrZero(product.discountPrice)
      const unitPrice = discountedPrice > 0 ? discountedPrice : originalPrice
      const available = availableStock >= item.quantity && availableStock > 0
      return {
        id: item.id,
        variantId: item.variantId ?? null,
        quantity: item.quantity,
        product,
        originalPrice,
        unitPrice,
        maxQuantity: Math.max(0, availableStock),
        available,
        availabilityMessage: available ? null : availableStock <= 0 ? 'Товара сейчас нет в наличии.' : `Доступно только ${availableStock} шт.`,
        hasProductDiscount: discountedPrice > 0 && discountedPrice < originalPrice,
        subtotal: available ? unitPrice * item.quantity : 0,
        key: `${item.id}:${item.variantId ?? 0}`,
      }
    })

    let promo: Awaited<ReturnType<typeof calculatePromoCode>>['promo'] = null
    let promoMessage: string | null = null
    if (body.discountChoice === 'promo' && body.promoCode) {
      const availableItems = rows.filter((row) => row.available).map(({ id, variantId, quantity }) => ({ id, variantId, quantity }))
      const result = await calculatePromoCode({ code: body.promoCode, items: availableItems, clientId: authUser?.id ?? null, isB2B: authUser?.isB2B ?? false, locale: body.locale })
      promo = result.promo
      promoMessage = result.applied ? null : result.message
    }

    const giftPromotions = await calculateGiftItems(
      requestedItems,
      body.locale,
      Object.fromEntries(requestedGifts.flatMap((item) => item.giftPromotionId ? [[item.giftPromotionId, item.variantId ?? null] as const] : [])),
    )
    const expectedPromotionGiftKeys = new Set(giftPromotions.map((gift) => `${gift.id}:${gift.variantId ?? 0}:${gift.giftPromotionId}`))
    for (const requestedGift of requestedGifts.filter((item) => item.giftPromotionId)) {
      const key = `${requestedGift.id}:${requestedGift.variantId ?? 0}:${requestedGift.giftPromotionId}`
      if (!expectedPromotionGiftKeys.has(key)) {
        return NextResponse.json({ message: 'Подарочная акция больше недоступна.' }, { status: 409 })
      }
    }

    let rouletteGiftProductId: number | null = null
    let rouletteGiftFixedVariantId: number | null = null
    let rouletteGiftVariantIds: number[] = []
    let roulette: {
      available: boolean
      title: string | null
      expiresAt: string | null
      rewardType: string | null
      giftId: number | null
      discount: number
      freeShipping: boolean
    } = { available: false, title: null, expiresAt: null, rewardType: null, giftId: null, discount: 0, freeShipping: false }
    if (authUser && !authUser.isB2B) {
      const [settings] = await db.select({ isEnabled: rouletteSettings.isEnabled, isVisible: rouletteSettings.isVisible })
        .from(rouletteSettings).limit(1)
      const [spin] = await db.select({
        id: rouletteSpins.id,
        title: body.locale === 'ro' ? rouletteSpins.titleRoSnapshot : rouletteSpins.titleRuSnapshot,
        rewardType: rouletteSpins.rewardTypeSnapshot,
        rewardValue: rouletteSpins.rewardValueSnapshot,
        rewardPayload: rouletteSpins.rewardPayloadSnapshot,
        expiresAt: rouletteSpins.expiresAt,
      }).from(rouletteSpins).where(and(
        eq(rouletteSpins.clientId, authUser.id),
        eq(rouletteSpins.status, 'active'),
        isNull(rouletteSpins.orderId),
        gt(rouletteSpins.expiresAt, new Date().toISOString().slice(0, 19).replace('T', ' ')),
      )).limit(1)

      if (settings?.isEnabled === 1 && settings.isVisible === 1 && spin) {
        const rewardType = spin.rewardType
        const eligibleSubtotal = rows.reduce((sum, row) =>
          row.available && !row.hasProductDiscount && !excludedRouletteBrand(row.product.brand) ? sum + row.subtotal : sum, 0)
        const discount = rewardType === 'discount_percent'
          ? roundMoney(eligibleSubtotal * Math.min(100, Math.max(0, numberOrZero(spin.rewardValue))) / 100)
          : 0
        const giftId = rewardType === 'gift' ? numberOrZero(spin.rewardPayload) : 0
        const [gift] = giftId > 0 ? await db.select({ id: gifts.id, productId: gifts.productId, variantId: gifts.variantId })
          .from(gifts).where(and(eq(gifts.id, giftId), eq(gifts.isEnabled, 1), eq(gifts.showOnSite, 1))).limit(1) : []
        const [giftProduct] = gift?.productId ? await db.select({ id: products.id, isShown: products.isShown, isGift: products.isGift, onStock: products.onStock })
          .from(products).where(eq(products.id, gift.productId)).limit(1) : []
        const giftVariantRows = gift?.productId ? await db.select({ id: productsVariable.id, productId: productsVariable.productId, isShown: productsVariable.isShown, qty: productsVariable.qty })
          .from(productsVariable).where(and(eq(productsVariable.productId, gift.productId), eq(productsVariable.isShown, 1), gt(productsVariable.qty, 0))) : []
        const giftHasStock = gift?.variantId
          ? giftVariantRows.some((variant) => variant.id === gift.variantId && variant.productId === giftProduct?.id)
          : numberOrZero(giftProduct?.onStock) > 0 || giftVariantRows.length > 0
        const giftIsAvailable = Boolean(gift && giftProduct?.isShown === 1 && giftProduct.isGift === 1 && giftHasStock)
        if (giftIsAvailable && gift?.productId) {
          rouletteGiftProductId = gift.productId
          rouletteGiftFixedVariantId = gift.variantId ?? null
          rouletteGiftVariantIds = giftVariantRows.map((variant) => variant.id)
        }
        const available = rewardType === 'free_shipping'
          ? rows.some((row) => row.available)
          : rewardType === 'discount_percent'
            ? discount > 0
            : rewardType === 'gift' && rows.some((row) => row.available) && giftIsAvailable
        roulette = {
          available,
          title: spin.title,
          expiresAt: spin.expiresAt,
          rewardType,
          giftId: giftIsAvailable ? giftId : null,
          discount,
          freeShipping: available && rewardType === 'free_shipping',
        }
      }
    }

    const discountChoice = body.discountChoice === 'roulette' && roulette.available
      ? 'roulette'
      : body.discountChoice === 'promo' && promo
        ? 'promo'
        : 'none'
    const rouletteGiftRows = requestedGifts.filter((item) => item.rouletteGiftId)
    if (rouletteGiftRows.length) {
      const giftRow = rouletteGiftRows[0]
      if (rouletteGiftRows.length !== 1 || discountChoice !== 'roulette' || roulette.rewardType !== 'gift'
        || roulette.giftId !== giftRow.rouletteGiftId || giftRow.id !== rouletteGiftProductId || giftRow.quantity !== 1) {
        return NextResponse.json({ message: 'Подарок рулетки больше недоступен.' }, { status: 409 })
      }
      if (rouletteGiftFixedVariantId) {
        if (giftRow.variantId !== rouletteGiftFixedVariantId) return NextResponse.json({ message: 'Подарок рулетки больше недоступен.' }, { status: 409 })
      } else if (rouletteGiftVariantIds.length && !rouletteGiftVariantIds.includes(giftRow.variantId ?? 0)) {
        return NextResponse.json({ message: 'Выберите доступный вариант подарка.' }, { status: 409 })
      } else if (!rouletteGiftVariantIds.length && !requestedGifts.some((item) => item.rouletteGiftId === roulette.giftId)) {
        return NextResponse.json({ message: 'Подарок рулетки больше недоступен.' }, { status: 409 })
      }
    }
    const promoDiscountByItem = promo?.lineDiscounts ?? {}
    const rouletteDiscount = discountChoice === 'roulette' ? roulette.discount : 0
    const rouletteEligibleRows = discountChoice === 'roulette'
      ? rows.filter((row) => row.available && !row.hasProductDiscount && !excludedRouletteBrand(row.product.brand))
      : []
    const rouletteLineDiscounts = new Map<string, number>()
    let distributedRouletteDiscount = 0
    rouletteEligibleRows.forEach((row, index) => {
      const amount = index === rouletteEligibleRows.length - 1
        ? rouletteDiscount - distributedRouletteDiscount
        : roundMoney(rouletteDiscount * row.subtotal / rouletteEligibleRows.reduce((sum, eligible) => sum + eligible.subtotal, 0))
      const safeAmount = Math.min(row.subtotal, Math.max(0, amount))
      rouletteLineDiscounts.set(row.key, safeAmount)
      distributedRouletteDiscount += safeAmount
    })

    const calculatedRows = rows.map((row) => {
      const lineDiscount = !row.available ? 0 : discountChoice === 'promo'
        ? numberOrZero(promoDiscountByItem[row.key])
        : discountChoice === 'roulette'
          ? numberOrZero(rouletteLineDiscounts.get(row.key))
          : 0
      return {
        ...row,
        productDiscount: row.available && row.hasProductDiscount ? roundMoney((row.originalPrice - row.unitPrice) * row.quantity) : 0,
        lineDiscount,
        finalTotal: Math.max(0, row.subtotal - lineDiscount),
        bonusEligible: row.available && !authUser?.isB2B && Boolean(client) && !row.hasProductDiscount && lineDiscount <= 0,
      }
    })

    const validGiftCount = requestedGifts.length
    const productsSubtotal = roundMoney(calculatedRows.reduce((sum, row) => sum + row.subtotal, 0) + validGiftCount)
    const productDiscount = roundMoney(calculatedRows.reduce((sum, row) =>
      sum + (row.available && row.hasProductDiscount ? (row.originalPrice - row.unitPrice) * row.quantity : 0), 0))
    const appliedDiscount = roundMoney(calculatedRows.reduce((sum, row) => sum + row.lineDiscount, 0))
    const cartTotal = roundMoney(calculatedRows.reduce((sum, row) => sum + row.finalTotal, 0) + validGiftCount)
    const bonusEligibleTotal = roundMoney(calculatedRows.reduce((sum, row) => sum + (row.bonusEligible ? row.finalTotal : 0), 0))
    const bonusBalance = !authUser?.isB2B ? Math.max(0, numberOrZero(client?.bonus)) : 0
    const bonusRate = !authUser?.isB2B ? Math.max(0, numberOrZero(client?.discount)) : 0
    const maxBonusWriteoff = Math.floor(Math.max(0, Math.min(bonusBalance, bonusEligibleTotal - 1)))
    const bonusUsed = Math.min(body.bonusAmount, maxBonusWriteoff)
    const bonusEarned = bonusUsed > 0 ? 0 : roundMoney(calculatedRows.reduce((sum, row) =>
      sum + (row.bonusEligible ? row.finalTotal * bonusRate / 100 : 0), 0))

    const constantValue = (name: string) => numberOrZero(constantRows.find((constant) => constant.name === name)?.value)
    const shippingThreshold = Math.max(0, constantValue('FREE_SHIPPING_VALUE'))
    const shippingPrice = Math.max(0, constantValue('SHIPPING_PRICE'))
    const freeShipping = body.deliveryMethod === 'pickup'
      || (body.deliveryMethod === 'delivery' && (shippingThreshold <= 0 || cartTotal >= shippingThreshold || (discountChoice === 'roulette' && roulette.freeShipping)))
    const deliveryPrice = body.deliveryMethod === 'pickup'
      ? 0
      : body.deliveryMethod === 'express'
        ? EXPRESS_DELIVERY_PRICE
        : freeShipping ? 0 : Math.round(shippingPrice)
    const remaining = Math.max(0, shippingThreshold - cartTotal)

    return NextResponse.json({
      items: [
        ...calculatedRows.map((row) => ({ id: row.id, variantId: row.variantId, quantity: row.quantity, unitPrice: row.unitPrice, originalPrice: row.originalPrice, maxQuantity: row.maxQuantity, available: row.available, availabilityMessage: row.availabilityMessage, subtotal: roundMoney(row.subtotal), productDiscount: row.productDiscount, promoDiscount: roundMoney(row.lineDiscount), discount: roundMoney(row.productDiscount + row.lineDiscount), total: roundMoney(row.finalTotal) })),
        ...requestedGifts.map((gift) => ({ id: gift.id, variantId: gift.variantId ?? null, quantity: gift.quantity, unitPrice: 1, originalPrice: 1, maxQuantity: 1, available: true, availabilityMessage: null, subtotal: 1, productDiscount: 0, promoDiscount: 0, discount: 0, total: 1 })),
      ],
      totals: {
        productsSubtotal,
        productDiscount,
        promoDiscount: appliedDiscount,
        cartTotal,
        deliveryPrice,
        bonusUsed,
        total: roundMoney(Math.max(0, cartTotal - bonusUsed) + deliveryPrice),
      },
      shipping: {
        threshold: shippingThreshold,
        price: shippingPrice,
        remaining,
        progress: shippingThreshold > 0 ? Math.min(100, cartTotal / shippingThreshold * 100) : 100,
        free: freeShipping,
      },
      bonuses: {
        enabled: !authUser?.isB2B,
        authenticated: Boolean(client && !authUser?.isB2B),
        earned: bonusEarned,
        balance: bonusBalance,
        eligible: bonusEligibleTotal,
        maxWriteoff: maxBonusWriteoff,
      },
      discount: {
        choice: discountChoice,
        label: discountChoice === 'roulette' ? roulette.title : promo?.code ?? null,
        message: promoMessage,
      },
      roulette,
    })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ message: 'Некорректные данные корзины.' }, { status: 400 })
    if (error instanceof Error && error.message === 'Один из товаров больше недоступен.') {
      return NextResponse.json({ message: error.message }, { status: 409 })
    }
    if (error instanceof Error && error.message === 'Подарочный товар можно получить только при выполнении условий акции.') {
      return NextResponse.json({ message: error.message }, { status: 409 })
    }
    console.error('Cart quote calculation failed', error)
    return NextResponse.json({ message: 'Не удалось рассчитать корзину.' }, { status: 500 })
  }
}
