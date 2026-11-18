import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db'
import { getCurrentAdmin } from '@/lib/admin-auth'
import { clients } from '../../../../../../drizzle/schema'

const updateSchema = z.object({
  name: z.string().trim().min(1, 'Укажите имя клиента.').max(255),
  surname: z.string().trim().max(256).default(''),
  email: z.union([z.string().trim().email('Проверьте email.').max(255), z.literal('')]).default(''),
  phone: z.string().trim().max(256).default(''),
  address: z.string().trim().max(254).default(''),
  city: z.string().trim().max(64).default(''),
  house: z.string().trim().max(64).default(''),
  apartament: z.string().trim().max(64).default(''),
  porch: z.string().trim().max(64).default(''),
  active: z.number().int().min(0).max(1),
  isb2B: z.number().int().min(0).max(1),
  isCreator: z.number().int().min(0).max(1),
})

function validSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  return !origin || origin === new URL(request.url).origin
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: 'Запрос отклонён.' }, { status: 403 })
  if (!await getCurrentAdmin()) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })

  const { id: rawId } = await params
  const id = Number(rawId)
  if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ message: 'Клиент не найден.' }, { status: 400 })

  const parsed = updateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? 'Проверьте данные клиента.' }, { status: 400 })
  if (parsed.data.phone && parsed.data.phone.replace(/\D/g, '').length < 5) {
    return NextResponse.json({ message: 'Проверьте номер телефона.' }, { status: 400 })
  }

  try {
    const [existing] = await db.select({ id: clients.id }).from(clients).where(eq(clients.id, id)).limit(1)
    if (!existing) return NextResponse.json({ message: 'Клиент не найден.' }, { status: 404 })

    const values = parsed.data
    await db.update(clients).set({
      name: values.name,
      surname: values.surname || null,
      email: values.email || null,
      phone: values.phone || null,
      address: values.address || null,
      city: values.city || null,
      house: values.house || null,
      apartament: values.apartament || null,
      porch: values.porch || null,
      active: values.active,
      isb2B: values.isb2B,
      isCreator: values.isCreator,
    }).where(eq(clients.id, id))

    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Admin customer update failed', error)
    return NextResponse.json({ message: 'Не удалось сохранить данные клиента.' }, { status: 500 })
  }
}
