import type { Metadata } from 'next'
import { Suspense } from 'react'

import { CategoryCatalogPage } from '@/components/site/category-catalog-page'
import type { CatalogQuery } from '@/lib/catalog-query'
import { getCategorySeoByUri } from '@/lib/seo-data'
import { buildPageMetadata, notFoundMetadata } from '@/lib/seo'

type PageProps = {
  params: Promise<{ category: string }>
  searchParams: Promise<CatalogQuery>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category: uri } = await params
  const category = await getCategorySeoByUri(uri, 'ru')
  if (!category) return notFoundMetadata('ru')

  return buildPageMetadata({
    title: category.seoTitle?.trim() || category.title || 'Каталог',
    description: category.seoDescription,
    keywords: category.seoKeywords,
    path: `/ru/katalog/${uri}`,
    alternatePath: category.uriRo ? `/ro/catalog/${category.uriRo}` : undefined,
    locale: 'ru',
    image: category.image,
  })
}

export default function Page({ params, searchParams }: PageProps) {
  return (
    <Suspense fallback={<main className="site-shell" aria-busy="true" />}>
      <CategoryContent params={params} searchParams={searchParams} />
    </Suspense>
  )
}

async function CategoryContent({ params, searchParams }: PageProps) {
  const { category } = await params
  return <CategoryCatalogPage uri={category} searchParams={searchParams} />
}
