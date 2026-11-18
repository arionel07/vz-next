import type { Metadata } from 'next'

import { ProductDetailPage } from '@/components/site/product-detail-page'
import { getProductSeoByUri } from '@/lib/seo-data'
import { buildPageMetadata, notFoundMetadata } from '@/lib/seo'

type PageProps = {
  params: Promise<{ category: string; product: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { product: productUri } = await params
  const product = await getProductSeoByUri(productUri, 'ru')
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

export default async function LegacyProductRoute({ params }: PageProps) {
  const { product } = await params

  return <ProductDetailPage locale="ru" params={Promise.resolve({ id: '' })} productUri={product} />
}
