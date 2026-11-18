import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { and, eq, inArray, or, sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db'
import { getCurrentAdmin } from '@/lib/admin-auth'
import { syncProductsToMeilisearch } from '@/lib/admin-meilisearch-catalog-sync'
import {
  beautySelectionProducts,
  brands,
  categories,
  gifts,
  homeBrandSectionProducts,
  homeProductItems,
  offersProducts,
  ordersProducts,
  productCategories,
  productSearch,
  products,
  productsFeatures,
  productsImg,
  productsMore,
  productsRelated,
  productsVariable,
  productsVariableImg,
  shopCartItems,
  wishlistItems,
} from '../../../../../drizzle/schema'

const imageTypes = {
  'image/avif': '.avif',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
} as const

const variantSchema = z.object({
  id: z.number().int().positive().nullable(),
  sku: z.string().max(32),
  titleRu: z.string().max(256),
  titleRo: z.string().max(255),
  titleEn: z.string().max(255),
  colorRu: z.string().max(254),
  colorRo: z.string().max(254),
  colorEn: z.string().max(254),
  colorHex: z.string().max(7),
  volume: z.string().max(254),
  price: z.string().max(32),
  discountPrice: z.string().max(32),
  qty: z.string().max(12),
  sorder: z.string().max(12),
  isShown: z.boolean(),
})

const gallerySchema = z.array(z.object({
  id: z.number().int().positive(),
  sorder: z.number().int().min(0).max(99999),
  isShown: z.number().int().min(0).max(1),
})).max(100)

const productDeleteSchema = z.object({ ids: z.array(z.number().int().positive()).min(1).max(100) })

function validSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  return !origin || origin === new URL(request.url).origin
}

function textField(form: FormData, name: string) {
  const value = form.get(name)
  return typeof value === 'string' ? value.trim() : ''
}

function mysqlDate() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

function parseInteger(value: string, fallback = 0) {
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : fallback
}

function parsePrice(value: string) {
  if (!value) return null
  const normalized = value.replace(/\s/g, '').replace(',', '.')
  const number = Number(normalized)
  return Number.isFinite(number) && number >= 0 ? number : null
}

function slugify(value: string) {
  const transliteration: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  }
  return value.toLocaleLowerCase('ru')
    .split('').map((character) => transliteration[character] ?? character)
    .join('').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 250)
}

function parseJson<T>(value: string, schema: z.ZodType<T>, fallback: T) {
  if (!value) return fallback
  return schema.parse(JSON.parse(value))
}

function readCategoryIds(form: FormData) {
  const ids = form.getAll('categoryIds')
    .filter((value): value is string => typeof value === 'string')
    .map((value) => Number(value))
  if (ids.some((id) => !Number.isInteger(id) || id < 1)) throw new Error('Выберите корректные категории товара.')
  return [...new Set(ids)]
}

async function saveProductImages(form: FormData) {
  const uploaded: { fileName: string; path: string }[] = []
  const directory = resolve(process.cwd(), '..', '..', 'public', 'products')
  const values = form.getAll('images')
  try {
    for (const value of values) {
      if (typeof value === 'string' || value.size === 0) continue
      const extension = imageTypes[value.type as keyof typeof imageTypes]
      if (!extension) throw new Error('Изображения товара: используйте JPG, PNG, WebP или AVIF.')
      if (value.size > 2 * 1024 * 1024) throw new Error('Изображение товара не должно превышать 2 МБ.')
      await mkdir(directory, { recursive: true })
      const fileName = `${randomUUID()}${extension}`
      const path = join(directory, fileName)
      await writeFile(path, Buffer.from(await value.arrayBuffer()), { flag: 'wx' })
      uploaded.push({ fileName, path })
    }
    return uploaded
  } catch (error) {
    await Promise.all(uploaded.map((file) => unlink(file.path).catch(() => undefined)))
    throw error
  }
}

async function saveVariantImages(form: FormData, variantCount: number) {
  const uploaded: { index: number; fileName: string; path: string }[] = []
  const directory = resolve(process.cwd(), '..', '..', 'public', 'products')
  try {
    for (let index = 0; index < variantCount; index += 1) {
      const value = form.get(`variantImage_${index}`)
      if (!value || typeof value === 'string' || value.size === 0) continue
      const extension = imageTypes[value.type as keyof typeof imageTypes]
      if (!extension) throw new Error('Изображения варианта: используйте JPG, PNG, WebP или AVIF.')
      if (value.size > 2 * 1024 * 1024) throw new Error('Изображение варианта не должно превышать 2 МБ.')
      await mkdir(directory, { recursive: true })
      const fileName = `${randomUUID()}${extension}`
      const path = join(directory, fileName)
      await writeFile(path, Buffer.from(await value.arrayBuffer()), { flag: 'wx' })
      uploaded.push({ index, fileName, path })
    }
    return uploaded
  } catch (error) {
    await Promise.all(uploaded.map((file) => unlink(file.path).catch(() => undefined)))
    throw error
  }
}

