'use client'

import { useSearchParams } from 'next/navigation'

import { OrderResultPage } from './order-result-page'
import type { StoreLocale } from '@/lib/locale-routing'

export function OrderResultRoute({ variant, locale = 'ru' }: { variant: 'success' | 'error'; locale?: StoreLocale }) {
  const searchParams = useSearchParams()

  return (
    <OrderResultPage
      variant={variant}
      locale={locale}
      orderNumber={searchParams.get('order') ?? searchParams.get('id') ?? undefined}
      reason={searchParams.get('reason') ?? undefined}
    />
  )
}
