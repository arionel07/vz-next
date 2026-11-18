import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db'
import { getCurrentAdmin } from '@/lib/admin-auth'
import { constants } from '../../../../../drizzle/schema'

const updateSchema = z.object({
  id: z.number().int().positive(),
  ru: z.string().max(200000),
  ro: z.string().max(200000),
})

function validSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  return !origin || origin === new URL(request.url).origin
}

export async function PATCH(request: Request) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: 'Запрос отклонён.' }, { status: 403 })
  if (!await getCurrentAdmin()) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })

  try {
    const body = updateSchema.parse(await request.json())
    const [existing] = await db.select({ id: constants.id }).from(constants).where(eq(constants.id, body.id)).limit(1)
    if (!existing) return NextResponse.json({ message: 'Настройка не найдена.' }, { status: 404 })

    await db.update(constants).set({ ru: body.ru, ro: body.ro }).where(eq(constants.id, body.id))
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ message: 'Проверьте русский и румынский тексты.' }, { status: 400 })
    console.error('Admin setting update failed', error)
    return NextResponse.json({ message: 'Не удалось сохранить настройку.' }, { status: 500 })
  }
}
