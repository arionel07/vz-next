import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { asc, desc, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db'
import { getCurrentAdmin } from '@/lib/admin-auth'
import { banners } from '../../../../../drizzle/schema'

const fieldsSchema = z.object({
  titleRu: z.string().trim().min(1).max(250),
  titleRo: z.string().trim().min(1).max(250),
  uriRu: z.string().trim().max(300).default(''),
  uriRo: z.string().trim().max(300).default(''),
  colorText: z.string().trim().min(1).max(32).default('#ffffff'),
  colorButton: z.string().trim().min(1).max(32).default('#111111'),
  colorButtonText: z.string().trim().min(1).max(32).default('#ffffff'),
  isShown: z.coerce.number().int().min(0).max(1).default(1),
  sorder: z.coerce.number().int().min(0).max(99999).default(1),
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

async function saveImage(value: FormDataEntryValue | null) {
  if (!value || typeof value === 'string' || value.size === 0) return null
  const extension = imageTypes[value.type as keyof typeof imageTypes]
  if (!extension) throw new Error('Загрузите изображение JPG, PNG, WebP, AVIF или GIF.')
  if (value.size > 20 * 1024 * 1024) throw new Error('Размер одного изображения не должен превышать 20 МБ.')

  const fileName = `${randomUUID()}${extension}`
  const directory = resolve(process.cwd(), '..', '..', 'public', 'banners')
  await mkdir(directory, { recursive: true })
  await writeFile(join(directory, fileName), Buffer.from(await value.arrayBuffer()), { flag: 'wx' })
  return fileName
}

function readBannerFields(form: FormData) {
  return fieldsSchema.parse({
    titleRu: textField(form, 'titleRu'),
    titleRo: textField(form, 'titleRo'),
    uriRu: textField(form, 'uriRu'),
    uriRo: textField(form, 'uriRo'),
    colorText: textField(form, 'colorText') || '#ffffff',
    colorButton: textField(form, 'colorButton') || '#111111',
    colorButtonText: textField(form, 'colorButtonText') || '#ffffff',
    isShown: textField(form, 'isShown') || '1',
    sorder: textField(form, 'sorder') || '1',
  })
}

function databaseError(error: unknown) {
  if (error instanceof z.ZodError) return NextResponse.json({ message: 'Проверьте названия, ссылки и порядок баннера.' }, { status: 400 })
  if (error instanceof Error && (error.message.startsWith('Загрузите') || error.message.startsWith('Размер'))) {
    return NextResponse.json({ message: error.message }, { status: 400 })
  }
  console.error('Admin banner operation failed', error)
  return NextResponse.json({ message: 'Не удалось сохранить баннер.' }, { status: 500 })
}

export async function GET(request: Request) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: 'Запрос отклонён.' }, { status: 403 })
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })
  const rows = await db.select().from(banners).orderBy(asc(banners.sorder), desc(banners.id))
  return NextResponse.json(rows, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: 'Запрос отклонён.' }, { status: 403 })
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })

  try {
    const form = await request.formData()
    const fields = readBannerFields(form)
    const desktopImage = await saveImage(form.get('imgFile'))
    if (!desktopImage) return NextResponse.json({ message: 'Добавьте основное изображение баннера.' }, { status: 400 })
    const mobileImage = await saveImage(form.get('imgMobFile'))
    const [created] = await db.insert(banners).values({
      ...fields,
      titleEn: fields.titleRu,
      uriEn: fields.uriRu,
      img: desktopImage,
      imgMob: mobileImage ?? desktopImage,
    })
    const [banner] = await db.select().from(banners).where(eq(banners.id, Number(created.insertId))).limit(1)
    return NextResponse.json({ banner }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return databaseError(error)
  }
}

export async function PATCH(request: Request) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: 'Запрос отклонён.' }, { status: 403 })
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })

  try {
    const form = await request.formData()
    const id = Number(textField(form, 'id'))
    if (!Number.isInteger(id) || id < 1) return NextResponse.json({ message: 'Баннер не найден.' }, { status: 400 })
    const [existing] = await db.select().from(banners).where(eq(banners.id, id)).limit(1)
    if (!existing) return NextResponse.json({ message: 'Баннер не найден.' }, { status: 404 })

    const fields = readBannerFields(form)
    const desktopImage = await saveImage(form.get('imgFile'))
    const mobileImage = await saveImage(form.get('imgMobFile'))
    const img = desktopImage ?? (textField(form, 'img') || existing.img)
    const imgMob = mobileImage ?? (textField(form, 'imgMob') || existing.imgMob || img || '')
    await db.update(banners).set({
      ...fields,
      titleEn: existing.titleEn ?? fields.titleRu,
      uriEn: existing.uriEn || fields.uriRu,
      img,
      imgMob,
    }).where(eq(banners.id, id))
    const [banner] = await db.select().from(banners).where(eq(banners.id, id)).limit(1)
    return NextResponse.json({ banner }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return databaseError(error)
  }
}

export async function DELETE(request: Request) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: 'Запрос отклонён.' }, { status: 403 })
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })
  const id = Number(new URL(request.url).searchParams.get('id'))
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ message: 'Баннер не найден.' }, { status: 400 })
  await db.delete(banners).where(eq(banners.id, id))
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}
