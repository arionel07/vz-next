import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { and, count, eq, inArray } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db'
import { getCurrentAdmin } from '@/lib/admin-auth'
import { getProductIdsForCategoryTree, syncProductsToMeilisearch } from '@/lib/admin-meilisearch-catalog-sync'
import { categories, categoryBanner, productCategories, products } from '../../../../../drizzle/schema'

const fieldsSchema = z.object({
  parentId: z.coerce.number().int().min(0),
  featureType: z.coerce.number().int().min(0),
  titleRu: z.string().trim().min(1).max(256),
  titleRo: z.string().trim().min(1).max(256),
  h1Ru: z.string().trim().max(255).default(''),
  h1Ro: z.string().trim().max(255).default(''),
  breadcrumbTitleRu: z.string().trim().max(255).default(''),
  breadcrumbTitleRo: z.string().trim().max(255).default(''),
  uriRu: z.string().trim().max(256).default(''),
  uriRo: z.string().trim().max(256).default(''),
  descRu: z.string().max(60000).default(''),
  descRo: z.string().max(60000).default(''),
  seoTitleRu: z.string().trim().max(255).default(''),
  seoTitleRo: z.string().trim().max(255).default(''),
  seoDescRu: z.string().max(10000).default(''),
  seoDescRo: z.string().max(10000).default(''),
  seoTextRu: z.string().max(100000).default(''),
  seoTextRo: z.string().max(100000).default(''),
  searchTeg: z.string().trim().max(255).default(''),
  calculator: z.coerce.number().int().min(0).max(1).default(0),
  topMenu: z.coerce.number().int().min(0).max(1).default(0),
  footerMenu: z.coerce.number().int().min(0).max(1).default(0),
  wallpaper: z.coerce.number().int().min(0).max(1).default(0),
  isCustomMobile: z.coerce.number().int().min(0).max(1).default(0),
  isShown: z.coerce.number().int().min(0).max(1).default(1),
  sorder: z.coerce.number().int().min(0).max(99999).default(0),
})

const bannerFieldsSchema = z.object({
  titleRu: z.string().trim().max(256).default(''),
  titleRo: z.string().trim().max(256).default(''),
  uriRu: z.string().trim().max(256).default(''),
  uriRo: z.string().trim().max(256).default(''),
  descRu: z.string().trim().max(256).default(''),
  descRo: z.string().trim().max(256).default(''),
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
  return value.toLocaleLowerCase('ru').split('').map((character) => transliteration[character] ?? character)
    .join('').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 256)
}

async function uniqueUri(value: string, language: 'ru' | 'ro', currentId?: number) {
  const rows = await db.select({ id: categories.id, uriRu: categories.uriRu, uriRo: categories.uriRo }).from(categories)
  const used = new Set(rows.filter((row) => row.id !== currentId).map((row) => language === 'ru' ? row.uriRu : row.uriRo).filter(Boolean))
  const base = slugify(value) || 'category'
  let candidate = base
  let suffix = 1
  while (used.has(candidate)) candidate = `${base.slice(0, 250)}-${suffix++}`
  return candidate
}

function readFields(form: FormData) {
  return fieldsSchema.parse({
    parentId: textField(form, 'parentId') || '0', featureType: textField(form, 'featureType') || '0',
    titleRu: textField(form, 'titleRu'), titleRo: textField(form, 'titleRo'),
    h1Ru: textField(form, 'h1Ru'), h1Ro: textField(form, 'h1Ro'),
    breadcrumbTitleRu: textField(form, 'breadcrumbTitleRu'), breadcrumbTitleRo: textField(form, 'breadcrumbTitleRo'),
    uriRu: textField(form, 'uriRu'), uriRo: textField(form, 'uriRo'), descRu: textField(form, 'descRu'), descRo: textField(form, 'descRo'),
    seoTitleRu: textField(form, 'seoTitleRu'), seoTitleRo: textField(form, 'seoTitleRo'),
    seoDescRu: textField(form, 'seoDescRu'), seoDescRo: textField(form, 'seoDescRo'), seoTextRu: textField(form, 'seoTextRu'), seoTextRo: textField(form, 'seoTextRo'),
    searchTeg: textField(form, 'searchTeg'), calculator: textField(form, 'calculator') || '0', topMenu: textField(form, 'topMenu') || '0',
    footerMenu: textField(form, 'footerMenu') || '0', wallpaper: textField(form, 'wallpaper') || '0', isCustomMobile: textField(form, 'isCustomMobile') || '0',
    isShown: textField(form, 'isShown') || '1', sorder: textField(form, 'sorder') || '0',
  })
}

