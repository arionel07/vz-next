import type { Metadata } from 'next'
import { Suspense } from 'react'

import { OfferDetailPage } from '@/components/site/offer-detail-page'
import { getOfferSeo } from '@/lib/offers'
import { buildPageMetadata, notFoundMetadata } from '@/lib/seo'

type PageProps = {
  params: Promise<{ uri: string }>
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { uri } = await params
  const offer = await getOfferSeo(uri, 'ru')
  if (!offer) return notFoundMetadata('ru')

  return buildPageMetadata({
    title: offer.seoTitle?.trim() || offer.title || 'Акция',
    description: offer.seoDescription,
    keywords: offer.seoKeywords,
    path: `/ru/aktsii/${uri}`,
    alternatePath: offer.uriRo ? `/ro/promotii/${offer.uriRo}` : undefined,
    locale: 'ru',
    image: offer.image,
  })
}

export default function Page({ params, searchParams }: PageProps) {
  return (
    <Suspense fallback={<main className="site-shell" aria-busy="true" />}>
      <OfferContent params={params} searchParams={searchParams} />
    </Suspense>
  )
}

async function OfferContent({ params, searchParams }: PageProps) {
  const [{ uri }, query] = await Promise.all([params, searchParams])
  return <OfferDetailPage uri={uri} page={Math.max(1, Number(query.page) || 1)} />
}
