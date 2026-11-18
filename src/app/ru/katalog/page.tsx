import { Suspense } from 'react'

import { CatalogPage } from '@/components/site/catalog-page'
import type { CatalogQuery } from '@/lib/catalog-query'

type PageProps = {
  searchParams: Promise<CatalogQuery>
}

export default function Page({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<main className="site-shell" aria-busy="true" />}>
      <CatalogPage searchParams={searchParams} />
    </Suspense>
  )
}
