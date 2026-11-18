import { Suspense } from 'react'

import { SearchPage } from '@/components/site/search-page'
import { catalogPageNumber, type CatalogQuery } from '@/lib/catalog-query'

type PageProps = {
  searchParams: Promise<CatalogQuery>
}

export default function Page({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<main className="site-shell" aria-busy="true" />}>
      <SearchContent searchParams={searchParams} />
    </Suspense>
  )
}

async function SearchContent({ searchParams }: PageProps) {
  const params = await searchParams
  const query = Array.isArray(params.q) ? params.q[0] ?? '' : params.q ?? ''
  return <SearchPage query={query} page={catalogPageNumber(params)} params={params} />
}
