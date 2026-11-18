import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { db } from '@/db'
import {
  authVerificationCodes,
  clients,
} from '../../../../drizzle/schema'
import {
  AUTH_SESSION_COOKIE,
  AUTH_SESSION_MAX_AGE,
  consumeVerificationCode,
  createPasswordResetToken,
  createSession,
  createVerificationCode,
  deleteSession,
  findClientByEmail,
  findClientByIdentity,
  getUserBySessionToken,
  hashPassword,
  hashToken,
  isLegacyPasswordHash,
  normalizeEmail,
  normalizePhone,
  toAuthUser,
  VerificationRateLimitError,
  resetPasswordWithToken,
  verifyPassword,
} from '@/lib/auth'
import { sendPasswordResetEmail, sendRegistrationWelcomeEmail, sendSmsCode } from '@/lib/auth-delivery'
import { activateWelcomeOffer } from '@/lib/welcome-offer'
import { pullCustomerFromWorkApp, pushCustomerToWorkApp } from '@/lib/workapp-customer-sync'

function syncWorkAppInBackground(client: { id: number; phone: string | null; name: string | null; surname: string | null; birthday: string | null }, pushFirst: boolean) {
  const run = async () => {
    if (pushFirst) await pushCustomerToWorkApp(client)
    await pullCustomerFromWorkApp(client)
  }
  run().catch((error) => console.error('WorkApp customer sync failed', error))
}

const jsonHeaders = { 'Cache-Control': 'no-store' }

function response(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: jsonHeaders })
}

function setSessionCookie(result: NextResponse, token: string) {
  result.cookies.set({
    name: AUTH_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: AUTH_SESSION_MAX_AGE,
  })
}

function clearSessionCookie(result: NextResponse) {
  result.cookies.set({ name: AUTH_SESSION_COOKIE, value: '', httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 })
}

async function body(request: Request) {
  try {
    return await request.json() as Record<string, unknown>
  } catch {
    return {}
  }
}

function isValidEmail(value: string) {
  return value.length <= 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export async function GET(request: Request) {
  const action = new URL(request.url).searchParams.get('action')
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_SESSION_COOKIE)?.value

  if (action === 'session') return response({ user: await getUserBySessionToken(token) })
  return response({ error: 'Unknown auth action.' }, 404)
}

