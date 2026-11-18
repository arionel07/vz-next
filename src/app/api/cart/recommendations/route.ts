import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { AUTH_SESSION_COOKIE, getUserBySessionToken } from '@/lib/auth'
import { getCoPurchasedProducts } from '@/lib/catalog'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ids = (searchParams.get('ids') ?? '')
    .split(',')
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0)
  const locale = searchParams.get('locale') === 'ro' ? 'ro' : 'ru'

  if (!ids.length) {
    return NextResponse.json({ products: [] }, { headers: { 'Cache-Control': 'no-store' } })
  }

  const cookieStore = await cookies()
  const user = await getUserBySessionToken(cookieStore.get(AUTH_SESSION_COOKIE)?.value)
  const products = await getCoPurchasedProducts(ids, { exclude: ids, limit: 8, isB2B: user?.isB2B ?? false, locale })

  return NextResponse.json({ products }, { headers: { 'Cache-Control': 'no-store' } })
}
