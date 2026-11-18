import { NextResponse } from 'next/server'

import { getCurrentAdmin } from '@/lib/admin-auth'
import { meilisearchGetIndexStats, meilisearchIndexName } from '@/lib/admin-meilisearch-client'

export async function GET() {
  if (!await getCurrentAdmin()) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })

  const stats = await meilisearchGetIndexStats(meilisearchIndexName())
  if (!stats.ok) {
    return NextResponse.json(
      { ok: false, message: `Не удалось получить статистику индекса: ${stats.error}` },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  return NextResponse.json(
    { ok: true, number_of_documents: stats.data.numberOfDocuments ?? 0, is_indexing: Boolean(stats.data.isIndexing) },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
