import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { asc, eq, inArray, like, or } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db'
import { getCurrentAdmin } from '@/lib/admin-auth'
import { getAdminOffer, getAdminOfferList, type AdminOfferStatus } from '@/lib/admin-offers'
import { giftPromotions, offers, offersProducts, products } from '../../../../../drizzle/schema'

const fieldsSchema = z.object({
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  titleRu: z.string().trim().min(1).max(256),
  titleRo: z.string().trim().min(1).max(256),
  uriRu: z.string().trim().max(256).default(''),
  uriRo: z.string().trim().max(256).default(''),
  descRu: z.string().max(1024).default(''),
  descRo: z.string().max(1024).default(''),
  sale: z.string().trim().max(32).default(''),
  isOnline: z.coerce.number().int().min(0).max(2).default(1),
  progressMode: z.enum(['time', 'stock', 'none']).default('time'),
  locationRu: z.string().max(254).default(''),
  locationRo: z.string().max(254).default(''),
  seoTitleRu: z.string().trim().max(255).default(''),
  seoTitleRo: z.string().trim().max(255).default(''),
  seoDescRu: z.string().max(20000).default(''),
  seoDescRo: z.string().max(20000).default(''),
  viewHome: z.coerce.number().int().min(0).max(1).default(0),
  isShown: z.coerce.number().int().min(0).max(1).default(1),
  sorder: z.coerce.number().int().min(0).max(99999).default(0),
  productIds: z.array(z.number().int().positive()).max(500),
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
    .join('').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 256)
}

function mysqlDate() {
  return new Date().toISOString().slice(0, 10)
}

async function saveImage(value: FormDataEntryValue | null) {
  if (!value || typeof value === 'string' || value.size === 0) return null
  const extension = imageTypes[value.type as keyof typeof imageTypes]
  if (!extension) throw new Error('Загрузите изображение JPG, PNG, WebP или AVIF.')
  if (value.size > 10 * 1024 * 1024) throw new Error('Размер одного изображения не должен превышать 10 МБ.')
  const fileName = `${randomUUID()}${extension}`
  const directory = resolve(process.cwd(), '..', '..', 'public', 'offers')
  await mkdir(directory, { recursive: true })
  await writeFile(join(directory, fileName), Buffer.from(await value.arrayBuffer()), { flag: 'wx' })
  return fileName
}

async function uniqueUri(value: string, title: string, language: 'ru' | 'ro', currentId?: number) {
  const rows = await db.select({ id: offers.id, uriRu: offers.uriRu, uriRo: offers.uriRo }).from(offers)
  const used = new Set(rows.filter((row) => row.id !== currentId).map((row) => language === 'ru' ? row.uriRu : row.uriRo).filter(Boolean))
  const base = slugify(value || title) || (language === 'ru' ? 'aktsiya' : 'promotie')
  let candidate = base
  let suffix = 2
  while (used.has(candidate)) candidate = `${base.slice(0, 248)}-${suffix++}`
  return candidate
}

function readFields(form: FormData) {
  let productIds: unknown = []
  const serialized = textField(form, 'productIds')
  if (serialized) {
    try { productIds = JSON.parse(serialized) } catch { throw new Error('Проверьте список привязанных товаров.') }
  }
  if (!Array.isArray(productIds) || productIds.some((id) => typeof id !== 'number' || !Number.isInteger(id) || id < 1)) {
    throw new Error('Проверьте список привязанных товаров.')
  }
  const parsed = fieldsSchema.parse({
    dateFrom: textField(form, 'dateFrom'), dateTo: textField(form, 'dateTo'),
    titleRu: textField(form, 'titleRu'), titleRo: textField(form, 'titleRo'),
    uriRu: textField(form, 'uriRu'), uriRo: textField(form, 'uriRo'),
    descRu: textField(form, 'descRu'), descRo: textField(form, 'descRo'), sale: textField(form, 'sale'),
    isOnline: textField(form, 'isOnline') || '1', progressMode: textField(form, 'progressMode') || 'time',
    locationRu: textField(form, 'locationRu'), locationRo: textField(form, 'locationRo'),
    seoTitleRu: textField(form, 'seoTitleRu'), seoTitleRo: textField(form, 'seoTitleRo'),
    seoDescRu: textField(form, 'seoDescRu'), seoDescRo: textField(form, 'seoDescRo'),
    viewHome: textField(form, 'viewHome') || '0', isShown: textField(form, 'isShown') || '1',
    sorder: textField(form, 'sorder') || '0', productIds: [...new Set(productIds)],
  })
  const validDate = (date: string) => {
    const parsedDate = Date.parse(`${date}T00:00:00Z`)
    return Number.isFinite(parsedDate) && new Date(parsedDate).toISOString().slice(0, 10) === date
  }
  if (!validDate(parsed.dateFrom) || !validDate(parsed.dateTo)) throw new Error('Укажите корректные даты акции.')
  if (parsed.dateTo < parsed.dateFrom) throw new Error('Дата окончания не может быть раньше даты начала.')
  return parsed
}

