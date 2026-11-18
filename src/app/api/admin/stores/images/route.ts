import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { db } from '@/db'
import { getCurrentAdmin } from '@/lib/admin-auth'
import { storesImg } from '../../../../../../drizzle/schema'

function validSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  return !origin || origin === new URL(request.url).origin
}

export async function DELETE(request: Request) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: 'Запрос отклонён.' }, { status: 403 })
  if (!await getCurrentAdmin()) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })
  const params = new URL(request.url).searchParams
  const id = Number(params.get('id'))
  const storeId = Number(params.get('storeId'))
  if (!Number.isInteger(id) || id < 1 || !Number.isInteger(storeId) || storeId < 1) {
    return NextResponse.json({ message: 'Фотография не найдена.' }, { status: 400 })
  }
  const [image] = await db.select({ id: storesImg.id }).from(storesImg)
    .where(and(eq(storesImg.id, id), eq(storesImg.storesId, storeId))).limit(1)
  if (!image) return NextResponse.json({ message: 'Фотография не найдена.' }, { status: 404 })
  await db.delete(storesImg).where(and(eq(storesImg.id, id), eq(storesImg.storesId, storeId)))
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}