function readProductFields(form: FormData) {
  const titleRu = textField(form, 'titleRu')
  const titleRo = textField(form, 'titleRo') || titleRu
  const titleEn = textField(form, 'titleEn') || titleRo || titleRu
  const price = parsePrice(textField(form, 'price'))
  const discountPrice = parsePrice(textField(form, 'discountPrice'))
  const categoryIds = readCategoryIds(form)
  const brandId = Math.max(0, parseInteger(textField(form, 'brandId')))
  const isGift = textField(form, 'isGift') === '1' ? 1 : 0
  const requestedVisibility = textField(form, 'isShown') === '0' ? 0 : 1
  const isShown = isGift ? 0 : requestedVisibility
  const isNew = textField(form, 'isNew') === '1' ? 1 : 0
  const bestSelling = textField(form, 'bestSelling') === '1' ? 1 : 0
  const saleAmount = price !== null && discountPrice !== null && price > discountPrice ? price - discountPrice : 0
  const salePercent = saleAmount && price ? Math.round(saleAmount / price * 100) : 0

  const fields = z.object({
    sku: z.string().trim().min(1).max(128),
    titleRu: z.string().trim().min(1).max(256),
    titleRo: z.string().trim().min(1).max(255),
    titleEn: z.string().trim().min(1).max(255),
    uriRu: z.string().trim().max(256),
    uriRo: z.string().trim().max(256),
    uriEn: z.string().trim().max(255),
    volume: z.string().trim().max(32),
    descRu: z.string().max(255),
    descRo: z.string().max(255),
    descEn: z.string().max(255),
    textRu: z.string(),
    textRo: z.string(),
    textEn: z.string(),
    searchTeg: z.string().trim().max(255),
    seoTitleRu: z.string().max(250),
    seoTitleRo: z.string().max(250),
    seoDescRu: z.string(),
    seoDescRo: z.string(),
  }).parse({
    sku: textField(form, 'sku'),
    titleRu,
    titleRo,
    titleEn,
    uriRu: textField(form, 'uriRu'),
    uriRo: textField(form, 'uriRo'),
    uriEn: textField(form, 'uriEn'),
    volume: textField(form, 'volume'),
    descRu: textField(form, 'descRu'),
    descRo: textField(form, 'descRo'),
    descEn: textField(form, 'descEn'),
    textRu: String(form.get('textRu') ?? ''),
    textRo: String(form.get('textRo') ?? ''),
    textEn: String(form.get('textEn') ?? ''),
    searchTeg: textField(form, 'searchTeg') || titleRu,
    seoTitleRu: textField(form, 'seoTitleRu'),
    seoTitleRo: textField(form, 'seoTitleRo'),
    seoDescRu: String(form.get('seoDescRu') ?? ''),
    seoDescRo: String(form.get('seoDescRo') ?? ''),
  })

  return {
    ...fields,
    price,
    discountPrice,
    categoryIds,
    brandId,
    isShown,
    isGift,
    isNew,
    bestSelling,
    saleMdl: Math.round(saleAmount),
    salePercent,
    uriRu: slugify(fields.uriRu || titleRu),
    uriRo: slugify(fields.uriRo || titleRo),
    uriEn: slugify(fields.uriEn || titleEn) || slugify(titleRu),
  }
}

