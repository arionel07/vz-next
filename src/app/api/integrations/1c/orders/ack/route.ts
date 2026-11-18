import { NextResponse } from 'next/server'
import { z } from 'zod'

import { acknowledgeOneCOrder, authorizeOneCRequest, isOneCOrdersEnabled } from '@/lib/one-c-orders'

const bodySchema = z.object({ id: z.coerce.number().int().positive() })

/**
 * POST /api/integrations/1c/orders/ack — marks an order as received by 1C
 * (sets the `1C` flag to 1) and returns it. Idempotent: acknowledging an
 * already-acknowledged order id still succeeds and returns the same
 * payload, so a 1C-side retry after a timeout is safe.
 */
export async function POST(request: Request) {
  if (!isOneCOrdersEnabled() || !authorizeOneCRequest(request)) {
    return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
  }

  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ message: 'id не указан.' }, { status: 400 })
  }

  try {
    const order = await acknowledgeOneCOrder(body.id)
    if (!order) return NextResponse.json({ message: 'Заказ не найден.' }, { status: 404 })
    return NextResponse.json(order, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('1C order ack failed', error)
    return NextResponse.json({ message: 'Internal error.' }, { status: 500 })
  }
}
