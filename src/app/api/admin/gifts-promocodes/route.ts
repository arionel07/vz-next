import { and, eq, inArray, ne, or } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db'
import { getCurrentAdmin } from '@/lib/admin-auth'
import { getAdminGiftsPromocodesData, getAdminGiftVariants, searchAdminGiftProducts } from '@/lib/admin-gifts-promocodes'
import {
  giftPromotionBrands, giftPromotions, gifts, offers, products, productsVariable,
  promocodeBrands, promocodeExcludedBrands, promocodes, brands,
} from '../../../../../drizzle/schema'

const idSchema = z.number().int().positive()
const nullableIdSchema = idSchema.nullable()
const idsArraySchema = z.array(idSchema).max(300)
const idsSchema = idsArraySchema.transform((ids) => [...new Set(ids)])
const dateSchema = z.string().max(10).refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), 'Укажите дату в формате ГГГГ-ММ-ДД.')

const giftSchema = z.object({
  titleRu: z.string().trim().min(1).max(255), titleRo: z.string().trim().min(1).max(255),
  descriptionRu: z.string().max(20000), descriptionRo: z.string().max(20000),
  productId: nullableIdSchema, variantId: nullableIdSchema,
  isEnabled: z.number().int().min(0).max(1), showOnSite: z.number().int().min(0).max(1),
  sorder: z.number().int().min(0).max(999999),
}).refine((value) => value.productId !== null || value.variantId === null, { message: 'Сначала выберите товар для варианта.' })

const promotionSchema = z.object({
  titleRu: z.string().trim().min(1).max(255), titleRo: z.string().trim().min(1).max(255),
  descriptionRu: z.string().max(20000), descriptionRo: z.string().max(20000),
  giftId: idSchema, offerId: nullableIdSchema, conditionQty: z.number().int().min(1).max(999999),
  isEnabled: z.number().int().min(0).max(1), showOnSite: z.number().int().min(0).max(1),
  isOnline: z.number().int().min(0).max(2), progressMode: z.enum(['time', 'stock', 'none']),
  dateFrom: dateSchema, dateTo: dateSchema, sorder: z.number().int().min(0).max(999999),
  brandIds: idsArraySchema.min(1).transform((ids) => [...new Set(ids)]),
}).refine((value) => !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo, { message: 'Дата окончания должна быть не раньше даты начала.' })

const datetimeSchema = z.string().max(16).refine((value) => !value || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value), 'Проверьте дату и время промокода.')
const nullablePositiveNumber = z.union([z.number().finite().nonnegative(), z.null()])
const nullablePositiveInt = z.union([z.number().int().positive(), z.null()])
const promocodeSchema = z.object({
  name: z.string().trim().min(1).max(255), code: z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/, 'Код может содержать латинские буквы, цифры, дефис и подчёркивание.'),
  type: z.enum(['percentage', 'fixed']), value: z.number().finite().positive().max(100000000),
  minAmount: nullablePositiveNumber, maxDiscount: nullablePositiveNumber,
  usageLimit: nullablePositiveInt, perUserLimit: nullablePositiveInt,
  allowDiscounted: z.number().int().min(0).max(1), startsAt: datetimeSchema, endsAt: datetimeSchema,
  status: z.enum(['draft', 'active', 'disabled']), brandScope: z.enum(['all', 'selected']),
  brandIds: idsSchema, excludedBrandIds: idsSchema,
}).refine((value) => value.type !== 'percentage' || value.value <= 100, { message: 'Процент скидки не может превышать 100%.' })
  .refine((value) => value.brandScope !== 'selected' || value.brandIds.length > 0, { message: 'Выберите хотя бы один бренд для ограничения промокода.' })
  .refine((value) => !value.startsAt || !value.endsAt || value.startsAt <= value.endsAt, { message: 'Окончание промокода должно быть позже начала.' })

function validSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  return !origin || origin === new URL(request.url).origin
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ message }, { status, headers: { 'Cache-Control': 'no-store' } })
}

