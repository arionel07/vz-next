import type { Metadata } from 'next'
import { Suspense } from 'react'

import { BrandCatalogPage } from '@/components/site/brand-catalog-page'
import type { CatalogQuery } from '@/lib/catalog-query'
import { getBrandSeoById } from '@/lib/seo-data'
import { buildPageMetadata, notFoundMetadata } from '@/lib/seo'

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<CatalogQuery>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const brand = await getBrandSeoById(Number(id), 'ru')
  if (!brand) return notFoundMetadata('ru')

  return buildPageMetadata({
    title: brand.seoTitle?.trim() || brand.title || 'Бренд',
    description: brand.seoDescription,
    keywords: brand.seoKeywords,
    path: `/ru/brands/${id}`,
    alternatePath: `/ro/brands/${id}`,
    locale: 'ru',
    image: brand.image,
  })
}

export default function Page({ params, searchParams }: PageProps) {
  return (
    <Suspense fallback={<main className="site-shell" aria-busy="true" />}>
      <BrandContent params={params} searchParams={searchParams} />
    </Suspense>
  )
}

async function BrandContent({ params, searchParams }: PageProps) {
  const { id } = await params
  const brandId = Number(id)
  return <BrandCatalogPage brandId={brandId} searchParams={searchParams} />
}