export async function POST(request: Request) {
  const data = await body(request)
  const action = String(data.action ?? '')
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get(AUTH_SESSION_COOKIE)?.value

  if (action === 'logout') {
    await deleteSession(sessionToken)
    const result = response({ success: true })
    clearSessionCookie(result)
    return result
  }

  if (action === 'login') {
    const identity = String(data.identity ?? data.phone ?? '').trim()
    const password = String(data.password ?? '')
    if (!identity || password.length < 1 || password.length > 256) return response({ error: 'Введите телефон и пароль.' }, 400)

    const client = await findClientByIdentity(identity)
    if (!client || client.active !== 1 || client.code !== 1 || !verifyPassword(password, client.password)) {
      return response({ error: 'Неверный телефон или пароль.' }, 401)
    }

    if (isLegacyPasswordHash(client.password)) {
      await db.update(clients).set({ password: hashPassword(password) }).where(eq(clients.id, client.id))
    }

    syncWorkAppInBackground(client, false)
    const token = await createSession(client.id)
    const result = response({ success: true, user: toAuthUser(client) })
    setSessionCookie(result, token)
    return result
  }

  if (action === 'register') {
    const phone = normalizePhone(data.phone ?? data.number)
    const email = normalizeEmail(data.email)
    const name = String(data.name ?? '').trim().slice(0, 255)
    const password = String(data.password ?? '')
    const passwordCheck = String(data.passwordCheck ?? data.password_check ?? '')

    if (data.termsAccepted !== true || !phone || !isValidEmail(email) || !name || password.length < 8 || password.length > 128 || password !== passwordCheck) {
      return response({ error: 'Заполните поля и проверьте пароль. Минимум — 8 символов.' }, 400)
    }

    const [emailExists, phoneExists] = await Promise.all([
      findClientByEmail(email),
      db.select({ id: clients.id }).from(clients).where(eq(clients.phone, phone)).limit(1),
    ])
    if (emailExists) return response({ error: 'Этот email уже зарегистрирован.' }, 409)
    if (phoneExists[0]) return response({ error: 'Этот номер уже зарегистрирован.' }, 409)

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    const insertResult = await db.insert(clients).values({
      idFb: 0,
      active: 1,
      discount: '0',
      bonus: '0',
      name,
      surname: null,
      phone,
      email,
      address: null,
      apartament: null,
      city: null,
      house: null,
      porch: null,
      birthday: null,
      sex: 0,
      password: hashPassword(password),
      code: 0,
      smsSubscribe: data.smsSubscribe ? 1 : 0,
      mailSubscribe: data.mailSubscribe ? 1 : 0,
      sorder: 0,
      isShown: 1,
      isb2B: 0,
      welcomeOfferStartedAt: null,
      welcomeOfferExpiresAt: null,
    })

    const clientId = Number(insertResult[0].insertId)
    let code: string
    try {
      code = await createVerificationCode(clientId, 'register')
    } catch (error) {
      await db.delete(clients).where(eq(clients.id, clientId))
      if (error instanceof VerificationRateLimitError) return response({ error: error.message }, 429)
      throw error
    }
    const locale = data.locale === 'ro' ? 'ro' : 'ru'
    const delivery = await sendSmsCode(phone, code, locale)

    if ((delivery.configured && !delivery.sent) || (!delivery.configured && process.env.NODE_ENV === 'production')) {
      await db.delete(authVerificationCodes).where(and(eq(authVerificationCodes.clientId, clientId), eq(authVerificationCodes.purpose, 'register')))
      await db.delete(clients).where(eq(clients.id, clientId))
      return response({ error: locale === 'ro' ? 'Codul SMS nu a putut fi trimis. Încercați mai târziu.' : 'Не удалось отправить SMS-код. Попробуйте позже.' }, 503)
    }

    return response({
      success: true,
      verificationRequired: true,
      phone,
      devCode: !delivery.configured && process.env.NODE_ENV !== 'production' ? code : undefined,
    })
  }

  if (action === 'request-login-code') {
    const phone = normalizePhone(data.phone ?? data.identity)
    const locale = data.locale === 'ro' ? 'ro' : 'ru'
    if (!phone) return response({ error: locale === 'ro' ? 'Introduceți un număr de telefon valid.' : 'Введите корректный номер телефона.' }, 400)

    const [client] = await db.select().from(clients).where(eq(clients.phone, phone)).limit(1)
    if (!client || client.active !== 1 || client.code !== 1) {
      return response({ error: locale === 'ro' ? 'Contul cu acest număr nu a fost găsit.' : 'Аккаунт с таким номером не найден.' }, 404)
    }

    let code: string
    try {
      code = await createVerificationCode(client.id, 'login')
    } catch (error) {
      if (error instanceof VerificationRateLimitError) return response({ error: error.message }, 429)
      throw error
    }

    const delivery = await sendSmsCode(phone, code, locale)
    if ((delivery.configured && !delivery.sent) || (!delivery.configured && process.env.NODE_ENV === 'production')) {
      await db.update(authVerificationCodes)
        .set({ usedAt: new Date().toISOString().slice(0, 19).replace('T', ' ') })
        .where(and(eq(authVerificationCodes.clientId, client.id), eq(authVerificationCodes.purpose, 'login')))
      return response({ error: locale === 'ro' ? 'Codul SMS nu a putut fi trimis. Încercați mai târziu.' : 'Не удалось отправить SMS-код. Попробуйте позже.' }, 503)
    }

    return response({
      success: true,
      phone,
      devCode: !delivery.configured && process.env.NODE_ENV !== 'production' ? code : undefined,
    })
  }

  if (action === 'verify-sms') {
    const phone = normalizePhone(data.phone)
    const code = String(data.code ?? '').replace(/\D/g, '')
    const purpose = data.purpose === 'login' ? 'login' : 'register'
    const locale = data.locale === 'ro' ? 'ro' : 'ru'
    const clientRows = await db.select().from(clients).where(eq(clients.phone, phone)).limit(1)
    const client = clientRows[0]
    const accountMatchesPurpose = purpose === 'register'
      ? client?.code !== 1
      : client?.active === 1 && client?.code === 1
    if (!client || !accountMatchesPurpose || code.length !== 6 || !(await consumeVerificationCode(client.id, purpose, code))) {
      return response({ error: locale === 'ro' ? 'Codul este incorect sau expirat.' : 'Неверный или просроченный код.' }, 400)
    }

    let welcomeOfferExpiresAt: number | null = null
    if (purpose === 'register') {
      await db.update(clients).set({ code: 1 }).where(eq(clients.id, client.id))
      welcomeOfferExpiresAt = await activateWelcomeOffer(client.id)
      if (client.email) {
        sendRegistrationWelcomeEmail(client.email, client.name ?? '', locale).catch((error) => console.error('Registration welcome email failed', error))
      }
    }
    syncWorkAppInBackground(client, purpose === 'register')
    const token = await createSession(client.id)
    const result = response({
      success: true,
      user: toAuthUser({ ...client, code: purpose === 'register' ? 1 : client.code }),
      welcomeOfferExpiresAt: welcomeOfferExpiresAt ?? undefined,
    })
    setSessionCookie(result, token)
    return result
  }

  if (action === 'resend-sms') {
    const phone = normalizePhone(data.phone)
    const purpose = data.purpose === 'login' ? 'login' : 'register'
    const locale = data.locale === 'ro' ? 'ro' : 'ru'
    const [client] = await db.select().from(clients).where(eq(clients.phone, phone)).limit(1)
    const accountMatchesPurpose = purpose === 'register'
      ? client && client.code !== 1
      : client && client.active === 1 && client.code === 1
    if (!client || !accountMatchesPurpose) return response({ error: locale === 'ro' ? 'Înregistrarea nu a fost găsită.' : 'Регистрация не найдена.' }, 404)

    let code: string
    try {
      code = await createVerificationCode(client.id, purpose)
    } catch (error) {
      if (error instanceof VerificationRateLimitError) return response({ error: error.message }, 429)
      throw error
    }

    const delivery = await sendSmsCode(phone, code, locale)
    if ((delivery.configured && !delivery.sent) || (!delivery.configured && process.env.NODE_ENV === 'production')) {
      await db.update(authVerificationCodes)
        .set({ usedAt: new Date().toISOString().slice(0, 19).replace('T', ' ') })
        .where(and(
          eq(authVerificationCodes.clientId, client.id),
          eq(authVerificationCodes.purpose, purpose),
          eq(authVerificationCodes.codeHash, hashToken(code)),
        ))
      return response({ error: locale === 'ro' ? 'Codul SMS nu a putut fi trimis.' : 'Не удалось отправить SMS-код.' }, 503)
    }
    return response({ success: true, devCode: !delivery.configured && process.env.NODE_ENV !== 'production' ? code : undefined })
  }

  if (action === 'forgot-password') {
    const email = normalizeEmail(data.email)
    const client = await findClientByEmail(email)
    if (!client || client.active !== 1 || client.code !== 1) return response({ success: true })

    const token = await createPasswordResetToken(client.id)
    const locale = data.locale === 'ro' ? 'ro' : 'ru'
    const delivery = await sendPasswordResetEmail(email, token, locale)
    if (!delivery.configured && process.env.NODE_ENV === 'production') return response({ error: 'Сервис email пока не настроен.' }, 503)
    if (delivery.configured && !delivery.sent) return response({ error: 'Не удалось отправить письмо.' }, 503)
    return response({ success: true, devResetToken: !delivery.configured && process.env.NODE_ENV !== 'production' ? token : undefined })
  }

  if (action === 'reset-password') {
    const token = String(data.token ?? '')
    const password = String(data.password ?? '')
    const passwordCheck = String(data.passwordCheck ?? data.password_check ?? '')
    if (password.length < 8 || password.length > 128 || password !== passwordCheck) return response({ error: 'Пароли должны совпадать и содержать от 8 до 128 символов.' }, 400)

    const updated = await resetPasswordWithToken(token, password)
    if (!updated) return response({ error: 'Ссылка недействительна или устарела.' }, 400)
    return response({ success: true })
  }

  return response({ error: 'Unknown auth action.' }, 404)
}
