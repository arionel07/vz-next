import type { Metadata } from 'next'
import { Suspense } from 'react'

import { NewsDetailPage } from '@/components/site/news-detail-page'
import { getNewsArticle } from '@/lib/news'
import { legacyAsset } from '@/lib/legacy-assets'
import { buildPageMetadata, notFoundMetadata } from '@/lib/seo'

type PageProps = { params: Promise<{ uri: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { uri } = await params
  const data = await getNewsArticle(uri, 'ru')
  if (!data) return notFoundMetadata('ru')

  return buildPageMetadata({
    title: data.article.seoTitle?.trim() || data.article.title || 'Новости',
    description: data.article.seoDescription || data.article.description,
    keywords: data.article.seoKeywords,
    path: `/ru/novosti/${data.article.uriRu || uri}`,
    alternatePath: data.article.uriRo ? `/ro/noutati/${data.article.uriRo}` : undefined,
    locale: 'ru',
    image: legacyAsset(data.article.image, 'articles'),
  })
}

export default function Page({ params }: PageProps) {
  return (
    <Suspense fallback={<main className="site-shell" aria-busy="true" />}>
      <NewsContent params={params} />
    </Suspense>
  )
}

async function NewsContent({ params }: PageProps) {
  const { uri } = await params
  return <NewsDetailPage uri={uri} />
}
