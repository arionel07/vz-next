import { and, asc, eq, gt, inArray, isNull } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db'
import { AUTH_SESSION_COOKIE, getUserBySessionToken } from '@/lib/auth'
import { calculateGiftItems } from '@/lib/gift-promotions'
import { brands, gifts as giftRecords, products, productsImg, productsVariable, rouletteSettings, rouletteSpins } from '../../../../drizzle/schema'

const requestSchema = z.object({
  items: z.array(z.object({
    id: z.number().int().positive(),
    variantId: z.number().int().positive().nullable().optional(),
    quantity: z.number().int().min(1).max(99),
  })).max(100),
  giftSelections: z.array(z.object({
    giftPromotionId: z.number().int().positive().nullable().optional(),
    rouletteGiftId: z.number().int().positive().nullable().optional(),
    variantId: z.number().int().positive().nullable(),
  })).max(100).default([]),
  locale: z.enum(['ru', 'ro']).default('ru'),
  discountChoice: z.enum(['promo', 'roulette', 'none']).default('promo'),
})

function giftVariantLabel(variant: { titleRu: string | null; titleRo: string; volumeVar: string; colorRu: string; colorRo: string }, locale: 'ru' | 'ro') {
  return String((locale === 'ro' ? variant.titleRo || variant.volumeVar || variant.colorRo : variant.titleRu || variant.volumeVar || variant.colorRu) ?? '').trim()
}

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json())
    const giftSelections = new Map(body.giftSelections.flatMap((selection) =>
      selection.giftPromotionId ? [[selection.giftPromotionId, selection.variantId] as const] : [],
    ))
    const promotionGifts = await calculateGiftItems(body.items, body.locale, Object.fromEntries(giftSelections))
    let rouletteGift: {
      id: number
      variantId: number | null
      variantLabel: string | null
      giftVariantOptions: Array<{ id: number; label: string; stock: number }>
      giftVariantRequired: boolean
      title: string
      brand: string
      price: 1
      image: string | null
      isGift: true
      rouletteGiftId: number
      giftPromotionTitle: string
      quantity: 1
    } | null = null

    if (body.discountChoice === 'roulette' && body.items.length) {
      const cookieStore = await cookies()
      const user = await getUserBySessionToken(cookieStore.get(AUTH_SESSION_COOKIE)?.value)
      if (user && !user.isB2B) {
        const [settings] = await db.select({ isEnabled: rouletteSettings.isEnabled, isVisible: rouletteSettings.isVisible }).from(rouletteSettings).limit(1)
        const [spin] = await db.select({
          id: rouletteSpins.id,
          rewardType: rouletteSpins.rewardTypeSnapshot,
          rewardPayload: rouletteSpins.rewardPayloadSnapshot,
          title: body.locale === 'ro' ? rouletteSpins.titleRoSnapshot : rouletteSpins.titleRuSnapshot,
        }).from(rouletteSpins).where(and(
          eq(rouletteSpins.clientId, user.id), eq(rouletteSpins.status, 'active'), isNull(rouletteSpins.orderId),
          gt(rouletteSpins.expiresAt, new Date().toISOString().slice(0, 19).replace('T', ' ')),
        )).limit(1)

        const giftId = Number(spin?.rewardPayload)
        if (settings?.isEnabled === 1 && settings.isVisible === 1 && spin?.rewardType === 'gift' && Number.isInteger(giftId) && giftId > 0) {
          const [gift] = await db.select({ id: giftRecords.id, title: body.locale === 'ro' ? giftRecords.titleRo : giftRecords.titleRu, productId: giftRecords.productId, variantId: giftRecords.variantId })
            .from(giftRecords).where(and(eq(giftRecords.id, giftId), eq(giftRecords.isEnabled, 1), eq(giftRecords.showOnSite, 1))).limit(1)
          const [product] = gift?.productId ? await db.select({
            id: products.id,
            title: body.locale === 'ro' ? products.titleRo : products.titleRu,
            brand: brands.title,
            isShown: products.isShown,
            isGift: products.isGift,
            onStock: products.onStock,
          }).from(products).leftJoin(brands, eq(products.brandId, brands.id))
            .where(eq(products.id, gift.productId)).limit(1) : []
          const variantRows = gift?.productId ? await db.select({
            id: productsVariable.id,
            productId: productsVariable.productId,
            titleRu: productsVariable.titleRu,
            titleRo: productsVariable.titleRo,
            volumeVar: productsVariable.volumeVar,
            colorRu: productsVariable.colorRu,
            colorRo: productsVariable.colorRo,
            qty: productsVariable.qty,
            isShown: productsVariable.isShown,
          }).from(productsVariable).where(and(eq(productsVariable.productId, gift.productId), eq(productsVariable.isShown, 1), gt(productsVariable.qty, 0))) : []
          const availableVariants = variantRows.map((variant) => ({ id: variant.id, label: giftVariantLabel(variant, body.locale) || String(variant.id), stock: Number(variant.qty ?? 0) }))
          const rouletteSelection = body.giftSelections.find((selection) => selection.rouletteGiftId === gift?.id)
          let selectedVariant = gift?.variantId ? availableVariants.find((variant) => variant.id === gift.variantId) : undefined
          if (!gift?.variantId && availableVariants.length) {
            selectedVariant = availableVariants.find((variant) => variant.id === rouletteSelection?.variantId)
          }
          const hasProductStock = Number(product?.onStock ?? 0) > 0
          const hasStock = gift?.variantId
            ? Boolean(selectedVariant)
            : availableVariants.length ? Boolean(selectedVariant) || availableVariants.length > 0 : hasProductStock
          const [image] = product ? await db.select({ image: productsImg.img }).from(productsImg)
            .where(and(eq(productsImg.productId, product.id), eq(productsImg.isShown, 1)))
            .orderBy(asc(productsImg.sorder), asc(productsImg.id)).limit(1) : []
          const selectedVariantRow = selectedVariant ? variantRows.find((variant) => variant.id === selectedVariant?.id) : null

          if (gift && product?.isShown === 1 && product.isGift === 1 && hasStock) {
            rouletteGift = {
              id: product.id,
              variantId: selectedVariant?.id ?? null,
              variantLabel: selectedVariantRow ? giftVariantLabel(selectedVariantRow, body.locale) || null : null,
              giftVariantOptions: gift.variantId ? [] : availableVariants,
              giftVariantRequired: Boolean(!gift.variantId && availableVariants.length && !selectedVariant),
              title: product.title ?? gift.title,
              brand: product.brand ?? 'VIZAJE-NICA',
              price: 1,
              image: image?.image ?? null,
              isGift: true,
              rouletteGiftId: gift.id,
              giftPromotionTitle: spin.title,
              quantity: 1,
            }
          }
        }
      }
    }
    return NextResponse.json({ gifts: promotionGifts, rouletteGift }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Некорректные данные корзины.' }, { status: 400 })
    }

    console.error('Gift promotion calculation failed', error)
    return NextResponse.json({ message: 'Не удалось проверить подарочную акцию.' }, { status: 500 })
  }
}
