import type { Metadata } from 'next'

import type { StoreLocale } from './locale-routing'
import { getSiteOrigin } from './site-url'

const SITE_NAME = 'Vizaje-Nica'

export function absoluteUrl(path: string) {
  return `${getSiteOrigin()}${path}`
}

export function buildPageMetadata({
  title,
  description,
  keywords,
  path,
  alternatePath,
  locale,
  image,
}: {
  title: string
  description?: string | null
  keywords?: string | null
  path: string
  alternatePath?: string | null
  locale: StoreLocale
  image?: string | null
}): Metadata {
  const url = absoluteUrl(path)
  const fullTitle = `${title} — ${SITE_NAME}`
  const trimmedDescription = description?.trim() || undefined
  const images = image ? [{ url: image }] : undefined

  return {
    title: fullTitle,
    description: trimmedDescription,
    keywords: keywords?.trim() || undefined,
    alternates: {
      canonical: url,
      languages: alternatePath
        ? {
            [locale]: url,
            [locale === 'ro' ? 'ru' : 'ro']: absoluteUrl(alternatePath),
          }
        : undefined,
    },
    openGraph: {
      title: fullTitle,
      description: trimmedDescription,
      url,
      siteName: SITE_NAME,
      locale: locale === 'ro' ? 'ro_RO' : 'ru_RU',
      images,
      type: 'website',
    },
  }
}

export function notFoundMetadata(locale: StoreLocale): Metadata {
  return {
    title: locale === 'ro' ? `Pagina nu a fost găsită — ${SITE_NAME}` : `Страница не найдена — ${SITE_NAME}`,
    robots: { index: false, follow: false },
  }
}
