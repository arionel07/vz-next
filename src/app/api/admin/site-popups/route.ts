import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { asc, desc, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db'
import { getCurrentAdmin } from '@/lib/admin-auth'
import { sitePopups } from '../../../../../drizzle/schema'

function emptyToUndefined(value: unknown) {
  return typeof value === 'string' && value.trim() === '' ? undefined : value
}

const fieldsSchema = z.object({
  titleRu: z.string().trim().min(1).max(255),
  titleRo: z.string().trim().min(1).max(255),
  textRu: z.string().trim().min(1).max(20000),
  textRo: z.string().trim().min(1).max(20000),
  ctaLabelRu: z.string().trim().max(128).default(''),
  ctaLabelRo: z.string().trim().max(128).default(''),
  ctaUrl: z.string().trim().max(255).default(''),
  audience: z.enum(['all', 'guest', 'authenticated']).default('all'),
  startAt: z.preprocess(emptyToUndefined, z.string().trim().max(32).optional()),
  endAt: z.preprocess(emptyToUndefined, z.string().trim().max(32).optional()),
  reshowDays: z.coerce.number().int().min(0).max(365).default(1),
  isShown: z.coerce.number().int().min(0).max(1).default(1),
  sorder: z.coerce.number().int().min(0).max(99999).default(0),
})

const imageTypes = {
  'image/avif': '.avif',
  'image/gif': '.gif',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
} as const

function validSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  return !origin || origin === new URL(request.url).origin
}

function textField(form: FormData, name: string) {
  const value = form.get(name)
  return typeof value === 'string' ? value : ''
}

/** Datetime-local input ("2026-11-17T10:00") -> MySQL "YYYY-MM-DD HH:mm:ss". */
function toMysqlDatetime(value: string | undefined) {
  if (!value) return null
  const normalized = value.replace('T', ' ')
  return normalized.length === 16 ? `${normalized}:00` : normalized
}

async function saveImage(value: FormDataEntryValue | null) {
  if (!value || typeof value === 'string' || value.size === 0) return null
  const extension = imageTypes[value.type as keyof typeof imageTypes]
  if (!extension) throw new Error('Загрузите изображение JPG, PNG, WebP, AVIF или GIF.')
  if (value.size > 20 * 1024 * 1024) throw new Error('Размер изображения не должен превышать 20 МБ.')

  const fileName = `${randomUUID()}${extension}`
  const directory = resolve(process.cwd(), '..', '..', 'public', 'popups')
  await mkdir(directory, { recursive: true })
  await writeFile(join(directory, fileName), Buffer.from(await value.arrayBuffer()), { flag: 'wx' })
  return fileName
}

function readPopupFields(form: FormData) {
  return fieldsSchema.parse({
    titleRu: textField(form, 'titleRu'),
    titleRo: textField(form, 'titleRo'),
    textRu: textField(form, 'textRu'),
    textRo: textField(form, 'textRo'),
    ctaLabelRu: textField(form, 'ctaLabelRu'),
    ctaLabelRo: textField(form, 'ctaLabelRo'),
    ctaUrl: textField(form, 'ctaUrl'),
    audience: textField(form, 'audience') || 'all',
    startAt: textField(form, 'startAt'),
    endAt: textField(form, 'endAt'),
    reshowDays: textField(form, 'reshowDays') || '1',
    isShown: textField(form, 'isShown') || '1',
    sorder: textField(form, 'sorder') || '0',
  })
}

function operationError(error: unknown) {
  if (error instanceof z.ZodError) return NextResponse.json({ message: 'Проверьте заполненные поля попапа.' }, { status: 400 })
  if (error instanceof Error && (error.message.startsWith('Загрузите') || error.message.startsWith('Размер'))) {
    return NextResponse.json({ message: error.message }, { status: 400 })
  }
  console.error('Admin site popup operation failed', error)
  return NextResponse.json({ message: 'Не удалось сохранить попап.' }, { status: 500 })
}

function mysqlNow() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

export async function GET(request: Request) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: 'Запрос отклонён.' }, { status: 403 })
  if (!await getCurrentAdmin()) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })
  const rows = await db.select().from(sitePopups).orderBy(desc(sitePopups.sorder), asc(sitePopups.id))
  return NextResponse.json(rows, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: 'Запрос отклонён.' }, { status: 403 })
  if (!await getCurrentAdmin()) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })

  try {
    const form = await request.formData()
    const fields = readPopupFields(form)
    const image = await saveImage(form.get('imgFile'))
    const timestamp = mysqlNow()
    const [created] = await db.insert(sitePopups).values({
      ...fields,
      startAt: toMysqlDatetime(fields.startAt),
      endAt: toMysqlDatetime(fields.endAt),
      image,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    const [popup] = await db.select().from(sitePopups).where(eq(sitePopups.id, Number(created.insertId))).limit(1)
    return NextResponse.json({ popup }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
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
    if (!Number.isInteger(id) || id < 1) return NextResponse.json({ message: 'Попап не найден.' }, { status: 400 })
    const [existing] = await db.select().from(sitePopups).where(eq(sitePopups.id, id)).limit(1)
    if (!existing) return NextResponse.json({ message: 'Попап не найден.' }, { status: 404 })

    const fields = readPopupFields(form)
    const image = await saveImage(form.get('imgFile'))
    await db.update(sitePopups).set({
      ...fields,
      startAt: toMysqlDatetime(fields.startAt),
      endAt: toMysqlDatetime(fields.endAt),
      image: image ?? (textField(form, 'image') || existing.image),
      updatedAt: mysqlNow(),
    }).where(eq(sitePopups.id, id))
    const [popup] = await db.select().from(sitePopups).where(eq(sitePopups.id, id)).limit(1)
    return NextResponse.json({ popup }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return operationError(error)
  }
}

export async function DELETE(request: Request) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: 'Запрос отклонён.' }, { status: 403 })
  if (!await getCurrentAdmin()) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })
  const id = Number(new URL(request.url).searchParams.get('id'))
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ message: 'Попап не найден.' }, { status: 400 })
  await db.delete(sitePopups).where(eq(sitePopups.id, id))
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}
