import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { eq } from 'drizzle-orm'

import { db } from '@/db'
import {
  ADMIN_LOGIN_MAX_ATTEMPTS,
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  clearAdminLoginAttempts,
  countRecentAdminLoginAttempts,
  createAdminSession,
  deleteAdminSession,
  getAdminBySessionToken,
  getAdminLoginAttemptKey,
  recordFailedAdminLogin,
  verifyLegacyAdminPassword,
} from '@/lib/admin-auth'
import { admins } from '../../../../../drizzle/schema'

const jsonHeaders = { 'Cache-Control': 'no-store' }

function response(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: jsonHeaders })
}

function validSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  return !origin || origin === new URL(request.url).origin
}

async function readBody(request: Request) {
  try {
    return await request.json() as Record<string, unknown>
  } catch {
    return {}
  }
}

function getRemoteAddress(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return (request.headers.get('x-real-ip')?.trim() || forwarded || 'unknown').slice(0, 128)
}

function setAdminCookie(result: NextResponse, token: string) {
  result.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ADMIN_SESSION_MAX_AGE,
  })
}

function clearAdminCookie(result: NextResponse) {
  result.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
}

export async function GET() {
  try {
    const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value
    const admin = await getAdminBySessionToken(token)
    return response({ admin })
  } catch {
    return response({ error: 'Не удалось проверить сессию.' }, 503)
  }
}

export async function POST(request: Request) {
  try {
    return await handlePost(request)
  } catch {
    return response({ error: 'Сервис входа временно недоступен.' }, 503)
  }
}

async function handlePost(request: Request) {
  if (!validSameOrigin(request)) return response({ error: 'Запрос отклонён.' }, 403)

  const body = await readBody(request)
  const action = String(body.action ?? '')
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value

  if (action === 'logout') {
    await deleteAdminSession(sessionToken)
    const result = response({ success: true })
    clearAdminCookie(result)
    return result
  }

  if (action !== 'login') return response({ error: 'Неизвестное действие.' }, 404)

  const login = String(body.login ?? '').trim().slice(0, 50)
  const password = String(body.password ?? '')
  if (!login || !password || password.length > 256) {
    return response({ error: 'Введите логин и пароль.' }, 400)
  }

  const attemptKey = getAdminLoginAttemptKey(login, getRemoteAddress(request))
  if (await countRecentAdminLoginAttempts(attemptKey) >= ADMIN_LOGIN_MAX_ATTEMPTS) {
    return response({ error: 'Слишком много попыток. Подождите 15 минут и попробуйте снова.' }, 429)
  }

  const [admin] = await db.select().from(admins).where(eq(admins.login, login)).limit(1)
  const passwordMatches = verifyLegacyAdminPassword(password, admin?.password ?? '')
  if (!admin || admin.status !== 1 || !passwordMatches) {
    await recordFailedAdminLogin(attemptKey)
    return response({ error: 'Неверный логин или пароль.' }, 401)
  }

  await clearAdminLoginAttempts(attemptKey)
  const token = await createAdminSession(admin.id)
  const result = response({ success: true, admin: { id: admin.id, login: admin.login } })
  setAdminCookie(result, token)
  return result
}
