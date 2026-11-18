import { Suspense } from 'react'

import { StoresPage } from '@/components/site/stores-page'

export default function Page() {
  return <Suspense fallback={<main className="site-shell" aria-busy="true" />}><StoresPage /></Suspense>
}
