import { NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db'
import { getCurrentAdmin } from '@/lib/admin-auth'
import { isSiteThemeKey } from '@/lib/site-theme-shared'
import { siteThemeSettings } from '../../../../../drizzle/schema'

const updateSchema = z.object({ themeKey: z.string().refine(isSiteThemeKey, 'Выберите одну из доступных тем.') })

function validSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  return !origin || origin === new URL(request.url).origin
}

export async function GET() {
  if (!await getCurrentAdmin()) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })

  try {
    const [setting] = await db.select({ themeKey: siteThemeSettings.themeKey }).from(siteThemeSettings).limit(1)
    return NextResponse.json({ themeKey: setting?.themeKey && isSiteThemeKey(setting.themeKey) ? setting.themeKey : 'default' }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('Admin site theme read failed', error)
    return NextResponse.json({ message: 'Не удалось загрузить тему. Проверьте наличие таблицы site_theme_settings в базе данных.' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: 'Запрос отклонён.' }, { status: 403 })
  if (!await getCurrentAdmin()) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })

  try {
    const body = updateSchema.parse(await request.json())
    const updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ')

    await db.insert(siteThemeSettings).values({ id: 1, themeKey: body.themeKey, updatedAt }).onDuplicateKeyUpdate({
      set: { themeKey: body.themeKey, updatedAt },
    })

    return NextResponse.json({ ok: true, themeKey: body.themeKey }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ message: error.issues[0]?.message ?? 'Проверьте выбранную тему.' }, { status: 400 })
    console.error('Admin site theme save failed', error)
    return NextResponse.json({ message: 'Не удалось сохранить тему. Проверьте наличие таблицы site_theme_settings в базе данных.' }, { status: 500 })
  }
}
