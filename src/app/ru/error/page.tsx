import type { Metadata } from 'next'
import { Suspense } from 'react'

import { OrderResultRoute } from '@/components/site/order-result-route'

export const metadata: Metadata = {
  title: 'Ошибка оформления заказа — Vizaje-Nica',
}

export default function Page() {
  return (
    <>
      <Suspense fallback={<main className="site-shell order-result-shell" aria-busy="true" />}>
        <OrderResultRoute variant="error" />
      </Suspense>
    </>
  )
}
