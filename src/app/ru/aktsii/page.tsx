import { Suspense } from 'react'

import { OffersPage } from '@/components/site/offers-page'

export default function Page() {
  return (
    <Suspense fallback={<main className="site-shell" aria-busy="true" />}>
      <OffersPage />
    </Suspense>
  )
}