function mysqlDateTime(value: string) {
  return value ? `${value.replace('T', ' ')}:00` : null
}

function nowMysql() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

async function validateBrandIds(ids: number[]) {
  if (!ids.length) return
  const rows = await db.select({ id: brands.id }).from(brands).where(inArray(brands.id, ids))
  if (rows.length !== ids.length) throw new Error('Один или несколько выбранных брендов не найдены.')
}

async function saveGift(id: number | null, rawData: unknown) {
  const parsed = giftSchema.safeParse(rawData)
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? 'Проверьте данные подарка.')
  const fields = parsed.data
  if (id) {
    const [existing] = await db.select({ id: gifts.id }).from(gifts).where(eq(gifts.id, id)).limit(1)
    if (!existing) return jsonError('Подарок не найден.', 404)
  }
  if (fields.productId !== null) {
    const [product] = await db.select({ id: products.id }).from(products).where(and(
      eq(products.id, fields.productId),
      or(eq(products.isShown, 1), eq(products.isGift, 1)),
    )).limit(1)
    if (!product) return jsonError('Выбранный товар не найден.')
  }
  if (fields.variantId !== null) {
    const [variant] = await db.select({ id: productsVariable.id, productId: productsVariable.productId })
      .from(productsVariable).where(eq(productsVariable.id, fields.variantId)).limit(1)
    if (!variant || variant.productId !== fields.productId) return jsonError('Вариант не принадлежит выбранному товару.')
  }
  const values = {
    titleRu: fields.titleRu, titleRo: fields.titleRo,
    descriptionRu: fields.descriptionRu || null, descriptionRo: fields.descriptionRo || null,
    productId: fields.productId, variantId: fields.variantId,
    isEnabled: fields.isEnabled, showOnSite: fields.showOnSite, sorder: fields.sorder, updatedAt: nowMysql(),
  }
  if (id) await db.update(gifts).set(values).where(eq(gifts.id, id))
  else await db.insert(gifts).values({ ...values, createdAt: nowMysql() })
  return NextResponse.json({ ok: true }, { status: id ? 200 : 201, headers: { 'Cache-Control': 'no-store' } })
}

async function saveGiftPromotion(id: number | null, rawData: unknown) {
  const parsed = promotionSchema.safeParse(rawData)
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? 'Проверьте данные правила подарка.')
  const fields = parsed.data
  if (id) {
    const [existing] = await db.select({ id: giftPromotions.id }).from(giftPromotions).where(eq(giftPromotions.id, id)).limit(1)
    if (!existing) return jsonError('Правило подарка не найдено.', 404)
  }
  const [gift] = await db.select({ id: gifts.id }).from(gifts).where(eq(gifts.id, fields.giftId)).limit(1)
  if (!gift) return jsonError('Выбранный подарок не найден.')
  if (fields.offerId !== null) {
    const [offer] = await db.select({ id: offers.id }).from(offers).where(eq(offers.id, fields.offerId)).limit(1)
    if (!offer) return jsonError('Выбранная акция не найдена.')
  }
  await validateBrandIds(fields.brandIds)
  const values = {
    titleRu: fields.titleRu, titleRo: fields.titleRo,
    descriptionRu: fields.descriptionRu || null, descriptionRo: fields.descriptionRo || null,
    giftId: fields.giftId, offerId: fields.offerId, conditionQty: fields.conditionQty,
    isEnabled: fields.isEnabled, showOnSite: fields.showOnSite, isOnline: fields.isOnline,
    progressMode: fields.progressMode, dateFrom: fields.dateFrom || null, dateTo: fields.dateTo || null,
    sorder: fields.sorder, updatedAt: nowMysql(),
  }
  await db.transaction(async (tx) => {
    let promotionId = id
    if (promotionId) await tx.update(giftPromotions).set(values).where(eq(giftPromotions.id, promotionId))
    else {
      const [created] = await tx.insert(giftPromotions).values({ ...values, createdAt: nowMysql() })
      promotionId = Number(created.insertId)
    }
    await tx.delete(giftPromotionBrands).where(eq(giftPromotionBrands.promotionId, promotionId!))
    await tx.insert(giftPromotionBrands).values(fields.brandIds.map((brandId: number) => ({ promotionId: promotionId!, brandId })))
  })
  return NextResponse.json({ ok: true }, { status: id ? 200 : 201, headers: { 'Cache-Control': 'no-store' } })
}

