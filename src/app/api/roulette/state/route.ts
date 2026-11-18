import { randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { AUTH_SESSION_COOKIE, getUserBySessionToken } from '@/lib/auth'
import { getRouletteState } from '@/lib/roulette'

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const user = await getUserBySessionToken(cookieStore.get(AUTH_SESSION_COOKIE)?.value)
  if (!user) return NextResponse.json({ error: 'authentication_required' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  if (user.isB2B) return NextResponse.json({ error: 'b2c_account_required' }, { status: 403, headers: { 'Cache-Control': 'no-store' } })

  try {
    const locale = new URL(request.url).searchParams.get('locale') === 'ro' ? 'ro' : 'ru'
    const data = await getRouletteState(user.id, locale)
    const csrfToken = randomBytes(32).toString('hex')
    const response = NextResponse.json({ data, csrfToken }, { headers: { 'Cache-Control': 'no-store' } })
    response.cookies.set('vz_roulette_csrf', csrfToken, {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60,
    })
    return response
  } catch (error) {
    console.error('Roulette state unavailable', error)
    return NextResponse.json({ error: 'state_unavailable' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}
