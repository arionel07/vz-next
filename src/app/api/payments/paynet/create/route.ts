import { randomUUID } from 'node:crypto'

import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db'
import { buildPaynetPaymentForm, isPaynetEnabled } from '@/lib/paynet-client'
import { orders, ordersProducts, products } from '../../../../../../drizzle/schema'

const bodySchema = z.object({
  orderNumber: z.coerce.number().int().positive(),
  locale: z.enum(['ru', 'ro']).default('ru'),
})

/**
 * Builds the Paynet redirect form for an order already created via
 * POST /api/orders with payment: 'online'. Kept as a separate step (its
 * own route, its own externalId) rather than folded into order creation,
 * matching legacy's separation between the checkout order and Paynet.php.
 */
export async function POST(request: Request) {
  if (!isPaynetEnabled()) {
    return NextResponse.json({ message: 'Онлайн-оплата временно недоступна.' }, { status: 503 })
  }

  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ message: 'Некорректный запрос.' }, { status: 400 })
  }

  const [order] = await db.select().from(orders).where(eq(orders.orderId, body.orderNumber)).limit(1)
  if (!order) return NextResponse.json({ message: 'Заказ не найден.' }, { status: 404 })
  if (order.payment !== 4) return NextResponse.json({ message: 'Этот заказ не предполагает онлайн-оплату.' }, { status: 409 })
  if (order.paySuccess === 1) return NextResponse.json({ message: 'Заказ уже оплачен.' }, { status: 409 })

  const lineItems = await db
    .select({ qty: ordersProducts.qty, price: ordersProducts.price, sku: products.sku, title: body.locale === 'ro' ? products.titleRo : products.titleRu })
    .from(ordersProducts)
    .leftJoin(products, eq(ordersProducts.productId, products.id))
    .where(eq(ordersProducts.orderId, order.id))

  if (!lineItems.length) return NextResponse.json({ message: 'В заказе нет товаров.' }, { status: 409 })

  let amountCents = 0
  const productLines = lineItems.map((item, index) => {
    const unitPrice = Number(item.price ?? 0)
    const qty = item.qty ?? 0
    amountCents += Math.round(unitPrice * qty * 100)
    return {
      lineNo: index,
      code: item.sku ?? '',
      barcode: item.sku ?? '',
      name: item.title ?? '',
      description: item.title ?? '',
      quantity: qty * 100,
      unitPrice: Math.round(unitPrice * 100),
    }
  })

  if (order.deliveryPrice > 0) {
    amountCents += Math.round(order.deliveryPrice * 100)
    productLines.push({
      lineNo: productLines.length,
      code: 'delivery',
      barcode: 'delivery',
      name: 'Delivery',
      description: 'Delivery',
      quantity: 100,
      unitPrice: Math.round(order.deliveryPrice * 100),
    })
  }

  // Timestamp-based + random suffix: unique enough for this merchant's
  // volume, matching legacy's round(microtime(true) * 1000) in spirit
  // without relying on microsecond precision alone.
  const externalId = `${Date.now()}${randomUUID().replace(/-/g, '').slice(0, 6)}`
  await db.update(orders).set({ externalId }).where(eq(orders.id, order.id))

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '')
  const localePath = body.locale === 'ro' ? 'ro' : 'ru'

  const formHtml = buildPaynetPaymentForm({
    externalId,
    linkSuccess: `${baseUrl}/${localePath}/order-success?order=${encodeURIComponent(String(order.orderId))}`,
    linkCancel: `${baseUrl}/${localePath}/error?order=${encodeURIComponent(String(order.orderId))}`,
    lang: body.locale,
    serviceName: 'Vizaje-Nica',
    serviceDescription: `Comanda Vizaje-Nica #${order.orderId}`,
    amountCents,
    products: productLines,
    customer: {
      code: order.email,
      name: order.name,
      surname: order.surname ?? '',
      address: order.address || 'mun. Chișinău',
      phone: order.phone,
    },
  })

  return NextResponse.json({ formHtml }, { headers: { 'Cache-Control': 'no-store' } })
}
