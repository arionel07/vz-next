import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { and, count, eq, max } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db'
import { getCurrentAdmin } from '@/lib/admin-auth'
import { orders, stores, storesImg } from '../../../../../drizzle/schema'

export const runtime = 'nodejs'

const storeFieldsSchema = z.object({
  titleRu: z.string().trim().min(1).max(250),
  titleRo: z.string().trim().min(1).max(250),
  phone: z.string().trim().max(255).default(''),
  coords: z.string().trim().max(255).default('').refine(
    (value) => {
      if (!value) return true
      const parts = value.split(',')
      if (parts.length !== 2 || !parts.every((part) => part.trim() !== '')) return false
      const [latitude, longitude] = parts.map((part) => Number(part.trim()))
      return Number.isFinite(latitude) && latitude >= -90 && latitude <= 90
        && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180
    },
    'Укажите координаты в формате «широта, долгота».',
  ),
  descRu: z.string().max(60000).default(''),
  descRo: z.string().max(60000).default(''),
  textRu: z.string().max(60000).default(''),
  textRo: z.string().max(60000).default(''),
  iframeGoogle: z.string().trim().max(1024).default(''),
  delivery: z.coerce.number().int().min(0).max(1).default(0),
  isShown: z.coerce.number().int().min(0).max(1).default(1),
  sorder: z.coerce.number().int().min(0).max(99999).default(1),
  onBottom: z.coerce.number().int().min(0).max(1).default(0),
})

const imageExtensions = { 'image/jpeg': '.jpg', 'image/png': '.png' } as const

function validSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  return !origin || origin === new URL(request.url).origin
}

function textField(form: FormData, name: string) {
  const value = form.get(name)
  return typeof value === 'string' ? value : ''
}

function readFields(form: FormData) {
  return storeFieldsSchema.parse({
    titleRu: textField(form, 'titleRu'),
    titleRo: textField(form, 'titleRo'),
    phone: textField(form, 'phone'),
    coords: textField(form, 'coords'),
    descRu: textField(form, 'descRu'),
    descRo: textField(form, 'descRo'),
    textRu: textField(form, 'textRu'),
    textRo: textField(form, 'textRo'),
    iframeGoogle: textField(form, 'iframeGoogle'),
    delivery: textField(form, 'delivery') || '0',
    isShown: textField(form, 'isShown') || '1',
    sorder: textField(form, 'sorder') || '1',
    onBottom: textField(form, 'onBottom') || '0',
  })
}

async function saveStoreImages(form: FormData, storeId: number) {
  const files = form.getAll('images').filter((entry): entry is File => entry instanceof File && entry.size > 0)
  if (!files.length) return

  if (files.length > 12) throw new Error('За один раз можно загрузить не более 12 фотографий.')
  for (const file of files) {
    if (!(file.type in imageExtensions)) throw new Error('Для фотографий магазина используйте JPG или PNG.')
    if (file.size > 2 * 1024 * 1024) throw new Error('Размер каждой фотографии не должен превышать 2 МБ.')
  }

  const directory = resolve(process.cwd(), '..', '..', 'public', 'stores')
  await mkdir(directory, { recursive: true })
  const [lastOrder] = await db.select({ value: max(storesImg.sorder) }).from(storesImg).where(eq(storesImg.storesId, storeId))
  let nextOrder = Number(lastOrder?.value ?? 0) + 1
  const inserted = []
  for (const file of files) {
    const extension = imageExtensions[file.type as keyof typeof imageExtensions]
    const name = `${randomUUID()}${extension}`
    await writeFile(join(directory, name), Buffer.from(await file.arrayBuffer()), { flag: 'wx' })
    inserted.push({ storesId: storeId, img: name, sorder: nextOrder++, isShown: 1 })
  }
  await db.insert(storesImg).values(inserted)
}

