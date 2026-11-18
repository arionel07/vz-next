import { Suspense } from 'react'

import { CollectionCatalogPage } from '@/components/site/collection-catalog-page'
import type { CatalogQuery } from '@/lib/catalog-query'

type PageProps = { searchParams: Promise<CatalogQuery> }

export default function Page({ searchParams }: PageProps) {
  return <Suspense fallback={<main className="site-shell" aria-busy="true" />}><CollectionCatalogPage collection="new" searchParams={searchParams} /></Suspense>
}
