import { Suspense } from 'react'

import { BeautySelectionDetailPage } from '@/components/site/beauty-selection-detail-page'

type PageProps = { params: Promise<{ uri: string }> }

export default function Page({ params }: PageProps) {
  return (
    <Suspense fallback={<main className="site-shell" aria-busy="true" />}>
      <SelectionContent params={params} />
    </Suspense>
  )
}

async function SelectionContent({ params }: PageProps) {
  const { uri } = await params
  return <BeautySelectionDetailPage uri={uri} />
}
