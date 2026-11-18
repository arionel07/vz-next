import { NextResponse } from 'next/server'

import { getCurrentAdmin } from '@/lib/admin-auth'
import { isMeilisearchConfigured, meilisearchEnsureIndex, meilisearchIndexName, meilisearchUpdateSettings } from '@/lib/admin-meilisearch-client'
import { buildMeilisearchIndexSettings } from '@/lib/admin-meilisearch-synonyms'

function validSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  return !origin || origin === new URL(request.url).origin
}

/** POST /api/admin/meilisearch/settings — apply relevance settings without re-uploading the catalog. */
export async function POST(request: Request) {
  if (!validSameOrigin(request)) return NextResponse.json({ ok: false, message: 'Запрос отклонён.' }, { status: 403 })
  if (!await getCurrentAdmin()) return NextResponse.json({ ok: false, message: 'Требуется вход в админку.' }, { status: 401 })

  if (!isMeilisearchConfigured()) {
    return NextResponse.json({ ok: false, message: 'MEILISEARCH_URL is not configured.' }, { status: 503 })
  }

  const index = meilisearchIndexName()
  const ensured = await meilisearchEnsureIndex(index)
  if (!ensured.ok) {
    return NextResponse.json({ ok: false, message: `Не удалось подготовить индекс в Meilisearch: ${ensured.error}` }, { status: 502 })
  }

  const task = await meilisearchUpdateSettings(index, await buildMeilisearchIndexSettings())
  if (!task.ok) {
    return NextResponse.json({ ok: false, message: `Meilisearch не принял настройки: ${task.error}` }, { status: 502 })
  }

  return NextResponse.json({ ok: true, index, task_uid: task.data.taskUid ?? task.data.uid ?? null }, { headers: { 'Cache-Control': 'no-store' } })
}
