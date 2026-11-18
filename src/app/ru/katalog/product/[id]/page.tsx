import type { Metadata } from 'next'
import { Suspense } from 'react'

import { ProductDetailPage } from '@/components/site/product-detail-page'
import { getProductSeoById } from '@/lib/seo-data'
import { buildPageMetadata, notFoundMetadata } from '@/lib/seo'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const product = await getProductSeoById(Number(id), 'ru')
  if (!product) return notFoundMetadata('ru')

  const title = product.seoTitle?.trim() || [product.brandTitle, product.title, product.categoryTitle].filter(Boolean).join(' — ')
  return buildPageMetadata({
    title: title || product.title || 'Товар',
    description: product.seoDescription,
    keywords: product.seoKeywords,
    path: `/ru/katalog/product/${product.id}`,
    alternatePath: `/ro/catalog/product/${product.id}`,
    locale: 'ru',
    image: product.image,
  })
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<main className="min-h-[60vh] px-5" aria-busy="true" />}>
      <ProductDetailPage params={params} />
    </Suspense>
  )
}
