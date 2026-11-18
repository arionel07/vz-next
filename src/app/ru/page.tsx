import { Suspense } from 'react'

import { HomePage } from '@/components/site/home-page'

export default function Page() {
  return (
    <Suspense fallback={<main className="site-shell" aria-busy="true" />}>
      <HomePage />
    </Suspense>
  )
}
