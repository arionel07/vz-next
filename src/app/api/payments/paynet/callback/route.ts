import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { db } from '@/db'
import { getPaynetPaymentStatus, isPaynetEnabled, isPaynetPaymentCompleted } from '@/lib/paynet-client'
import { sendOrderConfirmationEmail } from '@/lib/order-delivery'
import { orders, paynetLogs } from '../../../../../../drizzle/schema'

async function logPaynetEvent(orderRef: string, message: string, response: unknown = {}) {
  try {
    await db.insert(paynetLogs).values({
      orderId: orderRef,
      message: message.slice(0, 255),
      response: JSON.stringify(response),
      date: new Date().toISOString().slice(0, 19).replace('T', ' '),
    })
  } catch (error) {
    console.error('Failed to write paynet_logs row', error)
  }
}

type PaynetWebhookBody = {
  EventType?: string
  Payment?: { ExternalId?: string | number }
}

/**
 * Server-to-server webhook from Paynet — the equivalent of legacy's
 * Paynet::paynet_callback() / _paynet_order(). Always returns 200 quickly;
 * Paynet does not need (and legacy never gave it) anything more specific.
 * Every event is logged to paynet_logs, same table legacy used, for audit.
 */
export async function POST(request: Request) {
  if (!isPaynetEnabled()) return NextResponse.json({ ok: true })

  const rawBody = await request.text()
  let payload: PaynetWebhookBody | null = null
  try {
    payload = JSON.parse(rawBody)
  } catch {
    await logPaynetEvent('unknown', 'invalid callback payload (not JSON)')
    return NextResponse.json({ ok: true })
  }

  const externalId = payload?.Payment?.ExternalId !== undefined ? String(payload.Payment.ExternalId) : ''
  if (!externalId || !payload?.EventType) {
    await logPaynetEvent('unknown', 'invalid callback payload (missing EventType/ExternalId)')
    return NextResponse.json({ ok: true })
  }

  const [order] = await db.select().from(orders).where(eq(orders.externalId, externalId)).limit(1)
  if (!order) {
    await logPaynetEvent(externalId, 'order not found for this externalId')
    return NextResponse.json({ ok: true })
  }

  if (payload.EventType !== 'PAID') {
    await logPaynetEvent(externalId, `event type ${payload.EventType}, no action`)
    return NextResponse.json({ ok: true })
  }

  // Never trust the webhook body alone — re-query Paynet for the
  // authoritative status, same as legacy's PaymentGet call here.
  const statusResult = await getPaynetPaymentStatus(externalId)
  if (!statusResult.ok) {
    await logPaynetEvent(externalId, `PaymentGet failed: ${statusResult.error}`)
    return NextResponse.json({ ok: true })
  }

  if (!isPaynetPaymentCompleted(statusResult.status)) {
    await logPaynetEvent(externalId, `payment status not complete (${statusResult.status}), waiting`)
    return NextResponse.json({ ok: true })
  }

  if (order.paySuccess === 1) {
    await logPaynetEvent(externalId, 'already marked paid, ignoring duplicate callback')
    return NextResponse.json({ ok: true })
  }

  await db.update(orders).set({ paySuccess: 1 }).where(eq(orders.id, order.id))
  await logPaynetEvent(externalId, 'payment confirmed, order marked paid')

  // `orders` has no stored locale column, so the post-payment confirmation
  // email always uses the ru template here — unlike the cash/card path in
  // api/orders/route.ts, which has the locale from the live request body.
  // Known limitation, not fixed here: would need a locale column on orders.
  sendOrderConfirmationEmail(order.id, 'ru').catch((error) => console.error('Order confirmation email failed after Paynet payment', error))

  return NextResponse.json({ ok: true })
}
