import { and, count, eq, gt, inArray, isNull, sql } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db'
import { AUTH_SESSION_COOKIE, findClientById, getUserBySessionToken } from '@/lib/auth'
import { calculateGiftItems } from '@/lib/gift-promotions'
import { sendOrderConfirmationEmail } from '@/lib/order-delivery'
import { calculatePromoCode } from '@/lib/promocodes'
import { EXPRESS_DELIVERY_PRICE } from '@/lib/delivery-constants'
import { brands, clients, constants, gifts, menu, orders, ordersProducts, products, productsVariable, promocodeUsages, promocodes, rouletteSettings, rouletteSpins, stores } from '../../../../drizzle/schema'

const orderRequestSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(1).max(255),
    surname: z.string().trim().max(255).default(''),
    phone: z.string().trim().min(5).max(255),
    email: z.string().trim().email().max(255),
    city: z.string().trim().max(255).default(''),
    street: z.string().trim().max(128).default(''),
    house: z.string().trim().max(64).default(''),
    entrance: z.string().trim().max(64).default(''),
    apartment: z.string().trim().max(64).default(''),
  }),
  delivery: z.enum(['delivery', 'pickup', 'express']),
  storeId: z.number().int().positive().nullable().default(null),
  payment: z.enum(['cash', 'card', 'online']),
  comment: z.string().trim().max(4000).default(''),
  promoCode: z.string().trim().max(64).default(''),
  discountChoice: z.enum(['promo', 'roulette', 'none']).default('promo'),
  bonusAmount: z.number().int().min(0).max(1000000).default(0),
  expectedTotal: z.number().finite().min(0).max(100000000),
  locale: z.enum(['ru', 'ro']).default('ru'),
  items: z
    .array(
      z.object({
        id: z.number().int().positive(),
        variantId: z.number().int().positive().nullable().optional(),
        quantity: z.number().int().min(1).max(99),
        isGift: z.boolean().optional().default(false),
        giftPromotionId: z.number().int().positive().nullable().optional(),
        rouletteGiftId: z.number().int().positive().nullable().optional(),
      }),
    )
    .min(1)
    .max(100),
})

function normalizePhone(value: string) {
  const trimmed = value.trim()
  const digits = trimmed.replace(/\D/g, '')
  return `${trimmed.startsWith('+') ? '+' : ''}${digits}`
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function getDeliveryAddress(customer: z.infer<typeof orderRequestSchema>['customer']) {
  const parts = [customer.city, customer.street ? `st. ${customer.street}` : '', customer.house ? `h. ${customer.house}` : '']
  if (customer.entrance) parts.push(`p. ${customer.entrance}`)
  if (customer.apartment) parts.push(`ap. ${customer.apartment}`)
  return parts.filter(Boolean).join(', ')
}

const ORDER_ERROR_TRANSLATIONS: Record<string, string> = {
  'Введите корректный номер телефона.': 'Introduceți un număr de telefon valid.',
  'Номер телефона слишком длинный.': 'Numărul de telefon este prea lung.',
  'Укажите населённый пункт, улицу и дом.': 'Indicați localitatea, strada și numărul casei.',
  'Адрес доставки слишком длинный.': 'Adresa de livrare este prea lungă.',
  'Выберите магазин для самовывоза.': 'Selectați magazinul pentru ridicare.',
  'Магазин для самовывоза временно недоступен.': 'Magazinul pentru ridicare este temporar indisponibil.',
  'Срочная доставка сейчас недоступна.': 'Livrarea expres nu este disponibilă în acest moment.',
  'Один из товаров больше недоступен.': 'Unul dintre produse nu mai este disponibil.',
  'Войдите в B2C аккаунт, чтобы применить приз рулетки.': 'Autentifică-te într-un cont B2C pentru a aplica premiul de la ruletă.',
  'Приз рулетки больше недоступен. Обновите корзину.': 'Premiul de la ruletă nu mai este disponibil. Actualizează coșul.',
  'Добавьте товар, чтобы получить подарок рулетки.': 'Adaugă un produs pentru a primi cadoul de la ruletă.',
  'Подарок рулетки больше недоступен.': 'Cadoul de la ruletă nu mai este disponibil.',
  'Добавьте призовой подарок в корзину.': 'Adaugă cadoul-premiu în coș.',
  'Сумма или условия заказа изменились. Обновите оформление и проверьте итог.': 'Suma sau condițiile comenzii s-au schimbat. Actualizează pagina și verifică totalul.',
  'Промокод больше недоступен.': 'Codul promoțional nu mai este disponibil.',
  'Лимит использований промокода исчерпан. Обновите корзину.': 'Limita de utilizări a codului promoțional a fost atinsă. Actualizează coșul.',
  'Вы уже использовали этот промокод.': 'Ai folosit deja acest cod promoțional.',
  'Промокод больше нельзя применить.': 'Codul promoțional nu mai poate fi aplicat.',
  'Недостаточно бонусов на балансе. Обновите корзину.': 'Sold insuficient de bonusuri. Actualizează coșul.',
  'Приз рулетки уже использован. Обновите корзину.': 'Premiul de la ruletă a fost deja folosit. Actualizează coșul.',
  'Тариф доставки изменился. Обновите оформление и проверьте итог.': 'Tariful de livrare s-a schimbat. Actualizează pagina și verifică totalul.',
  'Цена товара изменилась. Обновите корзину и подтвердите заказ ещё раз.': 'Prețul produsului s-a schimbat. Actualizează coșul și confirmă comanda din nou.',
  'Один из товаров закончился': 'Unul dintre produse s-a terminat.',
  'У одного из товаров не указана цена': 'Unul dintre produse nu are preț specificat.',
  'Подарочный товар можно получить только при выполнении условий акции.': 'Produsul cadou poate fi obținut doar la îndeplinirea condițiilor promoției.',
  'Подарок акции больше недоступен.': 'Cadoul promoției nu mai este disponibil.',
  'Выберите вариант подарка.': 'Selectează varianta cadoului.',
  'Проверьте данные заказа и попробуйте ещё раз.': 'Verifică datele comenzii și încearcă din nou.',
  'Не удалось создать заказ. Попробуйте ещё раз.': 'Comanda nu a putut fi creată. Încearcă din nou.',
}

/**
 * Every order-flow message is written in Russian as its canonical/internal
 * form (also used as the identifier the catch block matches thrown Error
 * messages against) and translated at the point it's sent to the client.
 * Before this, Romanian-locale customers only ever saw a generic fallback
 * on the frontend (checkout-page.tsx used to special-case `locale === 'ro'`
 * to avoid showing them Russian text) — they never saw the real reason an
 * order failed (out of stock, promo code issue, pickup store unavailable,
 * price changed, etc).
 */
function localizeOrderMessage(message: string, locale: 'ru' | 'ro') {
  if (locale !== 'ro') return message
  return ORDER_ERROR_TRANSLATIONS[message] ?? message
}

function getClientIp(request: Request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  ).slice(0, 128)
}