async function savePromocode(id: number | null, rawData: unknown) {
  const parsed = promocodeSchema.safeParse(rawData)
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? 'Проверьте настройки промокода.')
  const fields = parsed.data
  if (id) {
    const [existing] = await db.select({ id: promocodes.id }).from(promocodes).where(eq(promocodes.id, id)).limit(1)
    if (!existing) return jsonError('Промокод не найден.', 404)
  }
  const code = fields.code.toUpperCase()
  const duplicate = await db.select({ id: promocodes.id }).from(promocodes).where(id
    ? and(eq(promocodes.code, code), ne(promocodes.id, id))
    : eq(promocodes.code, code)).limit(1)
  if (duplicate.length) return jsonError('Такой промокод уже существует.')
  await validateBrandIds([...new Set([...fields.brandIds, ...fields.excludedBrandIds])])
  const values = {
    name: fields.name, code, type: fields.type, value: fields.value.toFixed(2),
    minAmount: fields.minAmount === null ? null : fields.minAmount.toFixed(2),
    maxDiscount: fields.maxDiscount === null ? null : fields.maxDiscount.toFixed(2),
    usageLimit: fields.usageLimit, perUserLimit: fields.perUserLimit,
    allowDiscounted: fields.allowDiscounted, startsAt: mysqlDateTime(fields.startsAt), endsAt: mysqlDateTime(fields.endsAt),
    status: fields.status, brandScope: fields.brandScope, updatedAt: nowMysql(),
  }
  await db.transaction(async (tx) => {
    let promocodeId = id
    if (promocodeId) await tx.update(promocodes).set(values).where(eq(promocodes.id, promocodeId))
    else {
      const [created] = await tx.insert(promocodes).values(values)
      promocodeId = Number(created.insertId)
    }
    await tx.delete(promocodeBrands).where(eq(promocodeBrands.promocodeId, promocodeId!))
    await tx.delete(promocodeExcludedBrands).where(eq(promocodeExcludedBrands.promocodeId, promocodeId!))
    if (fields.brandScope === 'selected' && fields.brandIds.length) {
      await tx.insert(promocodeBrands).values(fields.brandIds.map((brandId) => ({ promocodeId: promocodeId!, brandId })))
    }
    if (fields.brandScope === 'all' && fields.excludedBrandIds.length) {
      await tx.insert(promocodeExcludedBrands).values(fields.excludedBrandIds.map((brandId) => ({ promocodeId: promocodeId!, brandId })))
    }
  })
  return NextResponse.json({ ok: true }, { status: id ? 200 : 201, headers: { 'Cache-Control': 'no-store' } })
}

function revalidateGiftPromotions() {
  for (const path of ['/ru', '/ro', '/ru/katalog', '/ro/catalog', '/ru/aktsii']) revalidatePath(path)
  revalidatePath('/ru/aktsii/[uri]', 'page')
  revalidatePath('/ru/katalog/product/[id]', 'page')
  revalidatePath('/ru/katalog/[category]/[product]', 'page')
  revalidatePath('/ro/[...slug]', 'page')
}

async function saveAndRevalidate(save: () => Promise<NextResponse>) {
  const response = await save()
  if (response.ok) revalidateGiftPromotions()
  return response
}

