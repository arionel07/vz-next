import { timingSafeEqual } from 'node:crypto'

import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { orders, ordersProducts, products, productsVariable } from '../../drizzle/schema'

/**
 * Order export/ack for 1C, re-implementing legacy's Api::order_json() /
 * Api::order_check() (application/controllers/Api.php) against the Next
 * schema.
 *
 * Deliberately NOT reusing legacy's authentication: legacy checks a
 * username/password pair hardcoded in plain text directly in the PHP
 * source. That is not carried forward. This endpoint instead requires a
 * bearer token from ONE_C_ORDERS_TOKEN (server-side env var, never
 * committed) — unset means the endpoints always reject, fail-closed by
 * default, same pattern as WORKAPP_ENABLED.
 *
 * Known gaps carried over from legacy on purpose, not fixed here (see
 * docs/workapp-1c-observed-contract.md §2 "Что обязательно подтвердить
 * у 1С" — these are 1C-contract questions, not bugs this code can decide
 * unilaterally):
 *   - no claim/lease: two concurrent pulls can both receive the same
 *     pending order before either acknowledges it;
 *   - no retry/backoff contract for 1C's own calls;
 *   - order.status is passed through as the vz-next enum value
 *     ('new'/'progress'/'finished'/'canceled'), not legacy's original
 *     numeric status — 1C needs to be told the new enum, there is no
 *     numeric compatibility shim here.
 * One thing IS deliberately decided here, closing an explicit open
 * question from the audit: acknowledging an already-acknowledged order is
 * idempotent — it re-sets the flag and returns the same payload again,
 * rather than erroring, so a retried ack from 1C after a timeout is safe.
 */

const PAYMENT_NAME: Record<number, string> = { 1: 'Cash', 3: 'Card' }

export function isOneCOrdersEnabled() {
  return Boolean(process.env.ONE_C_ORDERS_TOKEN)
}

export function authorizeOneCRequest(request: Request) {
  const expected = process.env.ONE_C_ORDERS_TOKEN
  if (!expected) return false

  const header = request.headers.get('authorization') ?? ''
  const match = header.match(/^Bearer (.+)$/)
  if (!match) return false

  const provided = match[1]
  const expectedBuffer = Buffer.from(expected)
  const providedBuffer = Buffer.from(provided)
  if (expectedBuffer.length !== providedBuffer.length) return false
  return timingSafeEqual(expectedBuffer, providedBuffer)
}

export type OneCOrderProduct = {
  id: number
  quantity: number
  price: string
  options: string
  sku: string
  variable: string
}

export type OneCOrder = {
  id: number
  status: string
  total: string
  delivery_price: number
  name: string
  surname: string
  payment_name: string
  payment: number
  email: string
  phone: string
  address: string
  added: string | null
  products: OneCOrderProduct[]
}

type OrderRow = typeof orders.$inferSelect

async function buildOrderPayload(order: OrderRow): Promise<OneCOrder> {
  const lineItems = await db
    .select({
      productId: ordersProducts.productId,
      qty: ordersProducts.qty,
      price: ordersProducts.price,
      options: ordersProducts.options,
      sku: products.sku,
    })
    .from(ordersProducts)
    .leftJoin(products, eq(ordersProducts.productId, products.id))
    .where(eq(ordersProducts.orderId, order.id))

  const variantIds = lineItems.map((item) => Number(item.options)).filter((id) => Number.isInteger(id) && id > 0)
  const variantSkuById = new Map<number, string>()
  if (variantIds.length) {
    const variants = await db.select({ id: productsVariable.id, sku: productsVariable.sku }).from(productsVariable)
    for (const variant of variants) {
      if (variantIds.includes(variant.id) && variant.sku) variantSkuById.set(variant.id, variant.sku)
    }
  }

  const productsPayload: OneCOrderProduct[] = lineItems.map((item) => {
    const optionId = Number(item.options)
    return {
      id: item.productId ?? 0,
      quantity: item.qty ?? 0,
      price: item.price ?? '0',
      options: item.options ?? '0',
      sku: item.sku ?? '',
      variable: optionId > 0 ? variantSkuById.get(optionId) ?? '' : '',
    }
  })

  const payment = order.payment ?? 0
  return {
    id: order.orderId ?? order.id,
    status: order.status,
    total: order.total,
    delivery_price: order.deliveryPrice,
    name: order.name,
    surname: order.surname ?? '',
    payment_name: PAYMENT_NAME[payment] ?? 'Unknown',
    payment,
    email: order.email,
    phone: order.phone,
    address: order.address,
    added: order.added,
    products: productsPayload,
  }
}

/** Orders where `1C` = 0, same selection as legacy's order_json(). */
export async function listPendingOneCOrders(): Promise<OneCOrder[]> {
  const pendingOrders = await db.select().from(orders).where(eq(orders['1C'], 0))
  return Promise.all(pendingOrders.map(buildOrderPayload))
}

/**
 * Finds the order by its public order_id, sets `1C` = 1 (idempotently —
 * see module docstring), and returns the same payload shape as the list
 * endpoint. Returns null if no such order exists.
 */
export async function acknowledgeOneCOrder(externalOrderId: number): Promise<OneCOrder | null> {
  const [order] = await db.select().from(orders).where(eq(orders.orderId, externalOrderId)).limit(1)
  if (!order) return null

  await db.update(orders).set({ '1C': 1 }).where(eq(orders.id, order.id))
  return buildOrderPayload(order)
}