async function saveImage(value: FormDataEntryValue | null) {
  if (!value || typeof value === 'string' || value.size === 0) return null
  const extension = imageTypes[value.type as keyof typeof imageTypes]
  if (!extension) throw new Error('Загрузите изображение JPG, PNG, WebP или AVIF.')
  if (value.size > 10 * 1024 * 1024) throw new Error('Размер изображения не должен превышать 10 МБ.')
  const fileName = `${randomUUID()}${extension}`
  const directory = resolve(process.cwd(), '..', '..', 'public', 'categories')
  await mkdir(directory, { recursive: true })
  await writeFile(join(directory, fileName), Buffer.from(await value.arrayBuffer()), { flag: 'wx' })
  return fileName
}

async function readBannerDraft(form: FormData, slot: 1 | 2) {
  const prefix = `banner${slot}`
  const fields = bannerFieldsSchema.parse({
    titleRu: textField(form, `${prefix}TitleRu`), titleRo: textField(form, `${prefix}TitleRo`),
    uriRu: textField(form, `${prefix}UriRu`), uriRo: textField(form, `${prefix}UriRo`),
    descRu: textField(form, `${prefix}DescRu`), descRo: textField(form, `${prefix}DescRo`),
    isShown: textField(form, `${prefix}IsShown`) || '1',
  })
  const id = Number(textField(form, `${prefix}Id`)) || 0
  const image = await saveImage(form.get(`${prefix}ImgFile`))
  return { fields, id, image, remove: textField(form, `${prefix}Remove`) === '1', slot }
}

function apiError(error: unknown) {
  if (error instanceof z.ZodError) return NextResponse.json({ message: 'Проверьте обязательные RU/RO названия, ссылки и длину полей категории.' }, { status: 400 })
  if (error instanceof Error && ['Загрузите', 'Размер', 'Категория', 'Выберите', 'Выбранная', 'Нельзя'].some((prefix) => error.message.startsWith(prefix))) {
    return NextResponse.json({ message: error.message }, { status: 400 })
  }
  console.error('Admin category operation failed', error)
  return NextResponse.json({ message: 'Не удалось сохранить категорию.' }, { status: 500 })
}

async function getCategoryStep(parentId: number, currentId?: number) {
  const rows = await db.select({ id: categories.id, parentId: categories.parentId, step: categories.step }).from(categories)
  const byId = new Map(rows.map((row) => [row.id, row]))
  if (parentId > 0 && !byId.has(parentId)) throw new Error('Выбранная родительская категория не найдена.')
  if (currentId && parentId === currentId) throw new Error('Категория не может быть родителем самой себе.')

  if (currentId && parentId > 0) {
    const descendants = new Set<number>()
    let changed = true
    while (changed) {
      changed = false
      for (const row of rows) {
        if ((row.parentId === currentId || descendants.has(row.parentId)) && !descendants.has(row.id)) {
          descendants.add(row.id)
          changed = true
        }
      }
    }
    if (descendants.has(parentId)) throw new Error('Нельзя переместить категорию внутрь её дочернего раздела.')
  }

  return parentId === 0 ? 1 : (byId.get(parentId)?.step ?? 1) + 1
}

