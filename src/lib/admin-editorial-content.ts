import 'server-only'

import { and, asc, count, desc, eq, inArray, like, or, type SQL } from 'drizzle-orm'

import { db } from '@/db'
import {
  articles,
  beautySelectionProducts,
  beautySelections,
  products,
} from '../../drizzle/schema'

const PAGE_SIZE = 25
export type AdminContentStatus = 'all' | 'shown' | 'hidden'

export type AdminNewsItem = {
  id: number
  date: string
  titleRu: string | null
  titleRo: string | null
  uriRu: string
  uriRo: string
  descRu: string
  descRo: string
  textRu: string | null
  textRo: string | null
  seoTitleRu: string | null
  seoTitleRo: string | null
  seoDescRu: string | null
  seoDescRo: string | null
  img: string | null
  isShown: number
  sorder: number
}

export type AdminSelectionProduct = { id: number; titleRu: string | null; titleRo: string | null }
export type AdminBeautySelection = {
  id: number
  titleRu: string
  titleRo: string
  uriRu: string
  uriRo: string
  descRu: string | null
  descRo: string | null
  textRu: string | null
  textRo: string | null
  imgRu: string | null
  imgRo: string | null
  seoTitleRu: string | null
  seoTitleRo: string | null
  seoDescRu: string | null
  seoDescRo: string | null
  isShown: number
  sorder: number
  products: AdminSelectionProduct[]
}

function contentCondition(query: string, status: AdminContentStatus, kind: 'news' | 'selection') {
  const conditions: SQL[] = kind === 'news' ? [eq(articles.isBlog, 0)] : []
  if (status === 'shown') conditions.push(eq(kind === 'news' ? articles.isShown : beautySelections.isShown, 1))
  if (status === 'hidden') conditions.push(eq(kind === 'news' ? articles.isShown : beautySelections.isShown, 0))
  const search = query.trim()
  if (search) {
    const pattern = `%${search}%`
    conditions.push(kind === 'news'
      ? or(like(articles.titleRu, pattern), like(articles.titleRo, pattern), like(articles.uriRu, pattern), like(articles.uriRo, pattern))!
      : or(like(beautySelections.titleRu, pattern), like(beautySelections.titleRo, pattern), like(beautySelections.uriRu, pattern), like(beautySelections.uriRo, pattern))!)
  }
  return and(...conditions)
}

export async function getAdminNewsList(options: { query?: string; status?: AdminContentStatus; page?: number } = {}) {
  const query = options.query?.trim() ?? ''
  const status = options.status ?? 'all'
  const totalPagesQuery = contentCondition(query, status, 'news')
  const pageCountRows = await db.select({ total: count() }).from(articles).where(totalPagesQuery)
  const total = Number(pageCountRows[0]?.total ?? 0)
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const page = Math.min(Math.max(1, Math.floor(options.page ?? 1)), pageCount)
  const rows = await db.select({
    id: articles.id,
    date: articles.date,
    titleRu: articles.titleRu,
    titleRo: articles.titleRo,
    uriRu: articles.uriRu,
    uriRo: articles.uriRo,
    descRu: articles.descRu,
    descRo: articles.descRo,
    textRu: articles.textRu,
    textRo: articles.textRo,
    seoTitleRu: articles.seoTitleRu,
    seoTitleRo: articles.seoTitleRo,
    seoDescRu: articles.seoDescRu,
    seoDescRo: articles.seoDescRo,
    img: articles.img,
    isShown: articles.isShown,
    sorder: articles.sorder,
  }).from(articles).where(totalPagesQuery)
    .orderBy(desc(articles.date), desc(articles.sorder), desc(articles.id))
    .limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE)

  return { items: rows, total, page, pageCount, pageSize: PAGE_SIZE }
}

export async function getAdminNewsItem(id: number) {
  const [item] = await db.select({
    id: articles.id,
    date: articles.date,
    titleRu: articles.titleRu,
    titleRo: articles.titleRo,
    uriRu: articles.uriRu,
    uriRo: articles.uriRo,
    descRu: articles.descRu,
    descRo: articles.descRo,
    textRu: articles.textRu,
    textRo: articles.textRo,
    seoTitleRu: articles.seoTitleRu,
    seoTitleRo: articles.seoTitleRo,
    seoDescRu: articles.seoDescRu,
    seoDescRo: articles.seoDescRo,
    img: articles.img,
    isShown: articles.isShown,
    sorder: articles.sorder,
  }).from(articles).where(and(eq(articles.id, id), eq(articles.isBlog, 0))).limit(1)
  return item ?? null
}