function readVariants(form: FormData) {
  const drafts = parseJson(textField(form, 'variants'), z.array(variantSchema).max(100), [])
  return drafts.map((draft, index) => {
    const price = parsePrice(draft.price)
    const discountPrice = parsePrice(draft.discountPrice)
    if (draft.colorHex && !/^#[\da-f]{6}$/i.test(draft.colorHex)) throw new Error('Цвет варианта должен быть шестизначным HEX-кодом.')
    return {
      ...draft,
      sku: draft.sku.trim() || null,
      titleRu: draft.titleRu.trim() || null,
      titleRo: draft.titleRo.trim() || draft.titleRu.trim() || 'Вариант',
      titleEn: draft.titleEn.trim() || draft.titleRo.trim() || draft.titleRu.trim() || 'Variant',
      colorRu: draft.colorRu.trim() || draft.colorRo.trim() || draft.colorEn.trim() || 'Вариант',
      colorRo: draft.colorRo.trim() || draft.colorRu.trim() || draft.colorEn.trim() || 'Variant',
      colorEn: draft.colorEn.trim() || draft.colorRo.trim() || draft.colorRu.trim() || 'Variant',
      colorHex: draft.colorHex || null,
      volumeVar: draft.volume.trim(),
      price,
      discountPrice: discountPrice === null ? '' : String(discountPrice),
      qty: Math.max(0, parseInteger(draft.qty)),
      sorder: Math.max(0, parseInteger(draft.sorder, index + 1)),
      isShown: draft.isShown ? 1 : 0,
    }
  })
}

function requestError(error: unknown) {
  if (error instanceof z.ZodError) return NextResponse.json({ message: 'Проверьте обязательные поля и допустимую длину значений.' }, { status: 400 })
  if (error instanceof Error && (error.message.startsWith('Изображения товара:') || error.message.startsWith('Изображение товара') || error.message.startsWith('Изображения варианта:') || error.message.startsWith('Изображение варианта') || error.message.startsWith('Выберите корректные') || error.message.startsWith('Цвет варианта') || error.message.startsWith('Одна из выбранных категорий') || error.message.startsWith('Выбранный бренд'))) {
    return NextResponse.json({ message: error.message }, { status: 400 })
  }
  console.error('Admin product operation failed', error)
  return NextResponse.json({ message: 'Не удалось сохранить товар.' }, { status: 500 })
}

async function validateRelations(categoryIds: number[], brandId: number) {
  const [categoryRows, brandRows] = await Promise.all([
    categoryIds.length ? db.select({ id: categories.id, featureType: categories.featureType }).from(categories).where(inArray(categories.id, categoryIds)) : [],
    brandId > 0 ? db.select({ id: brands.id }).from(brands).where(eq(brands.id, brandId)).limit(1) : [],
  ])
  if (categoryRows.length !== categoryIds.length) throw new Error('Одна из выбранных категорий не найдена.')
  if (brandId > 0 && !brandRows.length) throw new Error('Выбранный бренд не найден.')
  return categoryRows.find((category) => category.id === categoryIds[0])?.featureType ?? categoryRows[0]?.featureType ?? 1
}

async function saveProduct(form: FormData, id?: number) {
  const fields = readProductFields(form)
  const gallery = parseJson(textField(form, 'gallery'), gallerySchema, [])
  const variants = readVariants(form)
  const featureType = await validateRelations(fields.categoryIds, fields.brandId)
  const uploadedImages = await saveProductImages(form)
  let uploadedVariantImages: Awaited<ReturnType<typeof saveVariantImages>> = []

  try {
    uploadedVariantImages = await saveVariantImages(form, variants.length)
    const timestamp = mysqlDate()
    const savedId = await db.transaction(async (tx) => {
      let productId = id
      if (id) {
        const [existing] = await tx.select({ id: products.id }).from(products).where(eq(products.id, id)).limit(1)
        if (!existing) throw new Error('Товар не найден.')
        await tx.update(products).set({
          sku: fields.sku,
          titleRu: fields.titleRu,
          titleRo: fields.titleRo,
          titleEn: fields.titleEn,
          descRu: fields.descRu,
          descRo: fields.descRo,
          descEn: fields.descEn,
          textRu: fields.textRu,
          textRo: fields.textRo,
          textEn: fields.textEn,
          seoTitleRu: fields.seoTitleRu,
          seoTitleRo: fields.seoTitleRo,
          seoDescRu: fields.seoDescRu,
          seoDescRo: fields.seoDescRo,
          uriRu: fields.uriRu,
          uriRo: fields.uriRo,
          uriEn: fields.uriEn,
          price: fields.price,
          discountPrice: fields.discountPrice,
          saleMdl: fields.saleMdl,
          salePercent: fields.salePercent,
          volume: fields.volume,
          isNew: fields.isNew,
          bestSelling: fields.bestSelling,
          categoryId: fields.categoryIds[0] ?? null,
          brandId: fields.brandId,
          featureType,
          searchTeg: fields.searchTeg,
          isShown: fields.isShown,
          isGift: fields.isGift,
          updatedAt: timestamp,
        }).where(eq(products.id, id))
      } else {
        const [inserted] = await tx.insert(products).values({
          guid: `NEXT-${randomUUID()}`,
          sku: fields.sku,
          titleRu: fields.titleRu,
          titleRo: fields.titleRo,
          titleEn: fields.titleEn,
          descRu: fields.descRu,
          descRo: fields.descRo,
          descEn: fields.descEn,
          textRu: fields.textRu,
          textRo: fields.textRo,
          textEn: fields.textEn,
          seoTitleRu: fields.seoTitleRu,
          seoTitleRo: fields.seoTitleRo,
          seoDescRu: fields.seoDescRu,
          seoDescRo: fields.seoDescRo,
          uriRu: fields.uriRu,
          uriRo: fields.uriRo,
          uriEn: fields.uriEn,
          price: fields.price,
          discountPrice: fields.discountPrice,
          saleMdl: fields.saleMdl,
          salePercent: fields.salePercent,
          volume: fields.volume,
          onStock: 0,
          stock: 0,
          isNew: fields.isNew,
          bestSelling: fields.bestSelling,
          categoryId: fields.categoryIds[0] ?? null,
          brandId: fields.brandId,
          featureType,
          reviews: '',
          variations: '',
          searchTeg: fields.searchTeg,
          order: 0,
          sorder: 1,
          isShown: fields.isShown,
          isGift: fields.isGift,
          priceWh: 0,
          onStockWh: 0,
        })
        productId = Number(inserted.insertId)
      }

      if (!productId) throw new Error('Не удалось получить номер товара.')

      await tx.delete(productCategories).where(eq(productCategories.productId, productId))
      if (fields.categoryIds.length) await tx.insert(productCategories).values(fields.categoryIds.map((categoryId) => ({ productId: productId!, categoryId })))

      if (id && gallery.length) {
        const existingImageIds = gallery.map((image) => image.id)
        const ownedImages = await tx.select({ id: productsImg.id }).from(productsImg)
          .where(and(eq(productsImg.productId, productId), inArray(productsImg.id, existingImageIds)))
        if (ownedImages.length !== existingImageIds.length) throw new Error('Не удалось обновить фотографии товара.')
        for (const image of gallery) {
          await tx.update(productsImg).set({ sorder: image.sorder, isShown: image.isShown })
            .where(and(eq(productsImg.id, image.id), eq(productsImg.productId, productId)))
        }
      }

      if (uploadedImages.length) {
        const [lastImage] = id
          ? await tx.select({ sorder: productsImg.sorder }).from(productsImg).where(eq(productsImg.productId, productId)).orderBy(productsImg.sorder).limit(1)
          : []
        const [maxImage] = id
          ? await tx.select({ sorder: productsImg.sorder }).from(productsImg).where(eq(productsImg.productId, productId)).orderBy(sql`${productsImg.sorder} DESC`).limit(1)
          : []
        const firstOrder = Number(maxImage?.sorder ?? lastImage?.sorder ?? 0) + 1
        await tx.insert(productsImg).values(uploadedImages.map((image, index) => ({
          productId: productId!, img: image.fileName, sorder: firstOrder + index, isShown: 1,
        })))
      }

      if (id) {
        const submittedIds = variants.flatMap((variant) => variant.id ? [variant.id] : [])
        const existingVariants = submittedIds.length
          ? await tx.select({ id: productsVariable.id }).from(productsVariable)
            .where(and(eq(productsVariable.productId, productId), inArray(productsVariable.id, submittedIds)))
          : []
        if (existingVariants.length !== submittedIds.length) throw new Error('Не удалось обновить варианты товара.')
      }

      for (const [index, variant] of variants.entries()) {
        const values = {
          sku: variant.sku,
          titleRu: variant.titleRu,
          titleRo: variant.titleRo,
          titleEn: variant.titleEn,
          colorRu: variant.colorRu,
          colorRo: variant.colorRo,
          colorEn: variant.colorEn,
          colorHex: variant.colorHex,
          volumeVar: variant.volumeVar,
          price: variant.price,
          discountPrice: variant.discountPrice,
          sorder: variant.sorder,
          isShown: variant.isShown,
          updatedAt: timestamp,
        }
        let variantId = variant.id
        if (id && variant.id) {
          await tx.update(productsVariable).set(values)
            .where(and(eq(productsVariable.id, variant.id), eq(productsVariable.productId, productId)))
        } else {
          const [insertedVariant] = await tx.insert(productsVariable).values({
            productId: productId!,
            ...values,
            qty: 0,
            priceWh: 0,
            qtyWh: 0,
          })
          variantId = Number(insertedVariant.insertId)
        }

        const uploadedVariantImage = uploadedVariantImages.find((image) => image.index === index)
        if (uploadedVariantImage && variantId) {
          await tx.update(productsVariableImg).set({ isShown: 0 })
            .where(and(eq(productsVariableImg.productId, productId), eq(productsVariableImg.variableId, variantId)))
          await tx.insert(productsVariableImg).values({
            productId: productId!,
            variableId: variantId,
            img: uploadedVariantImage.fileName,
            sorder: 1,
            isShown: 1,
          })
        }
      }
      return productId
    })
    return savedId
  } catch (error) {
    await Promise.all([...uploadedImages, ...uploadedVariantImages].map((file) => unlink(file.path).catch(() => undefined)))
    throw error
  }
}

export async function POST(request: Request) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: 'Запрос отклонён.' }, { status: 403 })
  if (!await getCurrentAdmin()) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })
  try {
    const id = await saveProduct(await request.formData())
    await syncProductsToMeilisearch([id]).catch((error) => console.error('Meilisearch sync failed', error))
    return NextResponse.json({ id }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return requestError(error)
  }
}