async function saveCategory(form: FormData, id?: number) {
  const fields = readFields(form)
  const [existing] = id ? await db.select().from(categories).where(eq(categories.id, id)).limit(1) : []
  if (id && !existing) return NextResponse.json({ message: 'Категория не найдена.' }, { status: 404 })
  const step = await getCategoryStep(fields.parentId, id)
  const [uriRu, uriRo, image, navImage, navHoverImage, bannerDrafts] = await Promise.all([
    uniqueUri(fields.uriRu || fields.titleRu, 'ru', id),
    uniqueUri(fields.uriRo || fields.titleRo, 'ro', id),
    saveImage(form.get('imgFile')),
    saveImage(form.get('imgNavFile')),
    saveImage(form.get('imgNavHoverFile')),
    Promise.all([readBannerDraft(form, 1), readBannerDraft(form, 2)]),
  ])
  const timestamp = mysqlDate()
  const categoryValues = {
    ...fields,
    parentId: fields.parentId,
    featureType: fields.featureType,
    step,
    uriRu,
    uriRo,
    img: textField(form, 'removeImg') === '1' ? null : image ?? (textField(form, 'img') || existing?.img || null),
    imgNav: textField(form, 'removeImgNav') === '1' ? '' : navImage ?? existing?.imgNav ?? '',
    imgNavHover: textField(form, 'removeImgNavHover') === '1' ? '' : navHoverImage ?? existing?.imgNavHover ?? '',
    updatedAt: timestamp,
  }

  const savedId = await db.transaction(async (tx) => {
    let categoryId = id
    if (existing && id) {
      await tx.update(categories).set({
        ...categoryValues,
        titleEn: existing.titleEn,
        uriEn: existing.uriEn,
        descEn: existing.descEn,
        seoTitleEn: existing.seoTitleEn,
        seoKeywordsRu: existing.seoKeywordsRu,
        seoKeywordsRo: existing.seoKeywordsRo,
        seoKeywordsEn: existing.seoKeywordsEn,
        seoDescEn: existing.seoDescEn,
      }).where(eq(categories.id, id))
    } else {
      const [created] = await tx.insert(categories).values({
        guid: `NEXT-${randomUUID()}`,
        ...categoryValues,
        titleEn: '', uriEn: '', descEn: '', seoTitleEn: null,
        seoKeywordsRu: null, seoKeywordsRo: null, seoKeywordsEn: null, seoDescEn: null,
        seoDescRu: fields.seoDescRu || null, seoDescRo: fields.seoDescRo || null,
        seoTextRu: fields.seoTextRu || null, seoTextRo: fields.seoTextRo || null,
        createdAt: timestamp,
      })
      categoryId = Number(created.insertId)
    }
    if (!categoryId) throw new Error('Не удалось определить номер категории.')

    const syncChildSteps = async (parentCategoryId: number, parentStep: number): Promise<void> => {
      const children = await tx.select({ id: categories.id }).from(categories).where(eq(categories.parentId, parentCategoryId))
      for (const child of children) {
        const childStep = parentStep + 1
        await tx.update(categories).set({ step: childStep }).where(eq(categories.id, child.id))
        await syncChildSteps(child.id, childStep)
      }
    }
    await syncChildSteps(categoryId, step)

    for (const draft of bannerDrafts) {
      const [banner] = draft.id
        ? await tx.select().from(categoryBanner).where(and(eq(categoryBanner.id, draft.id), eq(categoryBanner.categoryId, categoryId))).limit(1)
        : []
      if (draft.id && !banner) throw new Error('Баннер категории не найден.')
      if (draft.remove) {
        if (banner) await tx.delete(categoryBanner).where(eq(categoryBanner.id, banner.id))
        continue
      }
      const hasContent = Object.values(draft.fields).some((value) => typeof value === 'string' && value.trim()) || draft.image
      if (banner) {
        await tx.update(categoryBanner).set({
          ...draft.fields,
          titleEn: banner.titleEn,
          uriEn: banner.uriEn,
          descEn: banner.descEn,
          img: draft.image ?? banner.img,
          sorder: draft.slot,
          updatedAt: timestamp,
        }).where(eq(categoryBanner.id, banner.id))
      } else if (hasContent) {
        await tx.insert(categoryBanner).values({
          categoryId,
          ...draft.fields,
          titleEn: '', uriEn: '', descEn: '',
          img: draft.image,
          sorder: draft.slot,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
      }
    }

    return categoryId
  })

  if (id) await syncProductsToMeilisearch(await getProductIdsForCategoryTree(savedId)).catch((error) => console.error('Meilisearch sync failed', error))
  return NextResponse.json({ ok: true, id: savedId }, { status: id ? 200 : 201, headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: 'Запрос отклонён.' }, { status: 403 })
  if (!await getCurrentAdmin()) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })
  try {
    return await saveCategory(await request.formData())
  } catch (error) {
    return apiError(error)
  }
}

