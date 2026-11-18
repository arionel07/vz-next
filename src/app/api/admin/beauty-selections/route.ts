import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { and, asc, eq, inArray, like, or } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db'
import { getCurrentAdmin } from '@/lib/admin-auth'
import { getAdminBeautySelection, getAdminBeautySelectionList, type AdminContentStatus } from '@/lib/admin-editorial-content'
import { beautySelectionProducts, beautySelections, products } from '../../../../../drizzle/schema'

const fieldsSchema = z.object({
  titleRu: z.string().trim().min(1).max(255),
  titleRo: z.string().trim().min(1).max(255),
  uriRu: z.string().trim().max(255).default(''),
  uriRo: z.string().trim().max(255).default(''),
  descRu: z.string().max(20000).default(''),
  descRo: z.string().max(20000).default(''),
  textRu: z.string().max(100000).default(''),
  textRo: z.string().max(100000).default(''),
  seoTitleRu: z.string().trim().max(255).default(''),
  seoTitleRo: z.string().trim().max(255).default(''),
  seoDescRu: z.string().max(20000).default(''),
  seoDescRo: z.string().max(20000).default(''),
  isShown: z.coerce.number().int().min(0).max(1).default(1),
  sorder: z.coerce.number().int().min(0).max(99999).default(0),
  productIds: z.array(z.number().int().positive()).max(300),
})

const imageTypes = { 'image/avif': '.avif', 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' } as const

function validSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  return !origin || origin === new URL(request.url).origin
}

function textField(form: FormData, name: string) {
  const value = form.get(name)
  return typeof value === 'string' ? value : ''
}

function slugify(value: string) {
  const transliteration: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  }
  return value.toLocaleLowerCase('ru').split('').map((character) => transliteration[character] ?? character)
    .join('').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 255)
}

function plainTextToHtml(value: string) {
  const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
  return value.trim().split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean)
    .map((paragraph) => `<p>${paragraph.split(/\r?\n/).map(escape).join('<br>')}</p>`).join('')
}

function plainText(value: string | null | undefined) {
  return (value ?? '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|h[1-6]|li)>/gi, '\n\n').replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").trim()
}

function mysqlDate() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

async function saveImage(value: FormDataEntryValue | null) {
  if (!value || typeof value === 'string' || value.size === 0) return null
  const extension = imageTypes[value.type as keyof typeof imageTypes]
  if (!extension) throw new Error('Загрузите изображение JPG, PNG, WebP или AVIF.')
  if (value.size > 10 * 1024 * 1024) throw new Error('Размер одного изображения не должен превышать 10 МБ.')
  const fileName = `${randomUUID()}${extension}`
  const directory = resolve(process.cwd(), '..', '..', 'public', 'beauty_selections')
  await mkdir(directory, { recursive: true })
  await writeFile(join(directory, fileName), Buffer.from(await value.arrayBuffer()), { flag: 'wx' })
  return fileName
}

async function uniqueUri(value: string, title: string, language: 'ru' | 'ro', currentId?: number) {
  const rows = await db.select({ id: beautySelections.id, uriRu: beautySelections.uriRu, uriRo: beautySelections.uriRo }).from(beautySelections)
  const used = new Set(rows.filter((row) => row.id !== currentId).map((row) => language === 'ru' ? row.uriRu : row.uriRo))
  const base = slugify(value || title) || 'beauty-selection'
  let candidate = base
  let suffix = 2
  while (used.has(candidate)) candidate = `${base.slice(0, 248)}-${suffix++}`
  return candidate
}

function readFields(form: FormData) {
  let productIds: unknown = []
  const serializedProducts = textField(form, 'productIds')
  if (serializedProducts) {
    try { productIds = JSON.parse(serializedProducts) } catch { throw new Error('Проверьте список товаров в подборке.') }
  }
  const uniqueProductIds = Array.isArray(productIds) ? [...new Set(productIds)] : productIds
  return fieldsSchema.parse({
    titleRu: textField(form, 'titleRu'), titleRo: textField(form, 'titleRo'),
    uriRu: textField(form, 'uriRu'), uriRo: textField(form, 'uriRo'),
    descRu: textField(form, 'descRu'), descRo: textField(form, 'descRo'),
    textRu: textField(form, 'textRu'), textRo: textField(form, 'textRo'),
    seoTitleRu: textField(form, 'seoTitleRu'), seoTitleRo: textField(form, 'seoTitleRo'),
    seoDescRu: textField(form, 'seoDescRu'), seoDescRo: textField(form, 'seoDescRo'),
    isShown: textField(form, 'isShown') || '1', sorder: textField(form, 'sorder') || '0', productIds: uniqueProductIds,
  })
}

async function validateProductIds(productIds: number[]) {
  if (!productIds.length) return
  const rows = await db.select({ id: products.id }).from(products).where(inArray(products.id, productIds))
  if (rows.length !== productIds.length) throw new Error('Один или несколько выбранных товаров не найдены.')
}

function responseForError(error: unknown) {
  if (error instanceof z.ZodError) return NextResponse.json({ message: 'Проверьте обязательные поля, адреса страниц и список товаров.' }, { status: 400 })
  if (error instanceof Error && (error.message.startsWith('Загрузите') || error.message.startsWith('Размер') || error.message.startsWith('Проверьте') || error.message.startsWith('Один'))) {
    return NextResponse.json({ message: error.message }, { status: 400 })
  }
  console.error('Admin beauty selection operation failed', error)
  return NextResponse.json({ message: 'Не удалось сохранить подборку.' }, { status: 500 })
}

function revalidateSelections(uriRu?: string, uriRo?: string) {
  revalidatePath('/ru/beauty-selections')
  revalidatePath('/ro/beauty-selections')
  if (uriRu) revalidatePath(`/ru/beauty-selections/${uriRu}`)
  if (uriRo) revalidatePath(`/ro/beauty-selections/${uriRo}`)
}

export async function GET(request: Request) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: 'Запрос отклонён.' }, { status: 403 })
  if (!await getCurrentAdmin()) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })
  const params = new URL(request.url).searchParams
  if (params.get('products') === '1') {
    const query = params.get('q')?.trim() ?? ''
    if (query.length < 2) return NextResponse.json({ products: [] }, { headers: { 'Cache-Control': 'no-store' } })
    const search = `%${query}%`
    const matches = await db.select({ id: products.id, titleRu: products.titleRu, titleRo: products.titleRo })
      .from(products).where(or(like(products.titleRu, search), like(products.titleRo, search)))
      .orderBy(asc(products.titleRu)).limit(12)
    return NextResponse.json({ products: matches }, { headers: { 'Cache-Control': 'no-store' } })
  }
  const status = ['all', 'shown', 'hidden'].includes(params.get('status') ?? '') ? params.get('status') as AdminContentStatus : 'all'
  const data = await getAdminBeautySelectionList({ query: params.get('q') ?? '', status, page: Number(params.get('page')) || 1 })
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
}