async function getUniquePublicOrderId(tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = Math.floor(10000 + Math.random() * 90000)
    const [existing] = await tx
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.orderId, candidate))
      .limit(1)

    if (!existing) return candidate
  }

  throw new Error('Не удалось создать номер заказа')
}

export async function POST(request: Request) {
  let locale: 'ru' | 'ro' = 'ru'
  try {
    const rawBody = await request.json()
    locale = rawBody?.locale === 'ro' ? 'ro' : 'ru'
    const body = orderRequestSchema.parse(rawBody)
    const phone = normalizePhone(body.customer.phone)

    if (phone.replace(/\D/g, '').length < 5) {
      return NextResponse.json(
        { message: localizeOrderMessage('Введите корректный номер телефона.', locale) },
        { status: 400 },
      )
    }
    if (phone.length > 32) {
      return NextResponse.json({ message: localizeOrderMessage('Номер телефона слишком длинный.', locale) }, { status: 400 })
    }

    if (body.delivery !== 'pickup' && (!body.customer.city || !body.customer.street || !body.customer.house)) {
      return NextResponse.json(
        { message: localizeOrderMessage('Укажите населённый пункт, улицу и дом.', locale) },
        { status: 400 },
      )
    }
    const deliveryAddress = body.delivery === 'pickup' ? '' : getDeliveryAddress(body.customer)
    if (deliveryAddress.length > 255) {
      return NextResponse.json({ message: localizeOrderMessage('Адрес доставки слишком длинный.', locale) }, { status: 400 })
    }

    const requestedItems = new Map<string, { id: number; variantId: number | null; quantity: number; isGift: boolean; giftPromotionId: number | null; rouletteGiftId: number | null }>()
    for (const item of body.items) {
      const variantId = item.variantId ?? null
      const isGift = item.isGift ?? false
      const giftPromotionId = item.giftPromotionId ?? null
      const rouletteGiftId = item.rouletteGiftId ?? null
      if (giftPromotionId && rouletteGiftId) throw new Error('Подарок акции больше недоступен.')
      const key = `${item.id}:${variantId ?? 0}:${isGift ? giftPromotionId ?? 0 : 0}:${isGift ? rouletteGiftId ?? 0 : 0}`
      const existing = requestedItems.get(key)
      requestedItems.set(key, {
        id: item.id,
        variantId,
        quantity: (existing?.quantity ?? 0) + item.quantity,
        isGift,
        giftPromotionId,
        rouletteGiftId,
      })
    }

    const paidRequestedItems = [...requestedItems.values()].filter((item) => !item.isGift)
    const giftSelections = Object.fromEntries([...requestedItems.values()].flatMap((item) =>
      item.isGift && item.giftPromotionId ? [[item.giftPromotionId, item.variantId] as const] : [],
    ))
    const expectedGifts = await calculateGiftItems(paidRequestedItems, body.locale, giftSelections)
    const expectedGiftKeys = new Set(expectedGifts.map((item) => `${item.id}:${item.variantId ?? 0}:${item.giftPromotionId}`))
    for (const item of requestedItems.values()) {
      if (item.isGift) {
        if (item.quantity !== 1) throw new Error('Подарок акции больше недоступен.')
        if (item.giftPromotionId && expectedGifts.some((gift) => gift.giftPromotionId === item.giftPromotionId && gift.giftVariantRequired)) {
          throw new Error('Выберите вариант подарка.')
        }
        if (item.giftPromotionId && !expectedGiftKeys.has(`${item.id}:${item.variantId ?? 0}:${item.giftPromotionId}`)) {
          throw new Error('Подарок акции больше недоступен.')
        }
        if (!item.giftPromotionId && !item.rouletteGiftId) throw new Error('Подарок акции больше недоступен.')
      } else if (item.giftPromotionId || item.rouletteGiftId) {
        throw new Error('Подарок акции больше недоступен.')
      }
    }

    if (body.delivery === 'pickup') {
      if (body.storeId === null) {
        return NextResponse.json(
          { message: localizeOrderMessage('Выберите магазин для самовывоза.', locale) },
          { status: 400 },
        )
      }

      const [store] = await db
        .select({ id: stores.id })
        .from(stores)
        .where(and(eq(stores.id, body.storeId), eq(stores.isShown, 1), eq(stores.delivery, 1)))
        .limit(1)

      if (!store) {
        return NextResponse.json(
          { message: localizeOrderMessage('Магазин для самовывоза временно недоступен.', locale) },
          { status: 409 },
        )
      }
    }

    if (body.delivery === 'express') {
      const [expressOption] = await db.select({ id: menu.id }).from(menu)
        .where(and(eq(menu.id, 39), eq(menu.isShown, 1))).limit(1)
      if (!expressOption) {
        return NextResponse.json({ message: localizeOrderMessage('Срочная доставка сейчас недоступна.', locale) }, { status: 409 })
      }
    }

    const cookieStore = await cookies()
    const authenticatedUser = await getUserBySessionToken(cookieStore.get(AUTH_SESSION_COOKIE)?.value)
    const authenticatedClient = authenticatedUser ? await findClientById(authenticatedUser.id) : null
    const productIds = [...new Set([...requestedItems.values()].map((item) => item.id))]
    const productRows = await db
      .select({
        id: products.id,
        price: products.price,
        discountPrice: products.discountPrice,
        onStock: products.onStock,
        priceWh: products.priceWh,
        onStockWh: products.onStockWh,
        brand: brands.title,
        isGift: products.isGift,
      })
      .from(products)
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(
        and(
          eq(products.isShown, 1),
          inArray(products.id, productIds),
        ),
      )

    if (productRows.length !== productIds.length) {
      return NextResponse.json(
        { message: localizeOrderMessage('Один из товаров больше недоступен.', locale) },
        { status: 409 },
      )
    }

    const variantIds = [...new Set([...requestedItems.values()].flatMap((item) => item.variantId ? [item.variantId] : []))]
    const variantRows = variantIds.length
      ? await db
          .select({
            id: productsVariable.id,
            productId: productsVariable.productId,
            price: productsVariable.price,
            discountPrice: productsVariable.discountPrice,
            qty: productsVariable.qty,
            priceWh: productsVariable.priceWh,
            qtyWh: productsVariable.qtyWh,
            isShown: productsVariable.isShown,
          })
          .from(productsVariable)
          .where(inArray(productsVariable.id, variantIds))
      : []
    const productsById = new Map(productRows.map((product) => [product.id, product]))
    const variantsById = new Map(variantRows.map((variant) => [variant.id, variant]))

    const calculatedItems = [...requestedItems.values()].map((requestedItem) => {
      const product = productsById.get(requestedItem.id)
      const variant = requestedItem.variantId ? variantsById.get(requestedItem.variantId) : null
      if (!product || (requestedItem.variantId && (!variant || variant.productId !== requestedItem.id || variant.isShown !== 1))) {
        throw new Error('Один из товаров больше недоступен.')
      }

      if (!requestedItem.isGift && product.isGift === 1) {
        throw new Error('Подарочный товар можно получить только при выполнении условий акции.')
      }

      if (requestedItem.isGift) {
        return {
          id: requestedItem.id,
          variantId: requestedItem.variantId,
          quantity: requestedItem.quantity,
          originalPrice: 1,
          unitPrice: 1,
          rowTotal: 1,
          promoDiscount: 0,
          hasProductDiscount: false,
          bonusEligible: false,
          brand: null,
          isGift: true,
          giftPromotionId: requestedItem.giftPromotionId,
          rouletteGiftId: requestedItem.rouletteGiftId,
        }
      }

      const variantDiscount = authenticatedUser?.isB2B ? 0 : variant ? Number(variant.discountPrice) : 0
      const originalPrice = authenticatedUser?.isB2B
        ? Number(variant ? variant.priceWh : product.priceWh)
        : Number(variant ? variant.price : product.price)
      const unitPrice = authenticatedUser?.isB2B
        ? originalPrice
        : variant
          ? (variantDiscount > 0 ? variantDiscount : variant.price)
          : (product.discountPrice && product.discountPrice > 0 ? product.discountPrice : product.price)
      const stock = authenticatedUser?.isB2B
        ? variant ? variant.qtyWh : Number(product.onStockWh ?? 0)
        : variant ? variant.qty : Number(product.onStock ?? 0)

      if (stock < requestedItem.quantity) {
        throw new Error('Один из товаров закончился')
      }
      if (unitPrice === null || unitPrice <= 0) {
        throw new Error('У одного из товаров не указана цена')
      }

      return {
        id: requestedItem.id,
        variantId: requestedItem.variantId,
        quantity: requestedItem.quantity,
        originalPrice,
        unitPrice: Number(unitPrice),
        rowTotal: Number(unitPrice) * requestedItem.quantity,
        promoDiscount: 0,
        hasProductDiscount: Number(unitPrice) < originalPrice,
        bonusEligible: false,
        brand: product.brand,
        isGift: false,
        giftPromotionId: null,
        rouletteGiftId: null,
      }
    })

    const ip = getClientIp(request)
    const promoCalculation = body.discountChoice === 'promo' && body.promoCode
      ? await calculatePromoCode({
          code: body.promoCode,
          items: paidRequestedItems,
          clientId: authenticatedUser?.id ?? null,
          isB2B: authenticatedUser?.isB2B ?? false,
          locale,
        })
      : null

    if (body.discountChoice === 'promo' && body.promoCode && (!promoCalculation?.applied || !promoCalculation.promo)) {
      return NextResponse.json(
        { message: promoCalculation?.message ?? localizeOrderMessage('Промокод больше нельзя применить.', locale) },
        { status: promoCalculation?.reason === 'PROMO_NOT_AUTHENTICATED' ? 401 : 422 },
      )
    }

    const promo = promoCalculation?.promo ?? null
    let selectedRoulette: { id: number; prizeCode: string; rewardType: string; rewardValue: number; rewardPayload: string | null; title: string; giftId: number | null } | null = null
    if (body.discountChoice === 'roulette') {
      if (!authenticatedUser || authenticatedUser.isB2B) {
        return NextResponse.json({ message: localizeOrderMessage('Войдите в B2C аккаунт, чтобы применить приз рулетки.', locale) }, { status: 401 })
      }
      const [settings] = await db.select({ isEnabled: rouletteSettings.isEnabled, isVisible: rouletteSettings.isVisible }).from(rouletteSettings).limit(1)
      const [spin] = await db.select({
        id: rouletteSpins.id,
        prizeCode: rouletteSpins.prizeCodeSnapshot,
        rewardType: rouletteSpins.rewardTypeSnapshot,
        rewardValue: rouletteSpins.rewardValueSnapshot,
        rewardPayload: rouletteSpins.rewardPayloadSnapshot,
        title: rouletteSpins.titleRuSnapshot,
        titleRo: rouletteSpins.titleRoSnapshot,
      }).from(rouletteSpins).where(and(
        eq(rouletteSpins.clientId, authenticatedUser.id),
        eq(rouletteSpins.status, 'active'),
        isNull(rouletteSpins.orderId),
        gt(rouletteSpins.expiresAt, new Date().toISOString().slice(0, 19).replace('T', ' ')),
      )).limit(1)

      if (settings?.isEnabled !== 1 || settings.isVisible !== 1 || !spin || !['discount_percent', 'free_shipping', 'gift'].includes(spin.rewardType)) {
        return NextResponse.json({ message: localizeOrderMessage('Приз рулетки больше недоступен. Обновите корзину.', locale) }, { status: 409 })
      }
      const giftId = spin.rewardType === 'gift' ? Number(spin.rewardPayload) : null
      if (spin.rewardType === 'gift') {
        if (!paidRequestedItems.length) {
          return NextResponse.json({ message: localizeOrderMessage('Добавьте товар, чтобы получить подарок рулетки.', locale) }, { status: 409 })
        }
        const [gift] = giftId !== null && Number.isInteger(giftId) && giftId > 0
          ? await db.select({ id: gifts.id, productId: gifts.productId, variantId: gifts.variantId })
              .from(gifts).where(and(eq(gifts.id, Number(giftId)), eq(gifts.isEnabled, 1), eq(gifts.showOnSite, 1))).limit(1)
          : []
        const requestedGift = [...requestedItems.values()].find((item) => item.isGift && item.rouletteGiftId === giftId)
        const [giftProduct] = gift?.productId
          ? await db.select({ id: products.id, isShown: products.isShown, isGift: products.isGift, onStock: products.onStock })
              .from(products).where(eq(products.id, gift.productId)).limit(1)
          : []
        const giftVariants = gift?.productId
          ? await db.select({ id: productsVariable.id, productId: productsVariable.productId, isShown: productsVariable.isShown, qty: productsVariable.qty })
              .from(productsVariable).where(and(eq(productsVariable.productId, gift.productId), eq(productsVariable.isShown, 1), gt(productsVariable.qty, 0)))
          : []
        const selectedGiftVariant = requestedGift?.variantId
          ? giftVariants.find((variant) => variant.id === requestedGift.variantId)
          : null
        const availableGiftStock = gift?.variantId
          ? requestedGift?.variantId === gift.variantId && giftVariants.some((variant) => variant.id === gift.variantId)
          : giftVariants.length ? Boolean(selectedGiftVariant) : Number(giftProduct?.onStock ?? 0) > 0
        if (!gift || !requestedGift || requestedGift.id !== gift.productId || !giftProduct || giftProduct.isShown !== 1 || giftProduct.isGift !== 1 || !availableGiftStock) {
          return NextResponse.json({ message: localizeOrderMessage('Подарок рулетки больше недоступен.', locale) }, { status: 409 })
        }
        if (gift.variantId && requestedGift.variantId !== gift.variantId) {
          return NextResponse.json({ message: localizeOrderMessage('Подарок рулетки больше недоступен.', locale) }, { status: 409 })
        }
      }
      selectedRoulette = {
        id: spin.id,
        prizeCode: spin.prizeCode,
        rewardType: spin.rewardType,
        rewardValue: Number(spin.rewardValue ?? 0),
        rewardPayload: spin.rewardPayload,
        title: body.locale === 'ro' ? spin.titleRo : spin.title,
        giftId,
      }
    }

    const rouletteGiftItems = [...requestedItems.values()].filter((item) => item.rouletteGiftId)
    if (rouletteGiftItems.length && (!selectedRoulette || selectedRoulette.rewardType !== 'gift' || rouletteGiftItems.length !== 1 || rouletteGiftItems[0].rouletteGiftId !== selectedRoulette.giftId)) {
      return NextResponse.json({ message: localizeOrderMessage('Подарок рулетки больше недоступен.', locale) }, { status: 409 })
    }
    if (selectedRoulette?.rewardType === 'gift' && rouletteGiftItems.length !== 1) {
      return NextResponse.json({ message: localizeOrderMessage('Добавьте призовой подарок в корзину.', locale) }, { status: 409 })
    }

    const discountRows = calculatedItems.filter((item) => {
      const brand = String(item.brand ?? '').toUpperCase().replace(/[^A-Z0-9]+/g, '')
      const excluded = brand === 'MAC' || brand.startsWith('MACCOSMETICS')
        || brand === 'ABH' || brand.startsWith('ANASTASIABEVERLYHILLS')
        || brand === 'SHIK' || brand.startsWith('SHIK')
      return !item.isGift && !item.hasProductDiscount && !excluded
    })
    const rouletteDiscount = selectedRoulette?.rewardType === 'discount_percent'
      ? Math.round(discountRows.reduce((sum, item) => sum + item.rowTotal, 0) * Math.min(100, Math.max(0, selectedRoulette.rewardValue)) / 100 * 100) / 100
      : 0
    const rouletteLineDiscounts = new Map<string, number>()
    let rouletteDistributed = 0
    discountRows.forEach((item, index) => {
      const eligibleTotal = discountRows.reduce((sum, row) => sum + row.rowTotal, 0)
      const amount = index === discountRows.length - 1
        ? rouletteDiscount - rouletteDistributed
        : Math.round(rouletteDiscount * item.rowTotal / Math.max(eligibleTotal, 1) * 100) / 100
      const safeAmount = Math.min(item.rowTotal, Math.max(0, amount))
      rouletteLineDiscounts.set(`${item.id}:${item.variantId ?? 0}`, safeAmount)
      rouletteDistributed += safeAmount
    })
    const finalItems = calculatedItems.map((item) => {
      const key = `${item.id}:${item.variantId ?? 0}`
      const promoDiscount = item.isGift ? 0 : body.discountChoice === 'roulette'
        ? (rouletteLineDiscounts.get(key) ?? 0)
        : (promo?.lineDiscounts[key] ?? 0)
      const bonusEligible = Boolean(authenticatedClient && !authenticatedUser?.isB2B && !item.isGift && !item.hasProductDiscount && promoDiscount <= 0)
      return {
        ...item,
        promoDiscount,
        bonusEligible,
        rowTotal: Math.max(0, item.rowTotal - promoDiscount),
      }
    })
    const total = finalItems.reduce((sum, item) => sum + item.rowTotal, 0)
    const bonusEligibleTotal = finalItems.reduce((sum, item) => sum + (item.bonusEligible ? item.rowTotal : 0), 0)
    const bonusBalance = authenticatedClient && !authenticatedUser?.isB2B ? Math.max(0, Number(authenticatedClient.bonus) || 0) : 0
    const maximumBonusWriteoff = Math.floor(Math.max(0, Math.min(bonusBalance, bonusEligibleTotal - 1)))
    const bonusMinus = body.bonusAmount > 0 && authenticatedClient && !authenticatedUser?.isB2B
      ? Math.min(body.bonusAmount, maximumBonusWriteoff)
      : 0
    const bonusPlus = bonusMinus > 0 ? 0 : finalItems.reduce((sum, item) =>
      sum + (item.bonusEligible ? item.rowTotal * Math.max(0, Number(authenticatedClient?.discount) || 0) / 100 : 0), 0)
    const constantsRows = await db.select({ name: constants.name, value: constants.ru }).from(constants)
      .where(inArray(constants.name, ['FREE_SHIPPING_VALUE', 'SHIPPING_PRICE']))
    const constantValue = (name: string) => Number(constantsRows.find((row) => row.name === name)?.value ?? 0) || 0
    const freeShippingThreshold = Math.max(0, constantValue('FREE_SHIPPING_VALUE'))
    const shippingPrice = Math.max(0, constantValue('SHIPPING_PRICE'))
    const deliveryPrice = body.delivery === 'pickup'
      ? 0
      : body.delivery === 'express'
        ? EXPRESS_DELIVERY_PRICE
        : freeShippingThreshold <= 0 || total >= freeShippingThreshold || selectedRoulette?.rewardType === 'free_shipping'
          ? 0
          : Math.round(shippingPrice)
    const expectedOrderTotal = roundMoney(Math.max(0, total - bonusMinus) + deliveryPrice)
    if (expectedOrderTotal !== roundMoney(body.expectedTotal)) {
      return NextResponse.json(
        { message: localizeOrderMessage('Сумма или условия заказа изменились. Обновите оформление и проверьте итог.', locale) },
        { status: 409 },
      )
    }

    const result = await db.transaction(async (tx) => {
      if (promo && authenticatedUser) {
        const [lockedPromo] = await tx.select({ id: promocodes.id, status: promocodes.status, usageLimit: promocodes.usageLimit, perUserLimit: promocodes.perUserLimit })
          .from(promocodes).where(eq(promocodes.id, promo.id)).for('update').limit(1)
        if (!lockedPromo || lockedPromo.status !== 'active') throw new Error('Промокод больше недоступен.')
        const [[usageResult], [clientUsageResult]] = await Promise.all([
          tx.select({ total: count() }).from(promocodeUsages).where(eq(promocodeUsages.promocodeId, promo.id)),
          tx.select({ total: count() }).from(promocodeUsages).where(and(eq(promocodeUsages.promocodeId, promo.id), eq(promocodeUsages.clientId, authenticatedUser.id))),
        ])
        if (lockedPromo.usageLimit !== null && Number(usageResult?.total ?? 0) >= lockedPromo.usageLimit) {
          throw new Error('Лимит использований промокода исчерпан. Обновите корзину.')
        }
        if (lockedPromo.perUserLimit !== null && Number(clientUsageResult?.total ?? 0) >= lockedPromo.perUserLimit) {
          throw new Error('Вы уже использовали этот промокод.')
        }
      }

      const lockedProducts = await tx.select({
        id: products.id,
        price: products.price,
        discountPrice: products.discountPrice,
        onStock: products.onStock,
        priceWh: products.priceWh,
        onStockWh: products.onStockWh,
        isShown: products.isShown,
        isGift: products.isGift,
      }).from(products).where(inArray(products.id, productIds)).for('update')
      const lockedVariants = variantIds.length
        ? await tx.select({
            id: productsVariable.id,
            productId: productsVariable.productId,
            price: productsVariable.price,
            discountPrice: productsVariable.discountPrice,
            qty: productsVariable.qty,
            priceWh: productsVariable.priceWh,
            qtyWh: productsVariable.qtyWh,
            isShown: productsVariable.isShown,
          }).from(productsVariable).where(inArray(productsVariable.id, variantIds)).for('update')
        : []
      const currentProducts = new Map(lockedProducts.map((product) => [product.id, product]))
      const currentVariants = new Map(lockedVariants.map((variant) => [variant.id, variant]))

      if (lockedProducts.length !== productIds.length || lockedVariants.length !== variantIds.length) {
        throw new Error('Один из товаров больше недоступен.')
      }

      for (const requestedItem of requestedItems.values()) {
        const product = currentProducts.get(requestedItem.id)
        const variant = requestedItem.variantId ? currentVariants.get(requestedItem.variantId) : null
        if (!product || product.isShown !== 1 || (requestedItem.variantId && (!variant || variant.productId !== requestedItem.id || variant.isShown !== 1))) {
          throw new Error('Один из товаров больше недоступен.')
        }

        const stock = authenticatedUser?.isB2B
          ? variant ? Number(variant.qtyWh ?? 0) : Number(product.onStockWh ?? 0)
          : variant ? Number(variant.qty ?? 0) : Number(product.onStock ?? 0)
        if (stock < requestedItem.quantity) {
          throw new Error(requestedItem.isGift ? 'Подарок акции больше недоступен.' : 'Один из товаров закончился')
        }
        if (requestedItem.isGift) continue

        const originalPrice = authenticatedUser?.isB2B
          ? Number(variant ? variant.priceWh : product.priceWh)
          : Number(variant ? variant.price : product.price)
        const discountedPrice = authenticatedUser?.isB2B
          ? 0
          : Number(variant ? variant.discountPrice : product.discountPrice)
        const unitPrice = discountedPrice > 0 ? discountedPrice : originalPrice
        const calculated = calculatedItems.find((item) => item.id === requestedItem.id && item.variantId === requestedItem.variantId)
        if (!calculated || !Number.isFinite(unitPrice) || unitPrice <= 0) {
          throw new Error('Один из товаров больше недоступен.')
        }
        if (roundMoney(unitPrice) !== roundMoney(calculated.unitPrice) || roundMoney(originalPrice) !== roundMoney(calculated.originalPrice)) {
          throw new Error('Цена товара изменилась. Обновите корзину и подтвердите заказ ещё раз.')
        }
      }

      if (body.delivery === 'pickup' && body.storeId !== null) {
        const [lockedStore] = await tx.select({ id: stores.id }).from(stores)
          .where(and(eq(stores.id, body.storeId), eq(stores.isShown, 1), eq(stores.delivery, 1))).for('update').limit(1)
        if (!lockedStore) throw new Error('Магазин для самовывоза временно недоступен.')
      }
      if (body.delivery === 'express') {
        const [lockedExpressOption] = await tx.select({ id: menu.id }).from(menu)
          .where(and(eq(menu.id, 39), eq(menu.isShown, 1))).for('update').limit(1)
        if (!lockedExpressOption) throw new Error('Срочная доставка сейчас недоступна.')
      }

      const lockedShippingRows = await tx.select({ name: constants.name, value: constants.ru }).from(constants)
        .where(inArray(constants.name, ['FREE_SHIPPING_VALUE', 'SHIPPING_PRICE'])).for('update')
      const lockedConstantValue = (name: string) => Number(lockedShippingRows.find((row) => row.name === name)?.value ?? 0) || 0
      const currentFreeShippingThreshold = Math.max(0, lockedConstantValue('FREE_SHIPPING_VALUE'))
      const currentShippingPrice = Math.max(0, lockedConstantValue('SHIPPING_PRICE'))
      const currentDeliveryPrice = body.delivery === 'pickup'
        ? 0
        : body.delivery === 'express'
          ? EXPRESS_DELIVERY_PRICE
          : currentFreeShippingThreshold <= 0 || total >= currentFreeShippingThreshold || selectedRoulette?.rewardType === 'free_shipping'
            ? 0
            : Math.round(currentShippingPrice)
      if (currentDeliveryPrice !== deliveryPrice) {
        throw new Error('Тариф доставки изменился. Обновите оформление и проверьте итог.')
      }

      const publicOrderId = await getUniquePublicOrderId(tx)
      if (bonusMinus > 0 && authenticatedClient) {
        const [debitResult] = await tx.update(clients).set({
          bonus: sql`CAST(${clients.bonus} AS DECIMAL(10,2)) - ${bonusMinus}`,
        }).where(and(eq(clients.id, authenticatedClient.id), sql`CAST(${clients.bonus} AS DECIMAL(10,2)) >= ${bonusMinus}`))
        if (!debitResult.affectedRows) throw new Error('Недостаточно бонусов на балансе. Обновите корзину.')
      }
      const [insertedOrder] = await tx.insert(orders).values({
        orderSource: 'web',
        orderId: publicOrderId,
        status: 'new',
        '1C': 0,
        clientId: authenticatedUser?.id ?? 0,
        total: total.toFixed(2),
        deliveryPrice,
        delivery: body.delivery === 'pickup' ? 1 : body.delivery === 'express' ? 3 : 2,
        bonusPlus: bonusPlus.toFixed(2),
        bonusMinus: bonusMinus.toFixed(2),
        payment: body.payment === 'card' ? 3 : body.payment === 'online' ? 4 : 1,
        paySuccess: 0,
        stores: body.delivery === 'pickup' ? body.storeId ?? 0 : 0,
        name: body.customer.name,
        surname: body.customer.surname,
        email: body.customer.email,
        phone,
        message: body.comment,
        contactName: [body.customer.name, body.customer.surname].filter(Boolean).join(' ').slice(0, 128),
        postcode: '',
        address: deliveryAddress,
        street: body.delivery === 'pickup' ? '' : body.customer.street,
        locality: body.delivery === 'pickup' ? '' : body.customer.city,
        town: body.delivery === 'pickup' ? '' : body.customer.city,
        county: '',
        city: body.delivery === 'pickup' ? '' : body.customer.city,
        telephone: phone,
        notes: body.comment,
        ip,
        externalId: '',
        voucher: selectedRoulette?.prizeCode.slice(0, 32) ?? '',
        sorder: 0,
        isb2B: authenticatedUser?.isB2B ? 1 : 0,
        promoId: promo?.id ?? null,
        promoCode: promo?.code ?? selectedRoulette?.prizeCode ?? null,
        promoDiscount: (promo?.discount ?? rouletteDiscount).toFixed(2),
      })

      const orderDbId = Number(insertedOrder.insertId)
      if (selectedRoulette && authenticatedUser) {
        const [spinResult] = await tx.update(rouletteSpins).set({ status: 'redeemed', orderId: orderDbId, usedAt: new Date().toISOString().slice(0, 19).replace('T', ' ') })
          .where(and(eq(rouletteSpins.id, selectedRoulette.id), eq(rouletteSpins.clientId, authenticatedUser.id), eq(rouletteSpins.status, 'active'), isNull(rouletteSpins.orderId), gt(rouletteSpins.expiresAt, new Date().toISOString().slice(0, 19).replace('T', ' '))))
        if (!spinResult.affectedRows) throw new Error('Приз рулетки уже использован. Обновите корзину.')
      }
      await tx.insert(ordersProducts).values(
        finalItems.map((item) => ({
          orderId: orderDbId,
          productId: item.id,
          qty: item.quantity,
          price: item.unitPrice.toFixed(2),
          total: item.rowTotal.toFixed(2),
          options: String(item.variantId ?? 0),
          promoDiscount: item.promoDiscount.toFixed(2),
          giftPromotionId: item.giftPromotionId,
          rouletteGiftId: item.rouletteGiftId,
        })),
      )

      if (promo && authenticatedUser) {
        await tx.insert(promocodeUsages).values({
          promocodeId: promo.id,
          clientId: authenticatedUser.id,
          orderId: orderDbId,
        })
      }

      return { publicOrderId, orderDbId }
    })

    // For online (Paynet) orders, the confirmation email waits for the
    // payment webhook to actually confirm payment — matching legacy, where
    // email_order() is only called from inside the Paynet callback, never
    // at order creation. Cash/card orders (paid on delivery) still get it
    // immediately, as before.
    if (body.payment !== 'online') {
      sendOrderConfirmationEmail(result.orderDbId, body.locale).catch((error) => console.error('Order confirmation email failed', error))
    }

    return NextResponse.json({ orderNumber: result.publicOrderId }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: localizeOrderMessage('Проверьте данные заказа и попробуйте ещё раз.', locale) },
        { status: 400 },
      )
    }

    const message = error instanceof Error ? error.message : ''
    if (
      message === 'Один из товаров закончился' ||
      message === 'У одного из товаров не указана цена' ||
      message === 'Один из товаров больше недоступен.' ||
      message === 'Подарочный товар можно получить только при выполнении условий акции.' ||
      message === 'Подарок акции больше недоступен.' ||
      message === 'Выберите вариант подарка.' ||
      message === 'Подарок рулетки больше недоступен.' ||
      message === 'Недостаточно бонусов на балансе. Обновите корзину.' ||
      message === 'Приз рулетки уже использован. Обновите корзину.' ||
      message === 'Промокод больше недоступен.' ||
      message === 'Лимит использований промокода исчерпан. Обновите корзину.' ||
      message === 'Вы уже использовали этот промокод.' ||
      message === 'Добавьте призовой подарок в корзину.' ||
      message === 'Магазин для самовывоза временно недоступен.' ||
      message === 'Срочная доставка сейчас недоступна.' ||
      message === 'Тариф доставки изменился. Обновите оформление и проверьте итог.' ||
      message === 'Цена товара изменилась. Обновите корзину и подтвердите заказ ещё раз.'
    ) {
      return NextResponse.json({ message: localizeOrderMessage(message, locale) }, { status: 409 })
    }

    console.error('Checkout order creation failed', error)
    return NextResponse.json(
      { message: localizeOrderMessage('Не удалось создать заказ. Попробуйте ещё раз.', locale) },
      { status: 500 },
    )
  }
}
