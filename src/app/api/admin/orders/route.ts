import { and, eq, inArray } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db'
import { getCurrentAdmin } from '@/lib/admin-auth'
import { constants, orders, ordersProducts, products, productsVariable, stores } from '../../../../../drizzle/schema'

const requestSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(1).max(255),
    surname: z.string().trim().max(255).default(''),
    phone: z.string().trim().min(5).max(255),
    email: z.union([z.string().trim().email().max(255), z.literal('')]).default(''),
    city: z.string().trim().max(255).default(''),
    street: z.string().trim().max(128).default(''),
    house: z.string().trim().max(64).default(''),
  }),
  delivery: z.enum(['pickup', 'delivery']),
  storeId: z.number().int().positive().nullable().default(null),
  payment: z.enum(['cash', 'card', 'later']),
  notes: z.string().trim().max(4000).default(''),
  items: z.array(z.object({
    id: z.number().int().positive(),
    variantId: z.number().int().positive().nullable().optional(),
    quantity: z.number().int().min(1).max(99),
  })).min(1).max(100),
})

function validSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  return !origin || origin === new URL(request.url).origin
}

function normalizePhone(value: string) {
  const digits = value.trim().replace(/\D/g, '')
  return `${value.trim().startsWith('+') ? '+' : ''}${digits}`
}

