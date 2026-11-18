import { and, asc, count, desc, eq, exists, gt, inArray, lte, ne, or } from 'drizzle-orm'
import { cache } from 'react'

import { db } from '@/db'
import { articleLikes, articles, brands, categories, products, productsImg, productsVariable, productsVariableImg } from '../../drizzle/schema'
import type { CatalogProduct } from './catalog'
import { enrichCatalogProducts } from './catalog-card-data'
import type { StoreLocale } from './locale-routing'

const BLOG_PAGE_SIZE = 20

export type BlogArticleSummary = {
  id: number
  title: string | null
  uri: string
  description: string
  date: string
  image: string | null
  tags: string
}

export type BlogArticle = BlogArticleSummary & {
  text: string
  seoTitle: string | null
  seoDescription: string | null
  seoKeywords: string
  uriRu: string
  uriRo: string
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function visibleBlogArticleCondition() {
  return and(
    eq(articles.isShown, 1),
    eq(articles.isBlog, 1),
    lte(articles.date, today()),
  )
}

function mapSummary(row: {
  id: number
  title: string | null
  uri: string
  description: string
  date: string
  image: string | null
  tags: string
}): BlogArticleSummary {
  return row
}

export async function getBlogPage(page = 1, locale: StoreLocale = 'ru') {
  const isRomanian = locale === 'ro'
  const safePage = Math.max(1, page)
  const offset = (safePage - 1) * BLOG_PAGE_SIZE
  const condition = visibleBlogArticleCondition()

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: articles.id,
        title: isRomanian ? articles.titleRo : articles.titleRu,
        uri: isRomanian ? articles.uriRo : articles.uriRu,
        description: isRomanian ? articles.descRo : articles.descRu,
        date: articles.date,
        image: articles.img,
        tags: isRomanian ? articles.tagsRo : articles.tagsRu,
      })
      .from(articles)
      .where(condition)
      .orderBy(desc(articles.date), desc(articles.id))
      .limit(BLOG_PAGE_SIZE)
      .offset(offset),
    db.select({ total: count() }).from(articles).where(condition),
  ])

  return {
    articles: rows.map(mapSummary),
    total: Number(total),
    page: safePage,
    pageSize: BLOG_PAGE_SIZE,
  }
}

export const getBlogArticle = cache(async function getBlogArticle(uri: string, locale: StoreLocale = 'ru') {
  const isRomanian = locale === 'ro'
  const [article] = await db
    .select({
      id: articles.id,
      title: isRomanian ? articles.titleRo : articles.titleRu,
      uri: isRomanian ? articles.uriRo : articles.uriRu,
      description: isRomanian ? articles.descRo : articles.descRu,
      text: isRomanian ? articles.textRo : articles.textRu,
      date: articles.date,
      image: articles.img,
      tags: isRomanian ? articles.tagsRo : articles.tagsRu,
      uriRu: articles.uriRu,
      uriRo: articles.uriRo,
      seoTitle: isRomanian ? articles.seoTitleRo : articles.seoTitleRu,
      seoDescription: isRomanian ? articles.seoDescRo : articles.seoDescRu,
      seoKeywords: isRomanian ? articles.seoKeywordsRo : articles.seoKeywordsRu,
    })
    .from(articles)
    .where(and(visibleBlogArticleCondition(), or(
      eq(isRomanian ? articles.uriRo : articles.uriRu, uri),
      eq(isRomanian ? articles.uriRu : articles.uriRo, uri),
    )))
    .limit(1)

  if (!article) return null

  const [related, [{ likes }]] = await Promise.all([
    db
      .select({
        id: articles.id,
        title: isRomanian ? articles.titleRo : articles.titleRu,
        uri: isRomanian ? articles.uriRo : articles.uriRu,
        description: isRomanian ? articles.descRo : articles.descRu,
        date: articles.date,
        image: articles.img,
        tags: isRomanian ? articles.tagsRo : articles.tagsRu,
      })
      .from(articles)
      .where(and(visibleBlogArticleCondition(), eq(articles.isBlog, 1)))
      .orderBy(desc(articles.date), desc(articles.id))
      .limit(5),
    db.select({ likes: count() }).from(articleLikes).where(eq(articleLikes.articleId, article.id)),
  ])

  return {
    article: {
      ...article,
      description: article.description ?? '',
      text: article.text ?? '',
      tags: article.tags ?? '',
      seoKeywords: article.seoKeywords ?? '',
    } satisfies BlogArticle,
    related: related.filter((item) => item.id !== article.id).slice(0, 4).map(mapSummary),
    likes: Number(likes),
  }
})

export async function getBlogProducts(ids: number[], locale: StoreLocale = 'ru') {
  const uniqueIds = [...new Set(ids.filter((id) => id > 0))].slice(0, 8)
  if (!uniqueIds.length) return []

  const rows = await db
    .select({
      id: products.id,
      title: locale === 'ro' ? products.titleRo : products.titleRu,
      price: products.price,
      discountPrice: products.discountPrice,
      brand: brands.title,
      category: locale === 'ro' ? categories.titleRo : categories.titleRu,
      sku: products.sku,
    })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(
      eq(products.isShown, 1),
      or(
        gt(products.price, 0),
        gt(products.discountPrice, 0),
        inArray(products.id, db.select({ productId: productsVariable.productId }).from(productsVariable).where(and(
          eq(productsVariable.isShown, 1), gt(productsVariable.price, 0), gt(productsVariable.qty, 0),
        ))),
      )!,
      inArray(products.id, uniqueIds),
      or(
        exists(db.select({ id: productsImg.id }).from(productsImg).where(and(
          eq(productsImg.productId, products.id), eq(productsImg.isShown, 1), ne(productsImg.img, ''),
        ))),
        exists(db.select({ id: productsVariableImg.id }).from(productsVariableImg).where(and(
          eq(productsVariableImg.productId, products.id), eq(productsVariableImg.isShown, 1), ne(productsVariableImg.img, ''),
        ))),
      )!,
    ))

  const byId = new Map(rows.map((row) => [row.id, row]))
  const productsWithImages = uniqueIds
    .map((id) => byId.get(id))
    .filter((product): product is (typeof rows)[number] => Boolean(product))
    .map((product) => ({ ...product, image: null, locale })) satisfies CatalogProduct[]
  return enrichCatalogProducts(productsWithImages)
}

export { BLOG_PAGE_SIZE }
