import { and, eq } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db'
import { clients, personalDataRequests, products, siteFeedback, wishlistItems } from '../../../../drizzle/schema'
import {
  AUTH_SESSION_COOKIE,
  AUTH_SESSION_MAX_AGE,
  createSession,
  findClientByEmail,
  findClientById,
  getUserBySessionToken,
  hashPassword,
  invalidateClientSessions,
  verifyPassword,
} from '@/lib/auth'
import { getAccountData } from '@/lib/account'
import { getFavoriteRecommendations } from '@/lib/catalog'
import { getContactPage } from '@/lib/contacts'
import { sendPrivacyRequestNotification } from '@/lib/contact-delivery'
import { pushCustomerToWorkApp } from '@/lib/workapp-customer-sync'

const profileSchema = z.object({
  name: z.string().trim().min(1).max(255),
  surname: z.string().trim().max(256).default(''),
  email: z.string().trim().email().max(255),
  birthday: z.string().trim().max(256).default(''),
  sex: z.coerce.number().int().min(0).max(2).default(0),
  smsSubscribe: z.boolean().default(false),
  mailSubscribe: z.boolean().default(false),
})

const privacyRequestSchema = z.object({
  requestType: z.enum(['access', 'correction', 'erasure', 'restriction', 'objection']),
  details: z.string().trim().min(1).max(4000),
})

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}

async function currentClient() {
  const cookieStore = await cookies()
  const user = await getUserBySessionToken(cookieStore.get(AUTH_SESSION_COOKIE)?.value)
  return user ? findClientById(user.id) : null
}

export async function GET(request: Request) {
  const client = await currentClient()
  if (!client) return json({ error: 'Требуется авторизация.' }, 401)

  const productId = Number(new URL(request.url).searchParams.get('productId'))
  if (Number.isInteger(productId) && productId > 0) {
    const [favorite] = await db.select({ id: wishlistItems.id }).from(wishlistItems)
      .where(and(eq(wishlistItems.contactId, client.id), eq(wishlistItems.productId, productId))).limit(1)
    return json({ favorite: Boolean(favorite) })
  }

  const locale = new URL(request.url).searchParams.get('locale') === 'ro' ? 'ro' : 'ru'
  const account = await getAccountData(client.id, locale)
  if (!account) return json({ error: 'Профиль не найден.' }, 404)
  if (new URL(request.url).searchParams.get('recommendations') === '1') {
    const recommendations = await getFavoriteRecommendations(account.favoriteIds, locale)
    return json({ ...account, recommendations })
  }
  return json(account)
}

