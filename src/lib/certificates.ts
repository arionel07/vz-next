import { and, asc, eq } from 'drizzle-orm'

import { db } from '@/db'
import { legacyAssetIfExists } from '@/lib/legacy-server-assets'
import type { StoreLocale } from '@/lib/locale-routing'
import { brandCertificates, brands } from '../../drizzle/schema'

export async function getCertificatesPage(locale: StoreLocale = 'ru') {
  const rows = await db
    .select({
      id: brandCertificates.id,
      brandId: brandCertificates.brandId,
      title: locale === 'ro' ? brandCertificates.titleRo : brandCertificates.titleRu,
      image: brandCertificates.image,
      previewImage: brandCertificates.previewImage,
      brand: locale === 'ro' ? brands.h1Ro : brands.h1Ru,
      brandFallback: brands.title,
      brandOrder: brands.sorder,
      certificateOrder: brandCertificates.sorder,
    })
    .from(brandCertificates)
    .innerJoin(brands, eq(brandCertificates.brandId, brands.id))
    .where(and(eq(brandCertificates.isShown, 1), eq(brands.isShown, 1)))
    .orderBy(asc(brands.sorder), asc(brands.title), asc(brandCertificates.sorder), asc(brandCertificates.id))

  const grouped = new Map<number, { id: number; title: string; certificates: { id: number; title: string; image: string; previewImage: string | null }[] }>()

  for (const row of rows) {
    const brandTitle = row.brand?.trim() || row.brandFallback?.trim() || ''
    if (!brandTitle) continue
    let brand = grouped.get(row.brandId)
    if (!brand) {
      brand = { id: row.brandId, title: brandTitle, certificates: [] }
      grouped.set(row.brandId, brand)
    }
    const image = legacyAssetIfExists(row.image, 'brand_certificates')
    if (!image) continue
    brand.certificates.push({
      id: row.id,
      title: row.title?.trim() || brandTitle,
      image,
      previewImage: legacyAssetIfExists(row.previewImage, 'brand_certificates') ?? null,
    })
  }

  return [...grouped.values()].filter((brand) => brand.certificates.length)
}