function positiveAmount(value: unknown) {
  const amount = Number.parseFloat(String(value ?? '').replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(amount) && amount > 0 ? amount : null
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

async function getUniquePublicOrderId(tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = Math.floor(10000 + Math.random() * 90000)
    const [existing] = await tx.select({ id: orders.id }).from(orders).where(eq(orders.orderId, candidate)).limit(1)
    if (!existing) return candidate
  }
  throw new Error('Не удалось подобрать номер заказа. Попробуйте ещё раз.')
}

class OrderCreateConflict extends Error {}

export async function POST(request: Request) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: 'Запрос отклонён.' }, { status: 403 })
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })

  try {
    const body = requestSchema.parse(await request.json())
    const phone = normalizePhone(body.customer.phone)
    if (phone.replace(/\D/g, '').length < 5 || phone.length > 32) {
      return NextResponse.json({ message: 'Введите корректный номер телефона.' }, { status: 400 })
    }
    if (body.delivery === 'delivery' && (!body.customer.city || !body.customer.street || !body.customer.house)) {
      return NextResponse.json({ message: 'Укажите город, улицу и дом для курьерской доставки.' }, { status: 400 })
    }
    if (body.delivery === 'pickup' && !body.storeId) {
      return NextResponse.json({ message: 'Выберите магазин самовывоза.' }, { status: 400 })
    }

    const requestedItems = new Map<string, { id: number; variantId: number | null; quantity: number }>()
    for (const item of body.items) {
      const variantId = item.variantId ?? null
      const key = `${item.id}:${variantId ?? 0}`
      const existing = requestedItems.get(key)
      const quantity = (existing?.quantity ?? 0) + item.quantity
      if (quantity > 99) return NextResponse.json({ message: 'Количество одной позиции не может быть больше 99.' }, { status: 400 })
      requestedItems.set(key, { id: item.id, variantId, quantity })
    }

    const result = await db.transaction(async (tx) => {
      const productIds = [...new Set([...requestedItems.values()].map((item) => item.id))]
      const productRows = await tx.select({
        id: products.id,
        price: products.price,
        discountPrice: products.discountPrice,
        isShown: products.isShown,
        isGift: products.isGift,
      }).from(products).where(inArray(products.id, productIds)).for('update')
      if (productRows.length !== productIds.length || productRows.some((product) => product.isShown !== 1 || product.isGift === 1)) {
        throw new OrderCreateConflict('Один из товаров больше недоступен.')
      }

      const variantIds = [...new Set([...requestedItems.values()].flatMap((item) => item.variantId ? [item.variantId] : []))]
      const variantRows = variantIds.length ? await tx.select({
        id: productsVariable.id,
        productId: productsVariable.productId,
        price: productsVariable.price,
        discountPrice: productsVariable.discountPrice,
        isShown: productsVariable.isShown,
      }).from(productsVariable).where(inArray(productsVariable.id, variantIds)).for('update') : []
      const productsById = new Map(productRows.map((product) => [product.id, product]))
      const variantsById = new Map(variantRows.map((variant) => [variant.id, variant]))
      const lineItems = [...requestedItems.values()].map((item) => {
        const product = productsById.get(item.id)
        if (!product) throw new Error('Один из товаров больше недоступен.')
        const variant = item.variantId ? variantsById.get(item.variantId) : null
        if (item.variantId && (!variant || variant.productId !== item.id || variant.isShown !== 1)) {
          throw new OrderCreateConflict('Один из вариантов товара больше недоступен.')
        }
        const price = variant
          ? positiveAmount(variant.discountPrice) ?? positiveAmount(variant.price)
          : positiveAmount(product.discountPrice) ?? positiveAmount(product.price)
        if (!price) throw new OrderCreateConflict('У одного из товаров не указана цена.')
        return { ...item, price, total: roundMoney(price * item.quantity) }
      })
      const subtotal = roundMoney(lineItems.reduce((sum, item) => sum + item.total, 0))

      let pickupStore: { id: number; title: string | null } | undefined
      if (body.delivery === 'pickup' && body.storeId) {
        const [store] = await tx.select({ id: stores.id, title: stores.titleRu }).from(stores)
          .where(and(eq(stores.id, body.storeId), eq(stores.isShown, 1), eq(stores.delivery, 1)))
          .for('update').limit(1)
        if (!store) throw new OrderCreateConflict('Магазин самовывоза больше недоступен.')
        pickupStore = store
      }

      const shippingRows = await tx.select({ name: constants.name, value: constants.ru }).from(constants)
        .where(inArray(constants.name, ['FREE_SHIPPING_VALUE', 'SHIPPING_PRICE']))
        .for('update')
      const settingValue = (name: string) => positiveAmount(shippingRows.find((row) => row.name === name)?.value) ?? 0
      const threshold = Math.max(0, settingValue('FREE_SHIPPING_VALUE'))
      const shippingPrice = Math.max(0, settingValue('SHIPPING_PRICE'))
      const deliveryPrice = body.delivery === 'pickup' || threshold <= 0 || subtotal >= threshold ? 0 : Math.round(shippingPrice)
      const orderNumber = await getUniquePublicOrderId(tx)
      const deliveryAddress = body.delivery === 'pickup'
        ? pickupStore?.title ?? 'Самовывоз'
        : `${body.customer.city}, ${body.customer.street}, ${body.customer.house}`.slice(0, 255)
      const [inserted] = await tx.insert(orders).values({
        orderSource: 'admin',
        orderId: orderNumber,
        status: 'new',
        '1C': 0,
        clientId: 0,
        total: roundMoney(subtotal + deliveryPrice).toFixed(2),
        deliveryPrice,
        delivery: body.delivery === 'pickup' ? 1 : 2,
        bonusPlus: '0',
        bonusMinus: '0',
        payment: body.payment === 'cash' ? 1 : body.payment === 'card' ? 3 : 0,
        paySuccess: 0,
        stores: pickupStore?.id ?? 0,
        name: body.customer.name,
        surname: body.customer.surname || null,
        email: body.customer.email,
        phone,
        message: body.notes,
        contactName: [body.customer.name, body.customer.surname].filter(Boolean).join(' ').slice(0, 128),
        postcode: '',
        address: deliveryAddress,
        street: body.delivery === 'delivery' ? body.customer.street : '',
        locality: body.delivery === 'delivery' ? body.customer.city : '',
        town: body.delivery === 'delivery' ? body.customer.city : '',
        county: '',
        city: body.delivery === 'delivery' ? body.customer.city : '',
        telephone: phone,
        notes: body.notes,
        ip: (request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || '127.0.0.1').slice(0, 128),
        externalId: '',
        voucher: '',
        sorder: 0,
        isb2B: 0,
        promoDiscount: '0.00',
      })
      const orderDbId = Number(inserted.insertId)
      await tx.insert(ordersProducts).values(lineItems.map((item) => ({
        orderId: orderDbId,
        productId: item.id,
        qty: item.quantity,
        price: item.price.toFixed(2),
        total: item.total.toFixed(2),
        options: String(item.variantId ?? 0),
        promoDiscount: '0.00',
      })))
      return { id: orderDbId, orderNumber }
    })

    return NextResponse.json(result, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ message: 'Проверьте данные заказа и состав корзины.' }, { status: 400 })
    if (error instanceof OrderCreateConflict) return NextResponse.json({ message: error.message }, { status: 409, headers: { 'Cache-Control': 'no-store' } })
    console.error('Failed to create admin order', error)
    return NextResponse.json({ message: 'Не удалось создать заказ. Попробуйте ещё раз.' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}
