import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getCurrentAdmin } from '@/lib/admin-auth'
import { getSearchSynonymGroups, saveSearchSynonymGroups, synonymStorageReady } from '@/lib/admin-meilisearch-synonyms'

const bodySchema = z.object({ groups: z.string().max(65536) })

function validSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  return !origin || origin === new URL(request.url).origin
}

/** GET /api/admin/meilisearch/synonyms — current groups as `term | term` lines, for the textarea. */
export async function GET() {
  if (!await getCurrentAdmin()) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })

  const [groups, storageReady] = await Promise.all([getSearchSynonymGroups(), synonymStorageReady()])
  return NextResponse.json(
    { groups_text: groups.map((group) => group.join(' | ')).join('\n'), storage_ready: storageReady },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

/** POST /api/admin/meilisearch/synonyms — save edited groups for the next settings application. */
export async function POST(request: Request) {
  if (!validSameOrigin(request)) return NextResponse.json({ ok: false, message: 'Запрос отклонён.' }, { status: 403 })
  if (!await getCurrentAdmin()) return NextResponse.json({ ok: false, message: 'Требуется вход в админку.' }, { status: 401 })

  if (!await synonymStorageReady()) {
    return NextResponse.json({ ok: false, message: 'Сначала выполни миграцию drizzle/0006_search_synonym_settings.sql.' }, { status: 503 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ ok: false, message: 'Список слишком большой или имеет неверный формат (максимум 64 КБ).' }, { status: 400 })

  const result = await saveSearchSynonymGroups(parsed.data.groups)
  if (!result.ok) return NextResponse.json({ ok: false, message: result.error }, { status: 400 })

  return NextResponse.json({ ok: true, groups_count: result.groupsCount }, { headers: { 'Cache-Control': 'no-store' } })
}