export async function PATCH(request: Request) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: 'Запрос отклонён.' }, { status: 403 })
  if (!await getCurrentAdmin()) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })
  try {
    const form = await request.formData()
    const id = Number(textField(form, 'id'))
    if (!Number.isInteger(id) || id < 1) return NextResponse.json({ message: 'Категория не найдена.' }, { status: 400 })

    if (textField(form, 'action') === 'quick') {
      const [existing] = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, id)).limit(1)
      if (!existing) return NextResponse.json({ message: 'Категория не найдена.' }, { status: 404 })
      const patch: Record<string, number> = {}
      for (const field of ['isShown', 'topMenu', 'isCustomMobile', 'sorder'] as const) {
        const value = form.get(field)
        if (typeof value !== 'string' || value === '') continue
        const parsed = Number(value)
        if (!Number.isInteger(parsed) || parsed < 0 || parsed > (field === 'sorder' ? 99999 : 1)) return NextResponse.json({ message: 'Проверьте значение порядка или переключателя.' }, { status: 400 })
        patch[field] = parsed
      }
      if (!Object.keys(patch).length) return NextResponse.json({ message: 'Нет изменений для сохранения.' }, { status: 400 })
      await db.update(categories).set({ ...patch, updatedAt: mysqlDate() }).where(eq(categories.id, id))
      return NextResponse.json({ ok: true, id, patch }, { headers: { 'Cache-Control': 'no-store' } })
    }

    return await saveCategory(form, id)
  } catch (error) {
    return apiError(error)
  }
}

export async function DELETE(request: Request) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: 'Запрос отклонён.' }, { status: 403 })
  if (!await getCurrentAdmin()) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })
  const id = Number(new URL(request.url).searchParams.get('id'))
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ message: 'Категория не найдена.' }, { status: 400 })
  const [category] = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, id)).limit(1)
  if (!category) return NextResponse.json({ message: 'Категория не найдена.' }, { status: 404 })

  const [childCount, primaryCount, relationCount] = await Promise.all([
    db.select({ value: count() }).from(categories).where(eq(categories.parentId, id)),
    db.select({ value: count() }).from(products).where(eq(products.categoryId, id)),
    db.select({ value: count() }).from(productCategories).where(eq(productCategories.categoryId, id)),
  ])
  if (Number(childCount[0]?.value ?? 0) > 0) return NextResponse.json({ message: 'У категории есть дочерние разделы. Сначала переместите или удалите их.' }, { status: 409 })
  if (Number(primaryCount[0]?.value ?? 0) + Number(relationCount[0]?.value ?? 0) > 0) return NextResponse.json({ message: 'Категория используется товарами. Сначала назначьте им другие категории.' }, { status: 409 })

  await db.transaction(async (tx) => {
    await tx.delete(categoryBanner).where(eq(categoryBanner.categoryId, id))
    await tx.delete(categories).where(eq(categories.id, id))
  })
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}
