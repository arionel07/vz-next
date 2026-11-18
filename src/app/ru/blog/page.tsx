import { Suspense } from 'react'

import { BlogPage } from '@/components/site/blog-page'

type PageProps = { searchParams: Promise<{ page?: string }> }

export default function Page({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<main className="site-shell" aria-busy="true" />}>
      <BlogContent searchParams={searchParams} />
    </Suspense>
  )
}

async function BlogContent({ searchParams }: PageProps) {
  const query = await searchParams
  return <BlogPage page={Math.max(1, Number(query.page) || 1)} />
}
