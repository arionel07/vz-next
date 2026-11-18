import { and, count, desc, eq, lte, or } from 'drizzle-orm'
import { cache } from 'react'

import { db } from '@/db'
import type { StoreLocale } from '@/lib/locale-routing'
import { articles, menu } from '../../drizzle/schema'

const NEWS_PAGE_SIZE = 20

export type NewsSummary = {
  id: number
  title: string | null
  uri: string
  description: string
  date: string
  image: string | null
}

export type NewsArticle = NewsSummary & {
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

function visibleNewsCondition() {
  return and(
    eq(articles.isShown, 1),
    eq(articles.isBlog, 0),
    lte(articles.date, today()),
  )
}

export async function getNewsPage(page = 1, locale: StoreLocale = 'ru') {
  const isRomanian = locale === 'ro'
  const safePage = Math.max(1, page)
  const offset = (safePage - 1) * NEWS_PAGE_SIZE
  const condition = visibleNewsCondition()

  const [rows, [{ total }], [pageRow]] = await Promise.all([
    db
      .select({
        id: articles.id,
        title: isRomanian ? articles.titleRo : articles.titleRu,
        uri: isRomanian ? articles.uriRo : articles.uriRu,
        description: isRomanian ? articles.descRo : articles.descRu,
        date: articles.date,
        image: articles.img,
      })
      .from(articles)
      .where(condition)
      .orderBy(desc(articles.date), desc(articles.id))
      .limit(NEWS_PAGE_SIZE)
      .offset(offset),
    db.select({ total: count() }).from(articles).where(condition),
    db
      .select({ title: isRomanian ? menu.titleRo : menu.titleRu })
      .from(menu)
      .where(eq(isRomanian ? menu.uriRo : menu.uriRu, isRomanian ? 'noutati' : 'novosti'))
      .limit(1),
  ])

  return {
    title: pageRow?.title || (isRomanian ? 'Noutăți' : 'Новости'),
    articles: rows.map((row) => ({ ...row, description: row.description ?? '' })),
    total: Number(total),
    page: safePage,
    pageSize: NEWS_PAGE_SIZE,
  }
}

export const getNewsArticle = cache(async function getNewsArticle(uri: string, locale: StoreLocale = 'ru') {
  const isRomanian = locale === 'ro'
  const uriCondition = or(
    eq(isRomanian ? articles.uriRo : articles.uriRu, uri),
    eq(isRomanian ? articles.uriRu : articles.uriRo, uri),
  )
  const lookupCondition = /^\d+$/.test(uri)
    ? and(visibleNewsCondition(), or(uriCondition, eq(articles.id, Number(uri))))
    : and(visibleNewsCondition(), uriCondition)
  const [article] = await db
    .select({
      id: articles.id,
      title: isRomanian ? articles.titleRo : articles.titleRu,
      uri: isRomanian ? articles.uriRo : articles.uriRu,
      description: isRomanian ? articles.descRo : articles.descRu,
      text: isRomanian ? articles.textRo : articles.textRu,
      date: articles.date,
      image: articles.img,
      uriRu: articles.uriRu,
      uriRo: articles.uriRo,
      seoTitle: isRomanian ? articles.seoTitleRo : articles.seoTitleRu,
      seoDescription: isRomanian ? articles.seoDescRo : articles.seoDescRu,
      seoKeywords: isRomanian ? articles.seoKeywordsRo : articles.seoKeywordsRu,
    })
    .from(articles)
    .where(lookupCondition)
    .limit(1)

  if (!article) return null

  return {
    article: {
      ...article,
      description: article.description ?? '',
      text: article.text ?? '',
      seoKeywords: article.seoKeywords ?? '',
    } satisfies NewsArticle,
  }
})

export { NEWS_PAGE_SIZE }