async function validateProductIds(productIds: number[]) {
  if (!productIds.length) return []
  const rows = await db.select({ id: products.id, sku: products.sku, titleRu: products.titleRu, titleRo: products.titleRo })
    .from(products).where(inArray(products.id, productIds))
  if (rows.length !== productIds.length) throw new Error('Один или несколько выбранных товаров не найдены.')
  const productsById = new Map(rows.map((row) => [row.id, row]))
  return productIds.map((id) => productsById.get(id)!)
}

function responseForError(error: unknown) {
  if (error instanceof z.ZodError) return NextResponse.json({ message: 'Проверьте обязательные поля, даты и длину текста.' }, { status: 400 })
  if (error instanceof Error && /^(Загрузите|Размер|Проверьте|Укажите|Дата окончания|Один или несколько)/.test(error.message)) {
    return NextResponse.json({ message: error.message }, { status: 400 })
  }
  console.error('Admin offer operation failed', error)
  return NextResponse.json({ message: 'Не удалось сохранить акцию.' }, { status: 500 })
}

function revalidateOffer(uriRu?: string | null, uriRo?: string | null) {
  revalidatePath('/ru/aktsii')
  revalidatePath('/ro/promotii')
  if (uriRu) revalidatePath(`/ru/aktsii/${uriRu}`)
  if (uriRo) revalidatePath(`/ro/promotii/${uriRo}`)
  revalidatePath('/ru')
  revalidatePath('/ro')
}

export async function GET(request: Request) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: 'Запрос отклонён.' }, { status: 403 })
  if (!await getCurrentAdmin()) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })
  const params = new URL(request.url).searchParams
  if (params.get('products') === '1') {
    const query = params.get('q')?.trim() ?? ''
    if (query.length < 2) return NextResponse.json({ products: [] }, { headers: { 'Cache-Control': 'no-store' } })
    const pattern = `%${query}%`
    const conditions = [like(products.titleRu, pattern), like(products.titleRo, pattern), like(products.sku, pattern)]
    if (/^\d+$/.test(query)) conditions.push(eq(products.id, Number(query)))
    const matches = await db.select({ id: products.id, sku: products.sku, titleRu: products.titleRu, titleRo: products.titleRo })
      .from(products).where(or(...conditions)).orderBy(asc(products.titleRu)).limit(12)
    return NextResponse.json({ products: matches.map((product) => ({ ...product, isShown: 1 })) }, { headers: { 'Cache-Control': 'no-store' } })
  }
  const status = ['all', 'shown', 'hidden'].includes(params.get('status') ?? '') ? params.get('status') as AdminOfferStatus : 'all'
  const data = await getAdminOfferList({ query: params.get('q') ?? '', status, page: Number(params.get('page')) || 1 })
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
}

