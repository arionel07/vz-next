import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { and, asc, desc, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db'
import { getCurrentAdmin } from '@/lib/admin-auth'
import { brandCertificates, brands } from '../../../../../../drizzle/schema'

const fieldsSchema = z.object({
  brandId: z.coerce.number().int().positive(),
  id: z.coerce.number().int().positive().optional(),
  titleRu: z.string().trim().max(255).default(''),
  titleRo: z.string().trim().max(255).default(''),
  sorder: z.coerce.number().int().min(0).max(99999).default(0),
  isShown: z.coerce.number().int().min(0).max(1).default(1),
})

const imageTypes = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' } as const

function validSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  return !origin || origin === new URL(request.url).origin
}

function formText(form: FormData, name: string) {
  const value = form.get(name)
  return typeof value === 'string' ? value : ''
}

function parseFields(form: FormData) {
  return fieldsSchema.parse({
    brandId: formText(form, 'brandId'),
    id: formText(form, 'id') || undefined,
    titleRu: formText(form, 'titleRu'),
    titleRo: formText(form, 'titleRo'),
    sorder: formText(form, 'sorder') || '0',
    isShown: formText(form, 'isShown') || '1',
  })
}

async function saveCertificateImage(value: FormDataEntryValue | null) {
  if (!value || typeof value === 'string' || value.size === 0) return null
  const extension = imageTypes[value.type as keyof typeof imageTypes]
  if (!extension) throw new Error('Загрузите документ в формате JPG, PNG или WebP.')
  if (value.size > 15 * 1024 * 1024) throw new Error('Размер файла не должен превышать 15 МБ.')
  const fileName = `${randomUUID()}${extension}`
  const directory = resolve(process.cwd(), '..', '..', 'public', 'brand_certificates')
  await mkdir(directory, { recursive: true })
  await writeFile(join(directory, fileName), Buffer.from(await value.arrayBuffer()), { flag: 'wx' })
  return fileName
}

function operationError(error: unknown) {
  if (error instanceof z.ZodError) return NextResponse.json({ message: 'Проверьте поля сертификата.' }, { status: 400 })
  if (error instanceof Error && (error.message.startsWith('Загрузите') || error.message.startsWith('Размер'))) {
    return NextResponse.json({ message: error.message }, { status: 400 })
  }
  console.error('Admin brand certificate operation failed', error)
  return NextResponse.json({ message: 'Не удалось сохранить сертификат.' }, { status: 500 })
}

export async function GET(request: Request) {
  if (!await getCurrentAdmin()) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })
  const brandId = Number(new URL(request.url).searchParams.get('brandId'))
  if (!Number.isInteger(brandId) || brandId < 1) return NextResponse.json({ message: 'Бренд не найден.' }, { status: 400 })
  const [brand] = await db.select({ id: brands.id }).from(brands).where(eq(brands.id, brandId)).limit(1)
  if (!brand) return NextResponse.json({ message: 'Бренд не найден.' }, { status: 404 })
  const certificates = await db.select().from(brandCertificates)
    .where(eq(brandCertificates.brandId, brandId))
    .orderBy(asc(brandCertificates.sorder), desc(brandCertificates.id))
  return NextResponse.json({ certificates }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: 'Запрос отклонён.' }, { status: 403 })
  if (!await getCurrentAdmin()) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })
  try {
    const form = await request.formData()
    const fields = parseFields(form)
    const [brand] = await db.select({ id: brands.id }).from(brands).where(eq(brands.id, fields.brandId)).limit(1)
    if (!brand) return NextResponse.json({ message: 'Бренд не найден.' }, { status: 404 })
    const image = await saveCertificateImage(form.get('image'))
    if (!image) return NextResponse.json({ message: 'Выберите изображение сертификата.' }, { status: 400 })
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ')
    const [created] = await db.insert(brandCertificates).values({
      brandId: fields.brandId,
      titleRu: fields.titleRu || null,
      titleRo: fields.titleRo || null,
      image,
      sorder: fields.sorder,
      isShown: fields.isShown,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    const [certificate] = await db.select().from(brandCertificates).where(eq(brandCertificates.id, Number(created.insertId))).limit(1)
    return NextResponse.json({ certificate }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return operationError(error)
  }
}

export async function PATCH(request: Request) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: 'Запрос отклонён.' }, { status: 403 })
  if (!await getCurrentAdmin()) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })
  try {
    const form = await request.formData()
    const fields = parseFields(form)
    if (!fields.id) return NextResponse.json({ message: 'Сертификат не найден.' }, { status: 400 })
    const [existing] = await db.select().from(brandCertificates)
      .where(and(eq(brandCertificates.id, fields.id), eq(brandCertificates.brandId, fields.brandId))).limit(1)
    if (!existing) return NextResponse.json({ message: 'Сертификат не найден.' }, { status: 404 })
    const image = await saveCertificateImage(form.get('image'))
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ')
    await db.update(brandCertificates).set({
      titleRu: fields.titleRu || null,
      titleRo: fields.titleRo || null,
      image: image ?? existing.image,
      sorder: fields.sorder,
      isShown: fields.isShown,
      updatedAt: timestamp,
    }).where(and(eq(brandCertificates.id, fields.id), eq(brandCertificates.brandId, fields.brandId)))
    const [certificate] = await db.select().from(brandCertificates).where(eq(brandCertificates.id, fields.id)).limit(1)
    return NextResponse.json({ certificate }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return operationError(error)
  }
}

export async function DELETE(request: Request) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: 'Запрос отклонён.' }, { status: 403 })
  if (!await getCurrentAdmin()) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })
  const params = new URL(request.url).searchParams
  const brandId = Number(params.get('brandId'))
  const id = Number(params.get('id'))
  if (!Number.isInteger(brandId) || brandId < 1 || !Number.isInteger(id) || id < 1) {
    return NextResponse.json({ message: 'Сертификат не найден.' }, { status: 400 })
  }
  const [certificate] = await db.select({ id: brandCertificates.id }).from(brandCertificates)
    .where(and(eq(brandCertificates.id, id), eq(brandCertificates.brandId, brandId))).limit(1)
  if (!certificate) return NextResponse.json({ message: 'Сертификат не найден.' }, { status: 404 })
  await db.delete(brandCertificates).where(and(eq(brandCertificates.id, id), eq(brandCertificates.brandId, brandId)))
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}
