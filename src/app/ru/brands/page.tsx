import { Suspense } from 'react'

import { BrandsPage } from '@/components/site/brands-page'

type PageProps = {
  searchParams: Promise<{ q?: string }>
}

export default function Page({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<main className="site-shell" aria-busy="true" />}>
      <BrandsContent searchParams={searchParams} />
    </Suspense>
  )
}

async function BrandsContent({ searchParams }: PageProps) {
  const params = await searchParams
  return <BrandsPage query={params.q ?? ''} />
}
