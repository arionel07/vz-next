import { and, eq, or } from 'drizzle-orm'
import { cache } from 'react'

import { db } from '@/db'
import type { StoreLocale } from '@/lib/locale-routing'
import { menu } from '../../drizzle/schema'

export type LegalPage = {
  title: string
  uri: string
  uriRu: string | null
  uriRo: string | null
  content: string
  seoTitle: string | null
  seoDescription: string | null
  seoKeywords: string | null
}

export const getLegalPage = cache(async function getLegalPage(uri: string, locale: StoreLocale = 'ru') {
  const isRomanian = locale === 'ro'
  const [page] = await db
    .select({
      title: isRomanian ? menu.titleRo : menu.titleRu,
      uri: isRomanian ? menu.uriRo : menu.uriRu,
      uriRu: menu.uriRu,
      uriRo: menu.uriRo,
      content: isRomanian ? menu.descRo : menu.descRu,
      seoTitle: isRomanian ? menu.seoTitleRo : menu.seoTitleRu,
      seoDescription: isRomanian ? menu.seoDescRo : menu.seoDescRu,
      seoKeywords: isRomanian ? menu.seoKeywordsRo : menu.seoKeywordsRu,
    })
    .from(menu)
    .where(and(
      eq(menu.isShown, 1),
      or(
        eq(isRomanian ? menu.uriRo : menu.uriRu, uri),
        eq(isRomanian ? menu.uriRu : menu.uriRo, uri),
      )!,
    ))
    .limit(1)

  if (!page || !page.title) return null

  return {
    ...page,
    title: page.title ?? '',
    content: page.content ?? '',
  } satisfies LegalPage
})
