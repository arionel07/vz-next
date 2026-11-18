import { NextResponse } from 'next/server'

const MAX_AGE = 60 * 60 * 24 * 180

export async function POST(request: Request) {
  const form = await request.formData()
  const value = {
    functional: form.get('functional') === '1',
    analytics: form.get('analytics') === '1',
    marketing: form.get('marketing') === '1',
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set('cookie_consent', JSON.stringify(value), {
    httpOnly: true,
    maxAge: MAX_AGE,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  return response
}