function operationError(error: unknown) {
  if (error instanceof z.ZodError) return NextResponse.json({ message: 'Проверьте обязательные названия и значения полей магазина.' }, { status: 400 })
  if (error instanceof Error && (error.message.startsWith('Для фотографий') || error.message.startsWith('Размер каждой') || error.message.startsWith('За один раз'))) {
    return NextResponse.json({ message: error.message }, { status: 400 })
  }
  console.error('Admin store operation failed', error)
  return NextResponse.json({ message: 'Не удалось сохранить магазин.' }, { status: 500 })
}

export async function POST(request: Request) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: 'Запрос отклонён.' }, { status: 403 })
  if (!await getCurrentAdmin()) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })
  try {
    const form = await request.formData()
    const fields = readFields(form)
    const [created] = await db.insert(stores).values({
      ...fields,
      coords: fields.coords || null,
      titleEn: null,
      descEn: '',
      textEn: null,
    })
    const id = Number(created.insertId)
    await saveStoreImages(form, id)
    const [store] = await db.select().from(stores).where(eq(stores.id, id)).limit(1)
    const images = await db.select().from(storesImg).where(eq(storesImg.storesId, id))
    return NextResponse.json({ store: { ...store, images } }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return operationError(error)
  }
}

export async function PATCH(request: Request) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: 'Запрос отклонён.' }, { status: 403 })
  if (!await getCurrentAdmin()) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })
  try {
    const form = await request.formData()
    const id = Number(textField(form, 'id'))
    if (!Number.isInteger(id) || id < 1) return NextResponse.json({ message: 'Магазин не найден.' }, { status: 400 })
    const [existing] = await db.select().from(stores).where(eq(stores.id, id)).limit(1)
    if (!existing) return NextResponse.json({ message: 'Магазин не найден.' }, { status: 404 })
    const fields = readFields(form)
    await db.update(stores).set({
      ...fields,
      coords: fields.coords || null,
      titleEn: existing.titleEn,
      descEn: existing.descEn,
      textEn: existing.textEn,
    }).where(eq(stores.id, id))

    const orderValue = form.get('imageOrder')
    if (typeof orderValue === 'string' && orderValue) {
      const imageOrders: unknown = JSON.parse(orderValue)
      if (!Array.isArray(imageOrders)) return NextResponse.json({ message: 'Проверьте порядок фотографий.' }, { status: 400 })
      for (const item of imageOrders) {
        if (!item || !Number.isInteger(item.id) || !Number.isInteger(item.sorder) || item.sorder < 0) continue
        await db.update(storesImg).set({ sorder: item.sorder }).where(and(eq(storesImg.id, item.id), eq(storesImg.storesId, id)))
      }
    }

    await saveStoreImages(form, id)
    const [store] = await db.select().from(stores).where(eq(stores.id, id)).limit(1)
    const images = await db.select().from(storesImg).where(eq(storesImg.storesId, id))
    return NextResponse.json({ store: { ...store, images } }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ message: 'Проверьте порядок фотографий.' }, { status: 400 })
    return operationError(error)
  }
}

export async function DELETE(request: Request) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: 'Запрос отклонён.' }, { status: 403 })
  if (!await getCurrentAdmin()) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })
  const id = Number(new URL(request.url).searchParams.get('id'))
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ message: 'Магазин не найден.' }, { status: 400 })
  const [store] = await db.select({ id: stores.id }).from(stores).where(eq(stores.id, id)).limit(1)
  if (!store) return NextResponse.json({ message: 'Магазин не найден.' }, { status: 404 })
  const [orderUsage] = await db.select({ value: count() }).from(orders).where(eq(orders.stores, id))
  if (Number(orderUsage?.value ?? 0) > 0) return NextResponse.json({ message: 'У магазина есть связанные заказы. Скрытие безопаснее удаления: отключите показ в редакторе.' }, { status: 409 })

  await db.delete(storesImg).where(eq(storesImg.storesId, id))
  await db.delete(stores).where(eq(stores.id, id))
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}
