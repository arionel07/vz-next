import { sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { db } from '@/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Liveness/readiness probe for the Docker healthcheck and external uptime
 * monitoring. Verifies the app can reach MySQL, not just that it is running.
 */
export async function GET() {
  const startedAt = Date.now()

  try {
    await db.execute(sql`select 1`)
    return NextResponse.json(
      { status: 'ok', database: 'up', latencyMs: Date.now() - startedAt },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('[health-check] database unreachable', error)
    return NextResponse.json(
      { status: 'error', database: 'down' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