async function saveSelection(form: FormData, id?: number) {
  try {
    const existing = id ? await getAdminBeautySelection(id) : null
    if (id && !existing) return NextResponse.json({ message: 'Подборка не найдена.' }, { status: 404 })
    const fields = readFields(form)
    await validateProductIds(fields.productIds)
    const [imageRu, imageRo, uriRu, uriRo] = await Promise.all([
      saveImage(form.get('imgRuFile')), saveImage(form.get('imgRoFile')),
      uniqueUri(fields.uriRu, fields.titleRu, 'ru', id), uniqueUri(fields.uriRo, fields.titleRo, 'ro', id),
    ])
    const imgRu = imageRu ?? (textField(form, 'removeImgRu') === '1' ? null : textField(form, 'imgRu') || existing?.imgRu || null)
    const imgRo = imageRo ?? (textField(form, 'removeImgRo') === '1' ? null : textField(form, 'imgRo') || existing?.imgRo || null)
    const now = mysqlDate()
    const descRu = fields.descRu === plainText(existing?.descRu) ? existing?.descRu ?? null : plainTextToHtml(fields.descRu) || null
    const descRo = fields.descRo === plainText(existing?.descRo) ? existing?.descRo ?? null : plainTextToHtml(fields.descRo) || null
    const textRu = fields.textRu === plainText(existing?.textRu) ? existing?.textRu ?? null : plainTextToHtml(fields.textRu) || null
    const textRo = fields.textRo === plainText(existing?.textRo) ? existing?.textRo ?? null : plainTextToHtml(fields.textRo) || null

    const savedId = await db.transaction(async (tx) => {
      let selectionId = id
      const values = {
        titleRu: fields.titleRu, titleRo: fields.titleRo, uriRu, uriRo,
        descRu, descRo, textRu, textRo, imgRu, imgRo,
        seoTitleRu: fields.seoTitleRu || null, seoTitleRo: fields.seoTitleRo || null,
        seoDescRu: fields.seoDescRu || null, seoDescRo: fields.seoDescRo || null,
        isShown: fields.isShown, sorder: fields.sorder, updatedAt: now,
      }
      if (selectionId) {
        await tx.update(beautySelections).set(values).where(eq(beautySelections.id, selectionId))
      } else {
        const [created] = await tx.insert(beautySelections).values({ ...values, createdAt: now })
        selectionId = Number(created.insertId)
      }
      if (!selectionId) throw new Error('Не удалось определить номер подборки.')
      await tx.delete(beautySelectionProducts).where(eq(beautySelectionProducts.selectionId, selectionId))
      if (fields.productIds.length) {
        await tx.insert(beautySelectionProducts).values(fields.productIds.map((productId, index) => ({ selectionId: selectionId!, productId, sorder: index })))
      }
      return selectionId
    })
    const selection = await getAdminBeautySelection(savedId)
    if (existing) revalidateSelections(existing.uriRu, existing.uriRo)
    revalidateSelections(uriRu, uriRo)
    return NextResponse.json({ selection }, { status: id ? 200 : 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return responseForError(error)
  }
}

export async function POST(request: Request) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: 'Запрос отклонён.' }, { status: 403 })
  if (!await getCurrentAdmin()) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })
  try {
    return await saveSelection(await request.formData())
  } catch (error) {
    return responseForError(error)
  }
}

export async function PATCH(request: Request) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: 'Запрос отклонён.' }, { status: 403 })
  if (!await getCurrentAdmin()) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })
  try {
    const formData = await request.formData()
    const id = Number(textField(formData, 'id'))
    if (!Number.isInteger(id) || id < 1) return NextResponse.json({ message: 'Подборка не найдена.' }, { status: 400 })
    return await saveSelection(formData, id)
  } catch (error) {
    return responseForError(error)
  }
}

export async function DELETE(request: Request) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: 'Запрос отклонён.' }, { status: 403 })
  if (!await getCurrentAdmin()) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })
  const id = Number(new URL(request.url).searchParams.get('id'))
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ message: 'Подборка не найдена.' }, { status: 400 })
  const existing = await getAdminBeautySelection(id)
  if (!existing) return NextResponse.json({ message: 'Подборка не найдена.' }, { status: 404 })
  await db.delete(beautySelections).where(eq(beautySelections.id, id))
  revalidateSelections(existing.uriRu, existing.uriRo)
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}