async function saveOffer(form: FormData, id?: number) {
  try {
    const existing = id ? await getAdminOffer(id) : null
    if (id && !existing) return NextResponse.json({ message: 'Акция не найдена.' }, { status: 404 })
    const fields = readFields(form)
    const linkedProducts = await validateProductIds(fields.productIds)
    const [uploadedRu, uploadedRo, uploadedBru, uploadedBro] = await Promise.all([
      saveImage(form.get('imgRuFile')), saveImage(form.get('imgRoFile')),
      saveImage(form.get('imgBruFile')), saveImage(form.get('imgBroFile')),
    ])
    const imgRu = uploadedRu ?? (textField(form, 'imgRu') || existing?.imgRu || uploadedRo || '')
    const imgRo = uploadedRo ?? (textField(form, 'imgRo') || existing?.imgRo || imgRu)
    const imgBru = uploadedBru ?? (textField(form, 'imgBru') || existing?.imgBru || uploadedBro || '')
    const imgBro = uploadedBro ?? (textField(form, 'imgBro') || existing?.imgBro || imgBru)
    if (!imgRu || !imgRo) throw new Error('Загрузите изображение акции для карточки.')
    if (!imgBru || !imgBro) throw new Error('Загрузите изображение акции для страницы.')
    const [uriRu, uriRo] = await Promise.all([
      uniqueUri(fields.uriRu, fields.titleRu, 'ru', id), uniqueUri(fields.uriRo, fields.titleRo, 'ro', id),
    ])
    const now = mysqlDate()

    const savedId = await db.transaction(async (tx) => {
      let offerId = id
      const productVisibility = new Map(existing?.products.map((product) => [product.id, product.isShown]) ?? [])
      const values = {
        dateFrom: fields.dateFrom, dateTo: fields.dateTo,
        titleRu: fields.titleRu, titleRo: fields.titleRo, uriRu, uriRo,
        descRu: fields.descRu, descRo: fields.descRo, descEn: existing?.descEn ?? fields.descRu,
        sale: fields.sale, isOnline: fields.isOnline, progressMode: fields.progressMode,
        locationRu: fields.locationRu, locationRo: fields.locationRo,
        imgB: imgBru, imgRu, imgRo, imgBru, imgBro,
        seoTitleRu: fields.seoTitleRu || null, seoTitleRo: fields.seoTitleRo || null,
        seoDescRu: fields.seoDescRu || null, seoDescRo: fields.seoDescRo || null,
        viewHome: fields.viewHome, sorder: fields.sorder, isShown: fields.isShown, updatedAt: now,
      }
      if (offerId) {
        await tx.update(offers).set(values).where(eq(offers.id, offerId))
      } else {
        const [created] = await tx.insert(offers).values({ ...values, createdAt: now })
        offerId = Number(created.insertId)
      }
      if (!offerId) throw new Error('Не удалось определить номер акции.')
      await tx.delete(offersProducts).where(eq(offersProducts.offersId, offerId))
      if (linkedProducts.length) {
        await tx.insert(offersProducts).values(linkedProducts.map((product, index) => ({
          offersId: offerId!, productId: product.id,
          title: (product.titleRu || product.titleRo).slice(0, 255),
          sku: product.sku.slice(0, 32), sorder: index, isShown: productVisibility.get(product.id) ?? 1,
        })))
      }
      return offerId
    })
    const offer = await getAdminOffer(savedId)
    revalidateOffer(existing?.uriRu, existing?.uriRo)
    revalidateOffer(uriRu, uriRo)
    return NextResponse.json({ offer }, { status: id ? 200 : 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return responseForError(error)
  }
}

export async function POST(request: Request) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: 'Запрос отклонён.' }, { status: 403 })
  if (!await getCurrentAdmin()) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })
  try { return await saveOffer(await request.formData()) } catch (error) { return responseForError(error) }
}

export async function PATCH(request: Request) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: 'Запрос отклонён.' }, { status: 403 })
  if (!await getCurrentAdmin()) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })
  try {
    const form = await request.formData()
    const id = Number(textField(form, 'id'))
    if (!Number.isInteger(id) || id < 1) return NextResponse.json({ message: 'Акция не найдена.' }, { status: 400 })
    return await saveOffer(form, id)
  } catch (error) { return responseForError(error) }
}

export async function DELETE(request: Request) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: 'Запрос отклонён.' }, { status: 403 })
  if (!await getCurrentAdmin()) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })
  const id = Number(new URL(request.url).searchParams.get('id'))
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ message: 'Акция не найдена.' }, { status: 400 })
  const existing = await getAdminOffer(id)
  if (!existing) return NextResponse.json({ message: 'Акция не найдена.' }, { status: 404 })
  await db.transaction(async (tx) => {
    await tx.delete(offersProducts).where(eq(offersProducts.offersId, id))
    await tx.update(giftPromotions).set({ offerId: null }).where(eq(giftPromotions.offerId, id))
    await tx.delete(offers).where(eq(offers.id, id))
  })
  revalidateOffer(existing.uriRu, existing.uriRo)
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}
