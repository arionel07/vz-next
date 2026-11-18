import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { count, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db'
import { getCurrentAdmin } from '@/lib/admin-auth'
import { getProductIdsForBrand, syncProductsToMeilisearch } from '@/lib/admin-meilisearch-catalog-sync'
import { brandCertificates, brands, products } from '../../../../../drizzle/schema'

const fieldsSchema = z.object({
  title: z.string().trim().min(1).max(256),
  uri: z.string().trim().max(256).default(''),
  h1Ru: z.string().trim().max(255).default(''),
  h1Ro: z.string().trim().max(255).default(''),
  breadcrumbTitleRu: z.string().trim().max(255).default(''),
  breadcrumbTitleRo: z.string().trim().max(255).default(''),
  textRu: z.string().max(60000).default(''),
  textRo: z.string().max(60000).default(''),
  seoTitleRu: z.string().trim().max(255).default(''),
  seoTitleRo: z.string().trim().max(255).default(''),
  seoDescRu: z.string().max(10000).default(''),
  seoDescRo: z.string().max(10000).default(''),
  seoTextRu: z.string().max(100000).default(''),
  seoTextRo: z.string().max(100000).default(''),
  sorder: z.coerce.number().int().min(0).max(99999).default(0),
  top: z.coerce.number().int().min(0).max(1).default(0),
  isShown: z.coerce.number().int().min(0).max(1).default(1),
})

const imageTypes = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/avif': '.avif' } as const

function validSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  return !origin || origin === new URL(request.url).origin
}

function textField(form: FormData, name: string) {
  const value = form.get(name)
  return typeof value === 'string' ? value : ''
}

function mysqlDate() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

function slugify(value: string) {
  const transliteration: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  }
  return value.toLocaleLowerCase('ru').split('').map((character) => transliteration[character] ?? character).join('')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 256)
}

function readFields(form: FormData) {
  return fieldsSchema.parse({
    title: textField(form, 'title'), uri: textField(form, 'uri'),
    h1Ru: textField(form, 'h1Ru'), h1Ro: textField(form, 'h1Ro'),
    breadcrumbTitleRu: textField(form, 'breadcrumbTitleRu'), breadcrumbTitleRo: textField(form, 'breadcrumbTitleRo'),
    textRu: textField(form, 'textRu'), textRo: textField(form, 'textRo'),
    seoTitleRu: textField(form, 'seoTitleRu'), seoTitleRo: textField(form, 'seoTitleRo'),
    seoDescRu: textField(form, 'seoDescRu'), seoDescRo: textField(form, 'seoDescRo'),
    seoTextRu: textField(form, 'seoTextRu'), seoTextRo: textField(form, 'seoTextRo'),
    sorder: textField(form, 'sorder') || '0', top: textField(form, 'top') || '0', isShown: textField(form, 'isShown') || '1',
  })
}

async function saveBrandImage(value: FormDataEntryValue | null) {
  if (!value || typeof value === 'string' || value.size === 0) return null
  const extension = imageTypes[value.type as keyof typeof imageTypes]
  if (!extension) throw new Error('Загрузите изображение JPG, PNG, WebP или AVIF.')
  if (value.size > 10 * 1024 * 1024) throw new Error('Размер изображения не должен превышать 10 МБ.')
  const fileName = `${randomUUID()}${extension}`
  const directory = resolve(process.cwd(), '..', '..', 'public', 'brands')
  await mkdir(directory, { recursive: true })
  await writeFile(join(directory, fileName), Buffer.from(await value.arrayBuffer()), { flag: 'wx' })
  return fileName
}

function operationError(error: unknown) {
  if (error instanceof z.ZodError) return NextResponse.json({ message: 'Проверьте название, ссылки и длину полей бренда.' }, { status: 400 })
  if (error instanceof Error && (error.message.startsWith('Загрузите') || error.message.startsWith('Размер'))) {
    return NextResponse.json({ message: error.message }, { status: 400 })
  }
  console.error('Admin brand operation failed', error)
  return NextResponse.json({ message: 'Не удалось сохранить бренд.' }, { status: 500 })
}

export async function POST(request: Request) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: 'Запрос отклонён.' }, { status: 403 })
  if (!await getCurrentAdmin()) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })
  try {
    const form = await request.formData()
    const fields = readFields(form)
    const image = await saveBrandImage(form.get('imgFile'))
    const uri = slugify(fields.uri || fields.title)
    const timestamp = mysqlDate()
    const [created] = await db.insert(brands).values({
      guid: `NEXT-${randomUUID()}`,
      ...fields,
      uri,
      img: image,
      textEn: '',
      seoTitleEn: null,
      seoKeywordsRu: null,
      seoKeywordsRo: null,
      seoKeywordsEn: null,
      seoDescEn: null,
      updatedAt: timestamp,
      createdAt: timestamp,
    })
    const [brand] = await db.select().from(brands).where(eq(brands.id, Number(created.insertId))).limit(1)
    return NextResponse.json({ brand }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
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
    if (!Number.isInteger(id) || id < 1) return NextResponse.json({ message: 'Бренд не найден.' }, { status: 400 })
    const [existing] = await db.select().from(brands).where(eq(brands.id, id)).limit(1)
    if (!existing) return NextResponse.json({ message: 'Бренд не найден.' }, { status: 404 })
    const fields = readFields(form)
    const image = await saveBrandImage(form.get('imgFile'))
    const uri = slugify(fields.uri || fields.title)
    await db.update(brands).set({
      ...fields,
      uri,
      img: image ?? (textField(form, 'img') || existing.img),
      textEn: existing.textEn,
      seoTitleEn: existing.seoTitleEn,
      seoKeywordsRu: existing.seoKeywordsRu,
      seoKeywordsRo: existing.seoKeywordsRo,
      seoKeywordsEn: existing.seoKeywordsEn,
      seoDescEn: existing.seoDescEn,
      updatedAt: mysqlDate(),
    }).where(eq(brands.id, id))
    const [brand] = await db.select().from(brands).where(eq(brands.id, id)).limit(1)
    await syncProductsToMeilisearch(await getProductIdsForBrand(id)).catch((error) => console.error('Meilisearch sync failed', error))
    return NextResponse.json({ brand }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return operationError(error)
  }
}

export async function DELETE(request: Request) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: 'Запрос отклонён.' }, { status: 403 })
  if (!await getCurrentAdmin()) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })
  const id = Number(new URL(request.url).searchParams.get('id'))
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ message: 'Бренд не найден.' }, { status: 400 })
  const [brand] = await db.select({ id: brands.id }).from(brands).where(eq(brands.id, id)).limit(1)
  if (!brand) return NextResponse.json({ message: 'Бренд не найден.' }, { status: 404 })
  const [usage] = await db.select({ value: count() }).from(products).where(eq(products.brandId, id))
  if (Number(usage?.value ?? 0) > 0) return NextResponse.json({ message: 'Этот бренд используется товарами. Сначала назначьте им другой бренд или скройте бренд на сайте.' }, { status: 409 })
  const [certificateUsage] = await db.select({ value: count() }).from(brandCertificates).where(eq(brandCertificates.brandId, id))
  if (Number(certificateUsage?.value ?? 0) > 0) return NextResponse.json({ message: 'У бренда есть сертификаты. Удаление заблокировано, чтобы сохранить связанные данные.' }, { status: 409 })
  await db.delete(brands).where(eq(brands.id, id))
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}
