import { Suspense } from 'react'

import { NewsPage } from '@/components/site/news-page'

type PageProps = { searchParams: Promise<{ page?: string }> }

export default function Page({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<main className="site-shell" aria-busy="true" />}>
      <NewsContent searchParams={searchParams} />
    </Suspense>
  )
}

async function NewsContent({ searchParams }: PageProps) {
  const query = await searchParams
  return <NewsPage page={Math.max(1, Number(query.page) || 1)} />
}
