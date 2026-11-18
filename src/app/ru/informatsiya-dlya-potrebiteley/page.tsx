import { Suspense } from 'react'

import { LegalPage } from '@/components/site/legal-page'

export default function Page() {
  return <Suspense fallback={<main className="site-shell" aria-busy="true" />}><LegalPage uri="informatsiya-dlya-potrebiteley" /></Suspense>
}
