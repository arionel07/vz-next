import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db'
import { getCurrentAdmin } from '@/lib/admin-auth'
import { homeBrandSections, homeCategories, homeProductItems, sliders } from '../../../../../drizzle/schema'

const requestSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('slider'), id: z.number().int().positive(), isShown: z.number().int().min(0).max(1).optional(), sorder: z.number().int().min(0).max(99999).optional() }),
  z.object({ type: z.literal('category'), id: z.number().int().positive(), isShown: z.number().int().min(0).max(1).optional(), sorder: z.number().int().min(0).max(99999).optional() }),
  z.object({ type: z.literal('product'), id: z.number().int().positive(), isShown: z.number().int().min(0).max(1).optional(), sorder: z.number().int().min(0).max(99999).optional() }),
  z.object({ type: z.literal('brandSection'), id: z.number().int().positive(), isShown: z.number().int().min(0).max(1).optional(), sorder: z.number().int().min(0).max(99999).optional() }),
  z.object({ type: z.literal('productSection'), sectionKey: z.enum(['sale', 'new', 'hits']), isShown: z.number().int().min(0).max(1) }),
])

function validSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  return !origin || origin === new URL(request.url).origin
}

export async function PATCH(request: Request) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: 'Запрос отклонён.' }, { status: 403 })
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })

  const parsed = requestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ message: 'Проверьте изменяемые данные.' }, { status: 400 })
  const data = parsed.data
  if (data.type !== 'productSection' && data.isShown === undefined && data.sorder === undefined) {
    return NextResponse.json({ message: 'Нет изменений для сохранения.' }, { status: 400 })
  }
  const values = data.type === 'productSection' ? null : {
    ...(data.isShown === undefined ? {} : { isShown: data.isShown }),
    ...(data.sorder === undefined ? {} : { sorder: data.sorder }),
  }
  if (data.type !== 'productSection' && !values) return NextResponse.json({ message: 'Нет изменений для сохранения.' }, { status: 400 })

  try {
    switch (data.type) {
      case 'slider':
        await db.update(sliders).set(values ?? {}).where(eq(sliders.id, data.id))
        break
      case 'category':
        await db.update(homeCategories).set(values ?? {}).where(eq(homeCategories.id, data.id))
        break
      case 'product':
        await db.update(homeProductItems).set(values ?? {}).where(eq(homeProductItems.id, data.id))
        break
      case 'brandSection':
        await db.update(homeBrandSections).set(values ?? {}).where(eq(homeBrandSections.id, data.id))
        break
      case 'productSection':
        await db.update(homeProductItems).set({ isShown: data.isShown }).where(eq(homeProductItems.sectionKey, data.sectionKey))
        break
    }

    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Admin homepage update failed', error)
    return NextResponse.json({ message: 'Не удалось сохранить настройки главной.' }, { status: 500 })
  }
}
