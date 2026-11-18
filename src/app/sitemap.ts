import { and, eq, gte, inArray, lte } from 'drizzle-orm'
import type { MetadataRoute } from 'next'
import { connection } from 'next/server'

import { db } from '@/db'
import { getPublicProductSitemapRows } from '@/lib/catalog'
import { getSiteOrigin } from '@/lib/site-url'
import { articles, beautySelections, brands, categories, offers } from '../../drizzle/schema'

const staticRoutes = [
  ['/ru', '/ro'],
  ['/ru/katalog', '/ro/catalog'],
  ['/ru/brands', '/ro/brands'],
  ['/ru/aktsii', '/ro/promotii'],
  ['/ru/beauty-selections', '/ro/beauty-selections'],
  ['/ru/blog', '/ro/blog'],
  ['/ru/novosti', '/ro/noutati'],
  ['/ru/magazinyi', '/ro/magazinele'],
  ['/ru/dostavka', '/ro/livrare'],
  ['/ru/kontaktyi', '/ro/contacte'],
  ['/ru/podarochnaya-karta', '/ro/card-cadou'],
  ['/ru/sertifikaty-podlinnosti', '/ro/certificate-de-autenticitate'],
  ['/ru/politika-konfidentsialnosti-i-cookies', '/ro/politica-de-confidentialitate-si-cookies'],
  ['/ru/usloviya-i-polojeniya', '/ro/termeni-si-conditii'],
  ['/ru/informatsiya-dlya-potrebiteley', '/ro/informatii-pentru-consumatori'],
  ['/ru/novinki', '/ro/nou'],
  ['/ru/top-prodaz', '/ro/top-vanzari'],
  ['/ru/skidki', '/ro/reduceri'],
  ['/ru/b2b', '/ro/b2b'],
] as const

function slug(value: string | null | undefined) {
  const normalized = value?.trim().replace(/^\/+|\/+$/gu, '') ?? ''
  return normalized && !normalized.includes('/') ? encodeURIComponent(normalized) : ''
}

function dateValue(value: string | Date | null | undefined) {
  if (!value) return undefined
  const parsed = value instanceof Date ? value : new Date(value.replace(' ', 'T'))
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

function localizedEntry(ruPath: string, roPath: string, lastModified?: string | Date | null): MetadataRoute.Sitemap[number] {
  const origin = getSiteOrigin()
  return {
    url: `${origin}${ruPath}`,
    lastModified: dateValue(lastModified),
    alternates: { languages: { ru: `${origin}${ruPath}`, ro: `${origin}${roPath}` } },
  }
}

function singleLocaleEntry(path: string): MetadataRoute.Sitemap[number] {
  return { url: `${getSiteOrigin()}${path}` }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection()
  const staticEntries: MetadataRoute.Sitemap = [
    ...staticRoutes.map(([ru, ro]) => localizedEntry(ru, ro)),
    singleLocaleEntry('/get-app'),
  ]

  try {
    const today = new Date().toISOString().slice(0, 10)
    const [productRows, categoryRows, brandRows, articleRows, offerRows, selectionRows] = await Promise.all([
      getPublicProductSitemapRows(),
      db.select({ uriRu: categories.uriRu, uriRo: categories.uriRo, updatedAt: categories.updatedAt })
        .from(categories)
        .where(eq(categories.isShown, 1)),
      db.select({ id: brands.id, updatedAt: brands.updatedAt })
        .from(brands)
        .where(eq(brands.isShown, 1)),
      db.select({ uriRu: articles.uriRu, uriRo: articles.uriRo, isBlog: articles.isBlog, date: articles.date })
        .from(articles)
        .where(and(eq(articles.isShown, 1), lte(articles.date, today))),
      db.select({ uriRu: offers.uriRu, uriRo: offers.uriRo, dateTo: offers.dateTo, updatedAt: offers.updatedAt })
        .from(offers)
        .where(and(
          eq(offers.isShown, 1),
          inArray(offers.isOnline, [1, 2]),
          lte(offers.dateFrom, today),
          gte(offers.dateTo, today),
        )),
      db.select({ uriRu: beautySelections.uriRu, uriRo: beautySelections.uriRo, updatedAt: beautySelections.updatedAt })
        .from(beautySelections)
        .where(eq(beautySelections.isShown, 1)),
    ])

    const dynamicEntries: MetadataRoute.Sitemap = []
    for (const product of productRows) {
      dynamicEntries.push(localizedEntry(
        `/ru/katalog/product/${product.id}`,
        `/ro/catalog/product/${product.id}`,
        product.updatedAt,
      ))
    }
    for (const category of categoryRows) {
      const ru = slug(category.uriRu)
      const ro = slug(category.uriRo)
      if (ru && ro) dynamicEntries.push(localizedEntry(`/ru/katalog/${ru}`, `/ro/catalog/${ro}`, category.updatedAt))
    }
    for (const brand of brandRows) {
      dynamicEntries.push(localizedEntry(`/ru/brands/${brand.id}`, `/ro/brands/${brand.id}`, brand.updatedAt))
    }
    for (const article of articleRows) {
      const ru = slug(article.uriRu)
      const ro = slug(article.uriRo)
      if (!ru || !ro) continue
      const sectionRu = article.isBlog === 1 ? 'blog' : 'novosti'
      const sectionRo = article.isBlog === 1 ? 'blog' : 'noutati'
      dynamicEntries.push(localizedEntry(`/ru/${sectionRu}/${ru}`, `/ro/${sectionRo}/${ro}`, article.date))
    }
    for (const offer of offerRows) {
      const ru = slug(offer.uriRu)
      const ro = slug(offer.uriRo)
      if (ru && ro) dynamicEntries.push(localizedEntry(`/ru/aktsii/${ru}`, `/ro/promotii/${ro}`, offer.updatedAt ?? offer.dateTo))
    }
    for (const selection of selectionRows) {
      const ru = slug(selection.uriRu)
      const ro = slug(selection.uriRo)
      if (ru && ro) dynamicEntries.push(localizedEntry(`/ru/beauty-selections/${ru}`, `/ro/beauty-selections/${ro}`, selection.updatedAt))
    }

    const unique = new Map<string, MetadataRoute.Sitemap[number]>()
    for (const entry of [...staticEntries, ...dynamicEntries]) unique.set(entry.url, entry)
    return [...unique.values()]
  } catch {
    console.warn('[sitemap] Database content unavailable; serving localized static URLs only.')
    return staticEntries
  }
}