export async function getAdminBeautySelectionList(options: { query?: string; status?: AdminContentStatus; page?: number } = {}) {
  const query = options.query?.trim() ?? ''
  const status = options.status ?? 'all'
  const condition = contentCondition(query, status, 'selection')
  const [{ total }] = await db.select({ total: count() }).from(beautySelections).where(condition)
  const totalCount = Number(total ?? 0)
  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const page = Math.min(Math.max(1, Math.floor(options.page ?? 1)), pageCount)
  const rows = await db.select({
    id: beautySelections.id,
    titleRu: beautySelections.titleRu,
    titleRo: beautySelections.titleRo,
    uriRu: beautySelections.uriRu,
    uriRo: beautySelections.uriRo,
    descRu: beautySelections.descRu,
    descRo: beautySelections.descRo,
    textRu: beautySelections.textRu,
    textRo: beautySelections.textRo,
    imgRu: beautySelections.imgRu,
    imgRo: beautySelections.imgRo,
    seoTitleRu: beautySelections.seoTitleRu,
    seoTitleRo: beautySelections.seoTitleRo,
    seoDescRu: beautySelections.seoDescRu,
    seoDescRo: beautySelections.seoDescRo,
    isShown: beautySelections.isShown,
    sorder: beautySelections.sorder,
  }).from(beautySelections).where(condition)
    .orderBy(asc(beautySelections.sorder), desc(beautySelections.id))
    .limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE)

  const selectionIds = rows.map((row) => row.id)
  const productRows = selectionIds.length ? await db.select({
    selectionId: beautySelectionProducts.selectionId,
    id: products.id,
    titleRu: products.titleRu,
    titleRo: products.titleRo,
  }).from(beautySelectionProducts)
    .innerJoin(products, eq(products.id, beautySelectionProducts.productId))
    .where(inArray(beautySelectionProducts.selectionId, selectionIds))
    .orderBy(asc(beautySelectionProducts.sorder), asc(beautySelectionProducts.id)) : []
  const productsBySelection = new Map<number, AdminSelectionProduct[]>()
  for (const product of productRows) {
    const list = productsBySelection.get(product.selectionId) ?? []
    list.push({ id: product.id, titleRu: product.titleRu, titleRo: product.titleRo })
    productsBySelection.set(product.selectionId, list)
  }

  return {
    items: rows.map((row) => ({ ...row, products: productsBySelection.get(row.id) ?? [] })),
    total: totalCount,
    page,
    pageCount,
    pageSize: PAGE_SIZE,
  }
}

export async function getAdminBeautySelection(id: number) {
  const [selection] = await db.select({
    id: beautySelections.id,
    titleRu: beautySelections.titleRu,
    titleRo: beautySelections.titleRo,
    uriRu: beautySelections.uriRu,
    uriRo: beautySelections.uriRo,
    descRu: beautySelections.descRu,
    descRo: beautySelections.descRo,
    textRu: beautySelections.textRu,
    textRo: beautySelections.textRo,
    imgRu: beautySelections.imgRu,
    imgRo: beautySelections.imgRo,
    seoTitleRu: beautySelections.seoTitleRu,
    seoTitleRo: beautySelections.seoTitleRo,
    seoDescRu: beautySelections.seoDescRu,
    seoDescRo: beautySelections.seoDescRo,
    isShown: beautySelections.isShown,
    sorder: beautySelections.sorder,
  }).from(beautySelections).where(eq(beautySelections.id, id)).limit(1)
  if (!selection) return null
  const productRows = await db.select({
    id: products.id,
    titleRu: products.titleRu,
    titleRo: products.titleRo,
  }).from(beautySelectionProducts)
    .innerJoin(products, eq(products.id, beautySelectionProducts.productId))
    .where(eq(beautySelectionProducts.selectionId, id))
    .orderBy(asc(beautySelectionProducts.sorder), asc(beautySelectionProducts.id))
  return { ...selection, products: productRows }
}
