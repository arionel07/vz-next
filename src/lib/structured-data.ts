import { legacyAsset } from '@/lib/legacy-assets'
import { absoluteUrl } from '@/lib/seo'

const SITE_NAME = 'Vizaje-Nica'
const SOCIAL_LINKS = [
  'https://www.facebook.com/VizajeNicaMD',
  'https://www.instagram.com/vizaje_nica/',
  'https://www.tiktok.com/@vizajenica',
]

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: absoluteUrl('/'),
    logo: absoluteUrl('/legacy-assets/app/img/next/header/logo_v.webp'),
    sameAs: SOCIAL_LINKS,
  }
}

export type BreadcrumbItem = { name: string; path: string }

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}

export function productJsonLd({
  id,
  title,
  sku,
  brand,
  price,
  discountPrice,
  available,
  images,
  path,
}: {
  id: number
  title: string | null
  sku: string | null
  brand: string | null
  price: number | null
  discountPrice: number | null
  available: boolean
  images: string[]
  path: string
}) {
  const effectivePrice = discountPrice && discountPrice > 0 ? discountPrice : price

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: title ?? undefined,
    sku: sku ?? String(id),
    image: images.map((image) => legacyAsset(image, 'products')).filter((url): url is string => Boolean(url)),
    brand: brand ? { '@type': 'Brand', name: brand } : undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'MDL',
      price: effectivePrice && effectivePrice > 0 ? effectivePrice.toFixed(2) : undefined,
      availability: available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: absoluteUrl(path),
    },
  }
}
