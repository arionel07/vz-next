import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db'
import { getCurrentAdmin } from '@/lib/admin-auth'
import { getAdminNewsItem, getAdminNewsList, type AdminContentStatus } from '@/lib/admin-editorial-content'
import { articles } from '../../../../../drizzle/schema'

const fieldsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  titleRu: z.string().trim().min(1).max(250),
  titleRo: z.string().trim().min(1).max(250),
  uriRu: z.string().trim().max(300).default(''),
  uriRo: z.string().trim().max(300).default(''),
  descRu: z.string().max(20000).default(''),
  descRo: z.string().max(20000).default(''),
  textRu: z.string().max(100000).default(''),
  textRo: z.string().max(100000).default(''),
  seoTitleRu: z.string().trim().max(250).default(''),
  seoTitleRo: z.string().trim().max(250).default(''),
  seoDescRu: z.string().max(20000).default(''),
  seoDescRo: z.string().max(20000).default(''),
  isShown: z.coerce.number().int().min(0).max(1).default(1),
  sorder: z.coerce.number().int().min(0).max(99999).default(1),
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
    .join('').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 300)
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
  if (value.size > 10 * 1024 * 1024) throw new Error('Размер изображения не должен превышать 10 МБ.')
  const fileName = `${randomUUID()}${extension}`
  const directory = resolve(process.cwd(), '..', '..', 'public', 'articles')
  await mkdir(directory, { recursive: true })
  await writeFile(join(directory, fileName), Buffer.from(await value.arrayBuffer()), { flag: 'wx' })
  return fileName
}

async function uniqueUri(value: string, title: string, language: 'ru' | 'ro', currentId?: number) {
  const rows = await db.select({ id: articles.id, uriRu: articles.uriRu, uriRo: articles.uriRo }).from(articles).where(eq(articles.isBlog, 0))
  const used = new Set(rows.filter((row) => row.id !== currentId).map((row) => language === 'ru' ? row.uriRu : row.uriRo))
  const base = slugify(value || title) || 'novost'
  let candidate = base
  let suffix = 2
  while (used.has(candidate)) candidate = `${base.slice(0, 295)}-${suffix++}`
  return candidate
}

function readFields(form: FormData) {
  const parsed = fieldsSchema.parse({
    date: textField(form, 'date'),
    titleRu: textField(form, 'titleRu'), titleRo: textField(form, 'titleRo'),
    uriRu: textField(form, 'uriRu'), uriRo: textField(form, 'uriRo'),
    descRu: textField(form, 'descRu'), descRo: textField(form, 'descRo'),
    textRu: textField(form, 'textRu'), textRo: textField(form, 'textRo'),
    seoTitleRu: textField(form, 'seoTitleRu'), seoTitleRo: textField(form, 'seoTitleRo'),
    seoDescRu: textField(form, 'seoDescRu'), seoDescRo: textField(form, 'seoDescRo'),
    isShown: textField(form, 'isShown') || '1', sorder: textField(form, 'sorder') || '1',
  })
  const timestamp = Date.parse(`${parsed.date}T00:00:00Z`)
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== parsed.date) throw new Error('Укажите корректную дату публикации.')
  return parsed
}

function responseForError(error: unknown) {
  if (error instanceof z.ZodError) return NextResponse.json({ message: 'Проверьте обязательные поля, даты и длину текста.' }, { status: 400 })
  if (error instanceof Error && (error.message.startsWith('Загрузите') || error.message.startsWith('Размер') || error.message.startsWith('Укажите'))) {
    return NextResponse.json({ message: error.message }, { status: 400 })
  }
  console.error('Admin news operation failed', error)
  return NextResponse.json({ message: 'Не удалось сохранить новость.' }, { status: 500 })
}

function revalidateNews(uriRu?: string, uriRo?: string) {
  revalidatePath('/ru/novosti')
  revalidatePath('/ro/noutati')
  if (uriRu) revalidatePath(`/ru/novosti/${uriRu}`)
  if (uriRo) revalidatePath(`/ro/noutati/${uriRo}`)
}

