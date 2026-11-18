import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getCurrentAdmin } from '@/lib/admin-auth'
import { meilisearchGetTask } from '@/lib/admin-meilisearch-client'

const bodySchema = z.object({ taskUid: z.union([z.number().int().nonnegative(), z.string().regex(/^\d{1,20}$/)]) })

function validSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  return !origin || origin === new URL(request.url).origin
}

/** POST /api/admin/meilisearch/task-status — read an async Meilisearch task's state without exposing API keys. */
export async function POST(request: Request) {
  if (!validSameOrigin(request)) return NextResponse.json({ ok: false, message: 'Запрос отклонён.' }, { status: 403 })
  if (!await getCurrentAdmin()) return NextResponse.json({ ok: false, message: 'Требуется вход в админку.' }, { status: 401 })

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ ok: false, message: 'Некорректный идентификатор задачи Meilisearch.' }, { status: 400 })

  const task = await meilisearchGetTask(parsed.data.taskUid)
  if (!task.ok) return NextResponse.json({ ok: false, message: `Не удалось получить статус задачи: ${task.error}` }, { status: 502 })

  return NextResponse.json({
    ok: true,
    task_uid: task.data.uid ?? parsed.data.taskUid,
    status: task.data.status ?? 'unknown',
    error: task.data.error?.message?.slice(0, 300) ?? '',
  }, { headers: { 'Cache-Control': 'no-store' } })
}