export async function POST(request: Request) {
  const client = await currentClient()
  if (!client) return json({ error: 'Требуется авторизация.' }, 401)

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const action = String(body.action ?? '')
  const locale = body.locale === 'ro' ? 'ro' : 'ru'

  if (action === 'profile') {
    const parsed = profileSchema.safeParse(body)
    if (!parsed.success) return json({ error: 'Проверьте персональные данные.' }, 400)

    const email = parsed.data.email.toLowerCase()
    const existing = await findClientByEmail(email)
    if (existing && existing.id !== client.id) return json({ error: 'Этот email уже используется.' }, 409)

    await db.update(clients).set({
      name: parsed.data.name,
      surname: parsed.data.surname || null,
      email,
      birthday: parsed.data.birthday || null,
      sex: parsed.data.sex,
      smsSubscribe: parsed.data.smsSubscribe ? 1 : 0,
      mailSubscribe: parsed.data.mailSubscribe ? 1 : 0,
    }).where(eq(clients.id, client.id))

    pushCustomerToWorkApp({ id: client.id, phone: client.phone, name: parsed.data.name, surname: parsed.data.surname, birthday: parsed.data.birthday })
      .catch((error) => console.error('WorkApp customer push failed', error))

    const account = await getAccountData(client.id, locale)
    return json({ success: true, account })
  }

  if (action === 'password') {
    const currentPassword = String(body.currentPassword ?? '')
    const nextPassword = String(body.nextPassword ?? '')
    if (currentPassword.length > 256 || nextPassword.length < 8 || nextPassword.length > 128 || !verifyPassword(currentPassword, client.password)) {
      return json({ error: 'Текущий пароль неверен или новый пароль слишком короткий.' }, 400)
    }
    await db.update(clients).set({ password: hashPassword(nextPassword) }).where(eq(clients.id, client.id))
    await invalidateClientSessions(client.id)
    const token = await createSession(client.id)
    const result = json({ success: true })
    result.cookies.set({
      name: AUTH_SESSION_COOKIE,
      value: token,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: AUTH_SESSION_MAX_AGE,
    })
    return result
  }

  if (action === 'personal-data-request') {
    const parsed = privacyRequestSchema.safeParse(body)
    if (!parsed.success) return json({ error: locale === 'ro' ? 'Selectați tipul și descrieți solicitarea în maximum 4000 de caractere.' : 'Выберите тип запроса и опишите его не более чем в 4000 символах.' }, 400)

    const typeLabels = locale === 'ro'
      ? { access: 'Copie a datelor', correction: 'Corectarea datelor', erasure: 'Ștergerea datelor', restriction: 'Limitarea prelucrării', objection: 'Opoziție față de marketing' }
      : { access: 'Копия данных', correction: 'Исправление данных', erasure: 'Удаление данных', restriction: 'Ограничение обработки', objection: 'Возражение против маркетинга' }
    const requestType = parsed.data.requestType
    const details = parsed.data.details
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    let requestSaved = false
    let feedbackSaved = false

    try {
      await db.insert(personalDataRequests).values({
        clientId: client.id,
        requestType,
        details,
        source: 'account',
        status: 'new',
        identityVerified: 1,
        createdAt: now,
        updatedAt: now,
      })
      requestSaved = true
    } catch {
      // Keep the feedback/email fallback available if the optional privacy table is not present yet.
    }

    const feedbackMessage = locale === 'ro'
      ? ['Solicitare din contul personal', `ID client: ${client.id}`, `Email: ${client.email ?? ''}`, `Telefon: ${client.phone ?? ''}`, `Tip: ${typeLabels[requestType]}`, '', details].join('\n')
      : ['Запрос из личного кабинета', `ID клиента: ${client.id}`, `Email: ${client.email ?? ''}`, `Телефон: ${client.phone ?? ''}`, `Тип запроса: ${typeLabels[requestType]}`, '', details].join('\n')
    try {
      await db.insert(siteFeedback).values({
        feedbackType: 'question',
        message: feedbackMessage.slice(0, 5000),
        pagePath: locale === 'ro' ? '/ro/contul-meu' : '/ru/lichnyiy-kabinet',
        locale,
        status: 'new',
        createdAt: now,
        updatedAt: now,
      })
      feedbackSaved = true
    } catch {
      // Email delivery below can still complete the request.
    }

    let contactEmail = process.env.PERSONAL_DATA_REQUEST_EMAIL?.trim() ?? ''
    if (!contactEmail) {
      try {
        contactEmail = (await getContactPage(locale)).email
      } catch {
        contactEmail = ''
      }
    }
    const notification = await sendPrivacyRequestNotification({
      to: contactEmail,
      replyTo: client.email ?? '',
      locale,
      clientId: client.id,
      phone: client.phone ?? '',
      email: client.email ?? '',
      requestType: typeLabels[requestType],
      details,
    })

    if (!requestSaved && !feedbackSaved && !notification.sent) {
      return json({ error: locale === 'ro' ? 'Solicitarea nu a putut fi trimisă.' : 'Не удалось отправить запрос.' }, 503)
    }
    return json({ ok: true })
  }

  if (action === 'favorite-toggle') {
    const productId = Number(body.productId)
    if (!Number.isInteger(productId) || productId < 1) return json({ error: 'Некорректный товар.' }, 400)
    const [product] = await db.select({ id: products.id }).from(products).where(eq(products.id, productId)).limit(1)
    if (!product) return json({ error: 'Товар не найден.' }, 404)

    const [existing] = await db.select({ id: wishlistItems.id }).from(wishlistItems)
      .where(and(eq(wishlistItems.contactId, client.id), eq(wishlistItems.productId, productId))).limit(1)

    if (existing) {
      await db.delete(wishlistItems).where(eq(wishlistItems.id, existing.id))
    } else {
      await db.insert(wishlistItems).values({ contactId: client.id, productId })
    }

    return json({ success: true, favorite: !existing })
  }

  return json({ error: 'Неизвестное действие.' }, 404)
}
