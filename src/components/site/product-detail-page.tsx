import { connection } from 'next/server'
import { cookies } from 'next/headers'
import { LocalizedLink as Link } from '@/components/site/localized-link'

import { getProductById, getProductByUri } from '@/lib/catalog'
import type { StoreLocale } from '@/lib/locale-routing'
import { AUTH_SESSION_COOKIE, findClientById, getUserBySessionToken } from '@/lib/auth'
import { breadcrumbJsonLd, productJsonLd } from '@/lib/structured-data'

import { JsonLd } from './json-ld'
import { ProductDetailClient } from './product-detail-client'

export async function ProductDetailPage({
  params,
  locale = 'ru',
  productUri,
}: {
  params: Promise<{ id: string }>
  locale?: StoreLocale
  productUri?: string
}) {
  await connection()
  const { id } = await params
  const cookieStore = await cookies()
  const user = await getUserBySessionToken(cookieStore.get(AUTH_SESSION_COOKIE)?.value)
  const product = productUri
    ? await getProductByUri(productUri, user?.isB2B ?? false, locale)
    : await getProductById(Number(id), user?.isB2B ?? false, locale)

  if (!product) {
    return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-[1440px] flex-col items-start justify-center px-5 py-24 lg:px-[7%]">
        <p className="mb-3 text-xs tracking-[.14em] text-graphite uppercase">{locale === 'ro' ? 'Catalog' : 'Каталог'}</p>
        <h1 className="mb-7 text-5xl font-medium tracking-[-.055em] sm:text-7xl">{locale === 'ro' ? 'Produsul nu a fost găsit' : 'Товар не найден'}</h1>
        <Link className="inline-flex min-h-12 items-center justify-center rounded-md bg-midnight-ink px-6 text-sm text-white transition-colors hover:bg-button-hover hover:text-midnight-ink focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-2" href={locale === 'ro' ? '/ro/catalog' : '/ru/katalog'}>
          {locale === 'ro' ? 'Înapoi la catalog' : 'Вернуться в каталог'}
        </Link>
      </main>
    )
  }

  const client = user && !user.isB2B ? await findClientById(user.id) : null
  const bonusInfo = client
    ? {
        rate: Number(client.discount) || 0,
        balance: Number(client.bonus) || 0,
      }
    : null

  const catalogSegment = locale === 'ro' ? 'catalog' : 'katalog'
  const productPath = `/${locale}/${catalogSegment}/product/${product.id}`
  const breadcrumbItems = [
    { name: locale === 'ro' ? 'Acasă' : 'Главная', path: `/${locale}` },
    { name: locale === 'ro' ? 'Catalog' : 'Каталог', path: `/${locale}/${catalogSegment}` },
    ...product.categoryTrail
      .filter((category) => category.uri)
      .map((category) => ({ name: category.title, path: `/${locale}/${catalogSegment}/${category.uri}` })),
    { name: product.title ?? '', path: productPath },
  ]

  return (
    <>
      <JsonLd data={productJsonLd({
        id: product.id,
        title: product.title,
        sku: product.sku,
        brand: product.brand,
        price: product.price,
        discountPrice: product.discountPrice,
        available: Boolean(product.onStock) && ((product.price ?? 0) > 0 || (product.discountPrice ?? 0) > 0),
        images: product.images,
        path: productPath,
      })}
      />
      <JsonLd data={breadcrumbJsonLd(breadcrumbItems)} />
      <ProductDetailClient product={{ ...product, locale }} bonusInfo={bonusInfo} isB2B={user?.isB2B ?? false} />
    </>
  )
}