export async function GET(request: Request) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: 'Запрос отклонён.' }, { status: 403 })
  if (!await getCurrentAdmin()) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })
  const params = new URL(request.url).searchParams
  const status = ['all', 'shown', 'hidden'].includes(params.get('status') ?? '') ? params.get('status') as AdminContentStatus : 'all'
  const data = await getAdminNewsList({ query: params.get('q') ?? '', status, page: Number(params.get('page')) || 1 })
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: 'Запрос отклонён.' }, { status: 403 })
  if (!await getCurrentAdmin()) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })
  try {
    const form = await request.formData()
    const fields = readFields(form)
    const image = await saveImage(form.get('imgFile'))
    const [uriRu, uriRo] = await Promise.all([
      uniqueUri(fields.uriRu, fields.titleRu, 'ru'), uniqueUri(fields.uriRo, fields.titleRo, 'ro'),
    ])
    const [created] = await db.insert(articles).values({
      date: fields.date, titleRu: fields.titleRu, titleRo: fields.titleRo,
      titleEn: fields.titleRo, uriRu, uriRo, uriEn: uriRu,
      descRu: plainTextToHtml(fields.descRu), descRo: plainTextToHtml(fields.descRo), descEn: '',
      textRu: plainTextToHtml(fields.textRu), textRo: plainTextToHtml(fields.textRo), textEn: null,
      seoTitleRu: fields.seoTitleRu || null, seoTitleRo: fields.seoTitleRo || null,
      seoDescRu: fields.seoDescRu || null, seoDescRo: fields.seoDescRo || null,
      menuOn: 0, isShown: fields.isShown, isBlog: 0, sorder: fields.sorder, img: image,
    })
    const id = Number(created.insertId)
    const item = await getAdminNewsItem(id)
    revalidateNews(uriRu, uriRo)
    return NextResponse.json({ item }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return responseForError(error)
  }
}

export async function PATCH(request: Request) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: 'Запрос отклонён.' }, { status: 403 })
  if (!await getCurrentAdmin()) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })
  try {
    const form = await request.formData()
    const id = Number(textField(form, 'id'))
    if (!Number.isInteger(id) || id < 1) return NextResponse.json({ message: 'Новость не найдена.' }, { status: 400 })
    const existing = await getAdminNewsItem(id)
    if (!existing) return NextResponse.json({ message: 'Новость не найдена.' }, { status: 404 })
    const fields = readFields(form)
    const image = await saveImage(form.get('imgFile'))
    const [uriRu, uriRo] = await Promise.all([
      uniqueUri(fields.uriRu, fields.titleRu, 'ru', id), uniqueUri(fields.uriRo, fields.titleRo, 'ro', id),
    ])
    const descRu = fields.descRu === plainText(existing.descRu) ? existing.descRu : plainTextToHtml(fields.descRu)
    const descRo = fields.descRo === plainText(existing.descRo) ? existing.descRo : plainTextToHtml(fields.descRo)
    const textRu = fields.textRu === plainText(existing.textRu) ? existing.textRu : plainTextToHtml(fields.textRu)
    const textRo = fields.textRo === plainText(existing.textRo) ? existing.textRo : plainTextToHtml(fields.textRo)
    const img = image ?? (textField(form, 'removeImg') === '1' ? null : textField(form, 'img') || existing.img)
    await db.update(articles).set({
      date: fields.date, titleRu: fields.titleRu, titleRo: fields.titleRo,
      uriRu, uriRo, descRu, descRo, textRu, textRo,
      seoTitleRu: fields.seoTitleRu || null, seoTitleRo: fields.seoTitleRo || null,
      seoDescRu: fields.seoDescRu || null, seoDescRo: fields.seoDescRo || null,
      isShown: fields.isShown, sorder: fields.sorder, img,
    }).where(and(eq(articles.id, id), eq(articles.isBlog, 0)))
    const item = await getAdminNewsItem(id)
    revalidateNews(existing.uriRu, existing.uriRo)
    revalidateNews(uriRu, uriRo)
    return NextResponse.json({ item }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return responseForError(error)
  }
}

export async function DELETE(request: Request) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: 'Запрос отклонён.' }, { status: 403 })
  if (!await getCurrentAdmin()) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })
  const id = Number(new URL(request.url).searchParams.get('id'))
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ message: 'Новость не найдена.' }, { status: 400 })
  const existing = await getAdminNewsItem(id)
  if (!existing) return NextResponse.json({ message: 'Новость не найдена.' }, { status: 404 })
  await db.delete(articles).where(and(eq(articles.id, id), eq(articles.isBlog, 0)))
  revalidateNews(existing.uriRu, existing.uriRo)
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}
