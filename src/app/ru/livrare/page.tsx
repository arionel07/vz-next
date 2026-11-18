import { connection } from 'next/server'
import { Suspense } from 'react'

import { DeliveryPage } from '@/components/site/delivery-page'
import { getDeliveryPage } from '@/lib/delivery'

async function DeliveryContent() {
  await connection()
  return <DeliveryPage locale="ru" data={await getDeliveryPage('ru')} />
}

export default function Page() {
  return (
    <Suspense fallback={<main className="site-shell" aria-busy="true" />}>
      <DeliveryContent />
    </Suspense>
  )
}
