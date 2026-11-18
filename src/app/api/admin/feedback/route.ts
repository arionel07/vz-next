import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db'
import { getCurrentAdmin } from '@/lib/admin-auth'
import { ADMIN_FEEDBACK_STATUSES } from '@/lib/admin-feedback-shared'
import { siteFeedback } from '../../../../../drizzle/schema'

const updateSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(ADMIN_FEEDBACK_STATUSES),
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
    const [existing] = await db.select({ id: siteFeedback.id }).from(siteFeedback).where(eq(siteFeedback.id, body.id)).limit(1)
    if (!existing) return NextResponse.json({ message: 'Обращение не найдено.' }, { status: 404 })

    await db.update(siteFeedback)
      .set({ status: body.status, updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ') })
      .where(eq(siteFeedback.id, body.id))

    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ message: 'Проверьте данные обращения.' }, { status: 400 })
    console.error('Admin feedback update failed', error)
    return NextResponse.json({ message: 'Не удалось обновить обращение.' }, { status: 500 })
  }
}
