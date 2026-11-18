import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { Suspense } from 'react'

import { LegalPage } from '@/components/site/legal-page'
import { ProductDetailPage } from '@/components/site/product-detail-page'
import { getLegalPage } from '@/lib/legal-pages'
import { localizedPath } from '@/lib/locale-routing'
import { buildPageMetadata } from '@/lib/seo'

type RouteProps = {
  params: Promise<{ slug: string[] }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { slug } = await params
  const uri = slug.join('/')
  const page = await getLegalPage(uri, 'ru')
  if (!page) return {}

  return buildPageMetadata({
    title: page.seoTitle?.trim() || page.title,
    description: page.seoDescription,
    keywords: page.seoKeywords,
    path: `/ru/${page.uri}`,
    alternatePath: page.uriRo ? `/ro/${page.uriRo}` : undefined,
    locale: 'ru',
  })
}

function querySuffix(query: Record<string, string | string[] | undefined>) {
  const search = new URLSearchParams()
  for (const [key, item] of Object.entries(query)) {
    for (const entry of Array.isArray(item) ? item : item ? [item] : []) search.append(key, entry)
  }
  const value = search.toString()
  return value ? `?${value}` : ''
}

async function RussianLegacyRoute({ params, searchParams }: RouteProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams])

  const menuPage = await getLegalPage(slug.join('/'), 'ru')
  if (menuPage) return <LegalPage uri={menuPage.uri} locale="ru" />

  const path = `/ru/${slug.join('/')}`
  const canonicalPath = localizedPath(path, 'ru')

  if (canonicalPath !== '/ru' && canonicalPath !== path) permanentRedirect(`${canonicalPath}${querySuffix(query)}`)

  if (slug[0] === 'katalog' && slug.length === 3) {
    return <ProductDetailPage locale="ru" params={Promise.resolve({ id: '' })} productUri={slug[2]} />
  }

  notFound()
}

export default function Page(props: RouteProps) {
  return (
    <Suspense fallback={<main className="site-shell" aria-busy="true" />}>
      <RussianLegacyRoute {...props} />
    </Suspense>
  )
}
