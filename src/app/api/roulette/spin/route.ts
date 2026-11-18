import { timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { AUTH_SESSION_COOKIE, getUserBySessionToken } from '@/lib/auth'
import { RouletteSpinError, spinRoulette } from '@/lib/roulette'

const requestSchema = z.object({
  requestId: z.string().uuid(),
  csrfToken: z.string().regex(/^[a-f0-9]{64}$/i),
  locale: z.enum(['ru', 'ro']).default('ru'),
})

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json())
    const origin = request.headers.get('origin')
    const requestHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
    if (origin && requestHost && new URL(origin).host !== requestHost) {
      return NextResponse.json({ error: 'cross_origin_request' }, { status: 403, headers: { 'Cache-Control': 'no-store' } })
    }
    if (request.headers.get('sec-fetch-site') === 'cross-site') {
      return NextResponse.json({ error: 'cross_origin_request' }, { status: 403, headers: { 'Cache-Control': 'no-store' } })
    }

    const cookieStore = await cookies()
    const csrfCookie = cookieStore.get('vz_roulette_csrf')?.value ?? ''
    const expected = Buffer.from(csrfCookie)
    const received = Buffer.from(body.csrfToken)
    if (expected.length !== received.length || expected.length !== 64 || !timingSafeEqual(expected, received)) {
      return NextResponse.json({ error: 'invalid_csrf_token' }, { status: 403, headers: { 'Cache-Control': 'no-store' } })
    }

    const user = await getUserBySessionToken(cookieStore.get(AUTH_SESSION_COOKIE)?.value)
    if (!user) return NextResponse.json({ error: 'authentication_required' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
    if (user.isB2B) return NextResponse.json({ error: 'b2c_account_required' }, { status: 403, headers: { 'Cache-Control': 'no-store' } })

    const result = await spinRoulette(user.id, body.requestId.toLowerCase(), body.locale)
    return NextResponse.json({ prize: result.prize, replayed: result.replayed }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'invalid_request' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
    if (error instanceof RouletteSpinError) return NextResponse.json({ error: error.reason }, { status: error.status, headers: { 'Cache-Control': 'no-store' } })
    console.error('Roulette spin failed', error)
    return NextResponse.json({ error: 'spin_failed' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}
