import { Suspense } from 'react'

import { BeautySelectionsPage } from '@/components/site/beauty-selections-page'

export default function Page() {
  return (
    <Suspense fallback={<main className="site-shell" aria-busy="true" />}>
      <BeautySelectionsPage />
    </Suspense>
  )
}
