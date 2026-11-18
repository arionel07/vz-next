import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getCurrentAdmin } from '@/lib/admin-auth'
import {
  isMeilisearchConfigured, meilisearchEnsureIndex, meilisearchIndexName, meilisearchUpdateDocuments, meilisearchUpdateSettings,
} from '@/lib/admin-meilisearch-client'
import { getProductRowsForSync, makeMeilisearchDocument } from '@/lib/admin-meilisearch-catalog-sync'
import { buildMeilisearchIndexSettings } from '@/lib/admin-meilisearch-synonyms'

const bodySchema = z.object({
  after_id: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(1000).default(500),
  phase: z.enum(['bestsellers', 'remaining', 'all']).default('all'),
})

function validSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  return !origin || origin === new URL(request.url).origin
}

/**
 * POST /api/admin/meilisearch/reindex
 *
 * Incremental/idempotent batch reindex, same contract as the legacy
 * `/cp/meilisearch/reindex`: after_id/limit/phase in, indexed/next_after_id/
 * has_more/task out. Never clears the index — a first rollout stays safe
 * even if something else already writes to the same index.
 */
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

  let body: unknown
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ ok: false, message: 'Некорректные параметры индексации.' }, { status: 400 })
  const { after_id: afterId, limit, phase } = parsed.data

  const rows = await getProductRowsForSync(afterId, limit, phase)
  const documents = rows.map((row) => makeMeilisearchDocument(row))

  let task: Awaited<ReturnType<typeof meilisearchUpdateDocuments>> | null = null
  if (documents.length) {
    task = await meilisearchUpdateDocuments(index, documents, 'id')
    if (!task.ok) {
      return NextResponse.json({ ok: false, message: `Meilisearch did not accept the batch: ${task.error}` }, { status: 502 })
    }
  }

  let settingsTask: Awaited<ReturnType<typeof meilisearchUpdateSettings>> | null = null
  if (afterId === 0 && (phase === 'bestsellers' || phase === 'all')) {
    settingsTask = await meilisearchUpdateSettings(index, await buildMeilisearchIndexSettings())
    if (!settingsTask.ok) {
      return NextResponse.json({ ok: false, message: 'Documents were accepted, but index settings were not accepted.', task: task?.ok ? task.data : null }, { status: 502 })
    }
  }

  const nextAfterId = rows.length ? rows[rows.length - 1].id : afterId

  return NextResponse.json({
    ok: true,
    index,
    phase,
    indexed: documents.length,
    after_id: afterId,
    next_after_id: nextAfterId,
    has_more: rows.length === limit,
    task: task?.ok ? task.data : null,
    settings_task: settingsTask?.ok ? settingsTask.data : null,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