export async function PATCH(request: Request) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: 'Запрос отклонён.' }, { status: 403 })
  if (!await getCurrentAdmin()) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })
  const id = Number(new URL(request.url).searchParams.get('id'))
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ message: 'Товар не найден.' }, { status: 400 })
  try {
    const savedId = await saveProduct(await request.formData(), id)
    await syncProductsToMeilisearch([savedId]).catch((error) => console.error('Meilisearch sync failed', error))
    return NextResponse.json({ id: savedId }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof Error && error.message === 'Товар не найден.') return NextResponse.json({ message: error.message }, { status: 404 })
    return requestError(error)
  }
}

export async function DELETE(request: Request) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: 'Запрос отклонён.' }, { status: 403 })
  if (!await getCurrentAdmin()) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })

  try {
    const parsed = productDeleteSchema.parse(await request.json())
    const ids = [...new Set(parsed.ids)]
    const deleted = await db.transaction(async (tx) => {
      const variantRows = await tx.select({ id: productsVariable.id }).from(productsVariable).where(inArray(productsVariable.productId, ids))
      const variantIds = variantRows.map((variant) => variant.id)
      const [orderReferences, giftReferences] = await Promise.all([
        tx.select({ id: ordersProducts.id }).from(ordersProducts).where(inArray(ordersProducts.productId, ids)).limit(1),
        tx.select({ id: gifts.id }).from(gifts).where(or(
          inArray(gifts.productId, ids),
          ...(variantIds.length ? [inArray(gifts.variantId, variantIds)] : []),
        )!).limit(1),
      ])
      if (orderReferences.length) throw new Error('ORDER_REFERENCE')
      if (giftReferences.length) throw new Error('GIFT_REFERENCE')

      await tx.delete(beautySelectionProducts).where(inArray(beautySelectionProducts.productId, ids))
      await tx.delete(wishlistItems).where(inArray(wishlistItems.productId, ids))
      await tx.delete(homeBrandSectionProducts).where(inArray(homeBrandSectionProducts.productId, ids))
      await tx.delete(homeProductItems).where(inArray(homeProductItems.productId, ids))
      await tx.delete(offersProducts).where(inArray(offersProducts.productId, ids))
      await tx.delete(productsMore).where(or(inArray(productsMore.productId, ids), inArray(productsMore.relatedId, ids))!)
      await tx.delete(productsRelated).where(or(inArray(productsRelated.productId, ids), inArray(productsRelated.relatedId, ids))!)
      await tx.delete(productSearch).where(inArray(productSearch.productId, ids))
      await tx.delete(productsFeatures).where(inArray(productsFeatures.productId, ids))
      await tx.delete(shopCartItems).where(inArray(shopCartItems.productId, ids))
      await tx.delete(productsVariableImg).where(inArray(productsVariableImg.productId, ids))
      await tx.delete(productsImg).where(inArray(productsImg.productId, ids))
      await tx.delete(productsVariable).where(inArray(productsVariable.productId, ids))
      await tx.delete(productCategories).where(inArray(productCategories.productId, ids))
      await tx.delete(products).where(inArray(products.id, ids))
      return ids.length
    })
    await syncProductsToMeilisearch(ids).catch((error) => console.error('Meilisearch sync failed', error))
    return NextResponse.json({ deleted }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof Error && error.message === 'ORDER_REFERENCE') {
      return NextResponse.json({ message: 'Товар уже входит в заказ и не может быть удалён. Сначала скройте его из каталога.' }, { status: 409 })
    }
    if (error instanceof Error && error.message === 'GIFT_REFERENCE') {
      return NextResponse.json({ message: 'Сначала удалите товар из настроек подарков и акций.' }, { status: 409 })
    }
    if (error instanceof z.ZodError || error instanceof SyntaxError) return NextResponse.json({ message: 'Выберите товары для удаления.' }, { status: 400 })
    console.error('Admin product deletion failed', error)
    return NextResponse.json({ message: 'Не удалось удалить товары.' }, { status: 500 })
  }
}
