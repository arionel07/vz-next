import { and, eq } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db'
import { AUTH_SESSION_COOKIE, getUserBySessionToken } from '@/lib/auth'
import { products, productsVariable } from '../../../../../drizzle/schema'

const requestSchema = z.object({
  id: z.number().int().positive(),
  variantId: z.number().int().positive().nullable().optional(),
  quantity: z.number().int().min(1).max(99),
})

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json())
    const cookieStore = await cookies()
    const user = await getUserBySessionToken(cookieStore.get(AUTH_SESSION_COOKIE)?.value)
    const [product] = await db.select({
      id: products.id,
      price: products.price,
      discountPrice: products.discountPrice,
      onStock: products.onStock,
      priceWh: products.priceWh,
      onStockWh: products.onStockWh,
      isGift: products.isGift,
    }).from(products).where(and(eq(products.id, body.id), eq(products.isShown, 1))).limit(1)

    if (!product) {
      return NextResponse.json({ message: 'Товар больше недоступен.' }, { status: 409 })
    }
    if (product.isGift === 1) {
      return NextResponse.json({ message: 'Этот подарок можно получить только при выполнении условий акции.' }, { status: 409 })
    }

    let unitPrice: number | null
    let originalPrice: number | null
    let maxQuantity: number | null
    if (body.variantId) {
      const [variant] = await db.select({
        id: productsVariable.id,
        productId: productsVariable.productId,
        price: productsVariable.price,
        discountPrice: productsVariable.discountPrice,
        qty: productsVariable.qty,
        priceWh: productsVariable.priceWh,
        qtyWh: productsVariable.qtyWh,
        isShown: productsVariable.isShown,
      }).from(productsVariable).where(eq(productsVariable.id, body.variantId)).limit(1)

      if (!variant || variant.productId !== product.id || variant.isShown !== 1) {
        return NextResponse.json({ message: 'Выбранный вариант товара больше недоступен.' }, { status: 409 })
      }

      originalPrice = user?.isB2B ? Number(variant.priceWh) : Number(variant.price)
      unitPrice = user?.isB2B
        ? originalPrice
        : Number(variant.discountPrice) > 0 ? Number(variant.discountPrice) : originalPrice
      maxQuantity = Number(user?.isB2B ? variant.qtyWh ?? 0 : variant.qty ?? 0)
    } else {
      originalPrice = user?.isB2B ? Number(product.priceWh) : Number(product.price)
      unitPrice = user?.isB2B
        ? originalPrice
        : Number(product.discountPrice) > 0 ? Number(product.discountPrice) : originalPrice
      maxQuantity = user?.isB2B ? Number(product.onStockWh ?? 0) : Number(product.onStock ?? 0)
    }

    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      return NextResponse.json({ message: 'У товара пока не указана цена.' }, { status: 409 })
    }
    if (maxQuantity !== null && body.quantity > maxQuantity) {
      return NextResponse.json({ message: maxQuantity <= 0 ? 'Товара сейчас нет в наличии.' : `Доступно только ${maxQuantity} шт.` }, { status: 409 })
    }

    return NextResponse.json({ unitPrice, originalPrice, maxQuantity })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Некорректные данные товара.' }, { status: 400 })
    }

    console.error('Cart item validation failed', error)
    return NextResponse.json({ message: 'Не удалось проверить наличие товара.' }, { status: 500 })
  }
}
