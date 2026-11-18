import { connection } from 'next/server'

import { OffersGrid } from '@/components/site/offers-grid'
import { legacyAssetIfExists } from '@/lib/legacy-server-assets'
import { getOffersPage } from '@/lib/offers'
import type { StoreLocale } from '@/lib/locale-routing'

export async function OffersPage({ locale = 'ru' }: { locale?: StoreLocale }) {
  await connection()
  const offers = await getOffersPage(locale)
  const cards = offers.map((offer) => ({
    ...offer,
    imageUrl: legacyAssetIfExists(offer.image, 'offers'),
  }))

  return <OffersGrid locale={locale} offers={cards} />
}
