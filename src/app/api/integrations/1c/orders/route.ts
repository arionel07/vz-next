import { NextResponse } from 'next/server'

import { authorizeOneCRequest, isOneCOrdersEnabled, listPendingOneCOrders } from '@/lib/one-c-orders'

/** GET /api/integrations/1c/orders — pending orders (1C flag = 0), for the 1C pull. */
export async function GET(request: Request) {
  if (!isOneCOrdersEnabled() || !authorizeOneCRequest(request)) {
    return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
  }

  try {
    const orders = await listPendingOneCOrders()
    return NextResponse.json(orders, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('1C order export failed', error)
    return NextResponse.json({ message: 'Internal error.' }, { status: 500 })
  }
}
