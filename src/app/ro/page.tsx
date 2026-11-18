import { Suspense } from 'react'

import { HomePage } from '@/components/site/home-page'

export default function RomanianHome() {
  return (
    <Suspense fallback={<main className="site-shell" aria-busy="true" />}>
      <HomePage locale="ro" />
    </Suspense>
  )
}
