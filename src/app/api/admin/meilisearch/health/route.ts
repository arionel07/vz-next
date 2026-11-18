import { NextResponse } from 'next/server'

import { getCurrentAdmin } from '@/lib/admin-auth'
import { isMeilisearchConfigured, meilisearchHealth } from '@/lib/admin-meilisearch-client'

export async function GET() {
  if (!await getCurrentAdmin()) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })

  const health = await meilisearchHealth()
  return NextResponse.json(
    { configured: isMeilisearchConfigured(), ok: health.ok, health: health.ok ? health.data : null, message: health.ok ? undefined : health.error },
    { status: health.ok ? 200 : 502, headers: { 'Cache-Control': 'no-store' } },
  )
}
