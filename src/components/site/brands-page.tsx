import { connection } from 'next/server'

import { BrandsDirectory } from '@/components/site/brands-directory'
import { getBrandsPage } from '@/lib/catalog'
import type { BrandSummary } from '@/lib/catalog'
import type { StoreLocale } from '@/lib/locale-routing'

type BrandGroup = {
  key: string
  brands: BrandSummary[]
}

function brandInitial(title: string | null, locale: StoreLocale) {
  const firstCharacter = Array.from(title?.trim() ?? '')[0] ?? '#'
  const initial = firstCharacter.toLocaleUpperCase(locale)
  return /[0-9]/.test(initial) ? '0—9' : initial
}

function alphabetBucket(key: string) {
  if (key === '0—9') return 0
  const latinInitial = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (/^[A-Z]$/.test(latinInitial)) return 1
  if (/^[А-ЯЁ]$/.test(key)) return 2
  return 3
}

export async function BrandsPage({ query, locale = 'ru' }: { query: string; locale?: StoreLocale }) {
  await connection()
  const search = query.trim()
  const brands = await getBrandsPage(search, locale)
  const grouped = new Map<string, BrandSummary[]>()

  for (const brand of brands) {
    const key = brandInitial(brand.title, locale)
    grouped.set(key, [...(grouped.get(key) ?? []), brand])
  }

  const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true })
  const groups: BrandGroup[] = [...grouped.entries()]
    .sort(([left], [right]) => alphabetBucket(left) - alphabetBucket(right) || collator.compare(left, right))
    .map(([key, entries]) => ({
      key,
      brands: entries.sort((left, right) => collator.compare(left.title ?? '', right.title ?? '')),
    }))

  return <BrandsDirectory groups={groups} locale={locale} query={search} />
}