export async function GET(request: Request) {
  if (!validSameOrigin(request)) return jsonError('Запрос отклонён.', 403)
  if (!await getCurrentAdmin()) return jsonError('Требуется вход в админку.', 401)
  const params = new URL(request.url).searchParams
  if (params.get('products') === '1') {
    const found = await searchAdminGiftProducts(params.get('q') ?? '')
    return NextResponse.json({ products: found }, { headers: { 'Cache-Control': 'no-store' } })
  }
  if (params.get('variants') === '1') {
    const productId = Number(params.get('productId'))
    const variants = await getAdminGiftVariants(productId)
    return NextResponse.json({ variants }, { headers: { 'Cache-Control': 'no-store' } })
  }
  const data = await getAdminGiftsPromocodesData()
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  if (!validSameOrigin(request)) return jsonError('Запрос отклонён.', 403)
  if (!await getCurrentAdmin()) return jsonError('Требуется вход в админку.', 401)
  try {
    const body = await request.json() as { kind?: string; data?: unknown }
    if (body.kind === 'gift') return await saveAndRevalidate(() => saveGift(null, body.data))
    if (body.kind === 'giftPromotion') return await saveAndRevalidate(() => saveGiftPromotion(null, body.data))
    if (body.kind === 'promocode') return await saveAndRevalidate(() => savePromocode(null, body.data))
    return jsonError('Неизвестный тип записи.')
  } catch (error) {
    console.error('Admin gift/promo create failed', error)
    return jsonError('Не удалось сохранить запись.', 500)
  }
}

export async function PATCH(request: Request) {
  if (!validSameOrigin(request)) return jsonError('Запрос отклонён.', 403)
  if (!await getCurrentAdmin()) return jsonError('Требуется вход в админку.', 401)
  try {
    const body = await request.json() as { kind?: string; id?: number; data?: unknown }
    if (!Number.isInteger(body.id) || Number(body.id) < 1) return jsonError('Запись не найдена.')
    if (body.kind === 'gift') return await saveAndRevalidate(() => saveGift(Number(body.id), body.data))
    if (body.kind === 'giftPromotion') return await saveAndRevalidate(() => saveGiftPromotion(Number(body.id), body.data))
    if (body.kind === 'promocode') return await saveAndRevalidate(() => savePromocode(Number(body.id), body.data))
    return jsonError('Неизвестный тип записи.')
  } catch (error) {
    console.error('Admin gift/promo update failed', error)
    return jsonError('Не удалось сохранить изменения.', 500)
  }
}

export async function DELETE(request: Request) {
  if (!validSameOrigin(request)) return jsonError('Запрос отклонён.', 403)
  if (!await getCurrentAdmin()) return jsonError('Требуется вход в админку.', 401)
  const params = new URL(request.url).searchParams
  const kind = params.get('kind')
  const id = Number(params.get('id'))
  if (!Number.isInteger(id) || id < 1) return jsonError('Запись не найдена.')
  try {
    if (kind === 'gift') {
      const [existing] = await db.select({ id: gifts.id }).from(gifts).where(eq(gifts.id, id)).limit(1)
      if (!existing) return jsonError('Подарок не найден.', 404)
      await db.update(gifts).set({ isEnabled: 0, updatedAt: nowMysql() }).where(eq(gifts.id, id))
    } else if (kind === 'giftPromotion') {
      const [existing] = await db.select({ id: giftPromotions.id }).from(giftPromotions).where(eq(giftPromotions.id, id)).limit(1)
      if (!existing) return jsonError('Правило подарка не найдено.', 404)
      await db.update(giftPromotions).set({ isEnabled: 0, updatedAt: nowMysql() }).where(eq(giftPromotions.id, id))
    } else if (kind === 'promocode') {
      const [existing] = await db.select({ id: promocodes.id }).from(promocodes).where(eq(promocodes.id, id)).limit(1)
      if (!existing) return jsonError('Промокод не найден.', 404)
      await db.update(promocodes).set({ status: 'disabled', updatedAt: nowMysql() }).where(eq(promocodes.id, id))
    } else return jsonError('Неизвестный тип записи.')
    revalidateGiftPromotions()
    return NextResponse.json({ ok: true, disabled: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Admin gift/promo disable failed', error)
    return jsonError('Не удалось отключить запись.', 500)
  }
}
