import { NextResponse } from 'next/server'

import { getProductDescription } from '@/lib/catalog'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const productId = Number(id)
  if (!Number.isInteger(productId) || productId < 1) {
    return NextResponse.json({ error: 'Invalid product id' }, { status: 400 })
  }

  const locale = new URL(request.url).searchParams.get('locale') === 'ro' ? 'ro' : 'ru'
  const description = await getProductDescription(productId, locale)
  if (!description) return NextResponse.json({ description: null })

  return NextResponse.json({ description }, {
    headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600' },
  })
}
