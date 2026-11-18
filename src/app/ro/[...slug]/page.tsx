import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { notFound, permanentRedirect, redirect } from 'next/navigation'
import { connection } from 'next/server'
import { Suspense } from 'react'

import { AccountPage } from '@/components/site/account-page'
import { BeautySelectionDetailPage } from '@/components/site/beauty-selection-detail-page'
import { BeautySelectionsPage } from '@/components/site/beauty-selections-page'
import { B2BPage } from '@/components/site/b2b-page'
import { BlogDetailPage } from '@/components/site/blog-detail-page'
import { BlogPage } from '@/components/site/blog-page'
import { BrandCatalogPage } from '@/components/site/brand-catalog-page'
import { BrandsPage } from '@/components/site/brands-page'
import { CatalogPage } from '@/components/site/catalog-page'
import { CategoryCatalogPage } from '@/components/site/category-catalog-page'
import { CheckoutPage } from '@/components/site/checkout-page'
import { CertificatesPage } from '@/components/site/certificates-page'
import { ContactsPage } from '@/components/site/contacts-page'
import { DeliveryPage } from '@/components/site/delivery-page'
import { FavoritesPage } from '@/components/site/favorites-page'
import { GiftCardsPage } from '@/components/site/gift-cards-page'
import { LegalPage } from '@/components/site/legal-page'
import { NewsDetailPage } from '@/components/site/news-detail-page'
import { NewsPage } from '@/components/site/news-page'
import { OfferDetailPage } from '@/components/site/offer-detail-page'
import { OffersPage } from '@/components/site/offers-page'
import { OrderDetailPage } from '@/components/site/order-detail-page'
import { OrderResultRoute } from '@/components/site/order-result-route'
import { OpenCartRoute } from '@/components/site/open-cart-route'
import { ProductDetailPage } from '@/components/site/product-detail-page'
import { ResetPasswordPage } from '@/components/site/reset-password-page'
import { SearchPage } from '@/components/site/search-page'
import { StoresPage } from '@/components/site/stores-page'
import { AUTH_SESSION_COOKIE, getUserBySessionToken } from '@/lib/auth'
import { getAccountData, getAccountOrder } from '@/lib/account'
import { getContactPage } from '@/lib/contacts'
import { getDeliveryPage } from '@/lib/delivery'
import { getCheckoutCustomerPrefill, getCheckoutOptions } from '@/lib/checkout-options'
import { getLegalPage } from '@/lib/legal-pages'
import { getBlogArticle } from '@/lib/blog'
import { getNewsArticle } from '@/lib/news'
import { getOfferSeo } from '@/lib/offers'
import { legacyAsset } from '@/lib/legacy-assets'
import type { StoreLocale } from '@/lib/locale-routing'
import { buildPageMetadata, notFoundMetadata } from '@/lib/seo'
import { getBrandSeoById, getCategorySeoByUri, getProductSeoById, getProductSeoByUri } from '@/lib/seo-data'

type RouteParams = { slug: string[] }
type QueryValue = string | string[] | undefined
type RouteProps = {
  params: Promise<RouteParams>
  searchParams: Promise<Record<string, QueryValue>>
}

function value(query: Record<string, QueryValue>, key: string) {
  const item = query[key]
  return Array.isArray(item) ? item[0] : item
}

function pageNumber(query: Record<string, QueryValue>) {
  return Math.max(1, Number(value(query, 'page')) || 1)
}

function querySuffix(query: Record<string, QueryValue>) {
  const search = new URLSearchParams()
  for (const [key, item] of Object.entries(query)) {
    for (const entry of Array.isArray(item) ? item : item ? [item] : []) search.append(key, entry)
  }
  const value = search.toString()
  return value ? `?${value}` : ''
}

async function AccountRoute({ query, locale }: { query: Record<string, QueryValue>; locale: StoreLocale }) {
  await connection()
  const cookieStore = await cookies()
  const user = await getUserBySessionToken(cookieStore.get(AUTH_SESSION_COOKIE)?.value)
  if (!user) redirect(`/${locale}`)

  const account = await getAccountData(user.id, locale)
  if (!account) redirect(`/${locale}`)
  return <AccountPage initialData={account} initialSection={value(query, 'section')} locale={locale} />
}

async function AccountOrderRoute({ id, locale }: { id: string; locale: StoreLocale }) {
  await connection()
  const cookieStore = await cookies()
  const user = await getUserBySessionToken(cookieStore.get(AUTH_SESSION_COOKIE)?.value)
  if (!user) redirect(`/${locale}`)

  const order = await getAccountOrder(user.id, Number(id), locale)
  if (!order) notFound()
  return <OrderDetailPage order={order} locale={locale} />
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { slug } = await params
  const [section, ...rest] = slug
  if (!section) return {}

  switch (section) {
    case 'catalog': {
      if (rest[0] === 'product' && /^\d+$/.test(rest[1] ?? '')) {
        const product = await getProductSeoById(Number(rest[1]), 'ro')
        if (!product) return notFoundMetadata('ro')
        const title = product.seoTitle?.trim() || [product.brandTitle, product.title, product.categoryTitle].filter(Boolean).join(' — ')
        return buildPageMetadata({
          title: title || product.title || 'Produs',
          description: product.seoDescription,
          keywords: product.seoKeywords,
          path: `/ro/catalog/product/${product.id}`,
          alternatePath: `/ru/katalog/product/${product.id}`,
          locale: 'ro',
          image: product.image,
        })
      }
      if (rest.length === 1) {
        const category = await getCategorySeoByUri(rest[0], 'ro')
        if (!category) return notFoundMetadata('ro')
        return buildPageMetadata({
          title: category.seoTitle?.trim() || category.title || 'Catalog',
          description: category.seoDescription,
          keywords: category.seoKeywords,
          path: `/ro/catalog/${rest[0]}`,
          alternatePath: category.uriRu ? `/ru/katalog/${category.uriRu}` : undefined,
          locale: 'ro',
          image: category.image,
        })
      }
      if (rest.length === 2) {
        const product = await getProductSeoByUri(rest[1], 'ro')
        if (!product) return notFoundMetadata('ro')
        const title = product.seoTitle?.trim() || [product.brandTitle, product.title, product.categoryTitle].filter(Boolean).join(' — ')
        return buildPageMetadata({
          title: title || product.title || 'Produs',
          description: product.seoDescription,
          keywords: product.seoKeywords,
          path: `/ro/catalog/product/${product.id}`,
          alternatePath: `/ru/katalog/product/${product.id}`,
          locale: 'ro',
          image: product.image,
        })
      }
      return {}
    }
    case 'brands':
    case 'brendyi': {
      if (!/^\d+$/.test(rest[0] ?? '')) return {}
      const brand = await getBrandSeoById(Number(rest[0]), 'ro')
      if (!brand) return notFoundMetadata('ro')
      return buildPageMetadata({
        title: brand.seoTitle?.trim() || brand.title || 'Brand',
        description: brand.seoDescription,
        keywords: brand.seoKeywords,
        path: `/ro/brands/${rest[0]}`,
        alternatePath: `/ru/brands/${rest[0]}`,
        locale: 'ro',
        image: brand.image,
      })
    }
    case 'promotii':
    case 'aktsii': {
      if (!rest[0]) return {}
      const offer = await getOfferSeo(rest[0], 'ro')
      if (!offer) return notFoundMetadata('ro')
      return buildPageMetadata({
        title: offer.seoTitle?.trim() || offer.title || 'Promoție',
        description: offer.seoDescription,
        keywords: offer.seoKeywords,
        path: `/ro/promotii/${rest[0]}`,
        alternatePath: offer.uriRu ? `/ru/aktsii/${offer.uriRu}` : undefined,
        locale: 'ro',
        image: offer.image,
      })
    }
    case 'blog': {
      if (!rest[0]) return {}
      const data = await getBlogArticle(rest[0], 'ro')
      if (!data) return notFoundMetadata('ro')
      return buildPageMetadata({
        title: data.article.seoTitle?.trim() || data.article.title || 'Blog',
        description: data.article.seoDescription || data.article.description,
        keywords: data.article.seoKeywords,
        path: `/ro/blog/${data.article.uriRo || rest[0]}`,
        alternatePath: data.article.uriRu ? `/ru/blog/${data.article.uriRu}` : undefined,
        locale: 'ro',
        image: legacyAsset(data.article.image, 'articles'),
      })
    }
    case 'noutati':
    case 'novosti': {
      if (!rest[0]) return {}
      const data = await getNewsArticle(rest[0], 'ro')
      if (!data) return notFoundMetadata('ro')
      return buildPageMetadata({
        title: data.article.seoTitle?.trim() || data.article.title || 'Noutăți',
        description: data.article.seoDescription || data.article.description,
        keywords: data.article.seoKeywords,
        path: `/ro/noutati/${data.article.uriRo || rest[0]}`,
        alternatePath: data.article.uriRu ? `/ru/novosti/${data.article.uriRu}` : undefined,
        locale: 'ro',
        image: legacyAsset(data.article.image, 'articles'),
      })
    }
    default: {
      const page = await getLegalPage(slug.join('/'), 'ro')
      if (!page) return {}
      return buildPageMetadata({
        title: page.seoTitle?.trim() || page.title,
        description: page.seoDescription,
        keywords: page.seoKeywords,
        path: `/ro/${page.uri}`,
        alternatePath: page.uriRu ? `/ru/${page.uriRu}` : undefined,
        locale: 'ro',
      })
    }
  }
}

async function RomanianRoute({ params, searchParams }: RouteProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams])
  const [section, ...rest] = slug
  const page = pageNumber(query)
  const search = value(query, 'q') ?? ''
  const locale: StoreLocale = 'ro'

  if (!section) notFound()

  switch (section) {
    case 'catalog':
    case 'katalog': {
      if (section === 'katalog') permanentRedirect(`/ro/catalog${rest.length ? `/${rest.join('/')}` : ''}${querySuffix(query)}`)
      if (!rest.length) {
        return <CatalogPage locale={locale} searchParams={Promise.resolve(query)} />
      }
      if (rest[0] === 'product' && /^\d+$/.test(rest[1] ?? '')) {
        return <ProductDetailPage locale={locale} params={Promise.resolve({ id: rest[1] })} />
      }
      if (rest.length === 1) {
        return <CategoryCatalogPage locale={locale} uri={rest[0]} searchParams={Promise.resolve(query)} />
      }
      if (rest.length === 2) {
        return <ProductDetailPage locale={locale} productUri={rest[1]} params={Promise.resolve({ id: '' })} />
      }
      notFound()
    }
    case 'catalog-categories':
    case 'katalog-categories':
    case 'catalog-collections':
    case 'katalog-collections':
      return <CatalogPage locale={locale} searchParams={Promise.resolve(query)} />
    case 'brands':
    case 'brendyi':
      if (rest.length === 0) return <BrandsPage locale={locale} query={search} />
      if (/^\d+$/.test(rest[0])) return <BrandCatalogPage locale={locale} brandId={Number(rest[0])} searchParams={Promise.resolve(query)} />
      notFound()
    case 'promotii':
    case 'aktsii':
      if (rest.length === 0) return <OffersPage locale={locale} />
      return <OfferDetailPage locale={locale} uri={rest[0]} page={page} />
    case 'beauty-selections':
    case 'byuti-podborki':
      if (rest.length === 0) return <BeautySelectionsPage locale={locale} />
      return <BeautySelectionDetailPage locale={locale} uri={rest[0]} />
    case 'blog':
      if (rest.length === 0) return <BlogPage locale={locale} page={page} />
      return <BlogDetailPage locale={locale} uri={rest[0]} />
    case 'noutati':
    case 'novosti':
      if (rest.length === 0) return <NewsPage locale={locale} page={page} />
      return <NewsDetailPage locale={locale} uri={rest[0]} />
    case 'magazinele':
    case 'magazine':
    case 'magazinyi':
      return <StoresPage locale={locale} />
    case 'livrare':
    case 'dostavka': {
      await connection()
      return <DeliveryPage locale={locale} data={await getDeliveryPage(locale)} />
    }
    case 'contacte':
    case 'kontaktyi': {
      await connection()
      return <ContactsPage locale={locale} data={await getContactPage(locale)} />
    }
    case 'card-cadou':
    case 'podarochnaya-karta': {
      if (rest.length === 0) return <GiftCardsPage locale={locale} />
      notFound()
    }
    case 'certificate-de-autenticitate':
    case 'sertifikaty-podlinnosti':
      return <CertificatesPage locale={locale} />
    case 'cos':
    case 'cart':
    case 'korzina':
      return <OpenCartRoute />
    case 'politica-de-confidentialitate-si-cookies':
    case 'politika-konfidentsialnosti-i-cookies':
      return <LegalPage locale={locale} uri="politica-de-confidentialitate-si-cookies" />
    case 'termeni-si-conditii':
    case 'usloviya-i-polojeniya':
      return <LegalPage locale={locale} uri="termeni-si-conditii" />
    case 'informatii-pentru-consumatori':
    case 'informatsiya-dlya-potrebiteley':
      return <LegalPage locale={locale} uri="informatii-pentru-consumatori" />
    case 'novinki':
    case 'new':
    case 'nou':
      return <CollectionRoute locale={locale} collection="new" query={query} />
    case 'skidki':
    case 'sale':
    case 'reduceri':
      return <CollectionRoute locale={locale} collection="sale" query={query} />
    case 'top-prodaz':
    case 'top-prodaj':
    case 'top-prodazh':
    case 'cele-mai-vandute':
    case 'top-vanzari':
      return <CollectionRoute locale={locale} collection="hits" query={query} />
    case 'search':
    case 'cautare':
    case 'poisk':
      return <SearchPage locale={locale} query={search} page={page} params={query} />
    case 'favorite':
    case 'izbrannyie':
    case 'wishlist':
      return <FavoritesPage locale={locale} />
    case 'contul-meu':
    case 'account':
    case 'lichnyiy-kabinet':
      return <AccountRoute query={query} locale={locale} />
    case 'comenzile-mele':
    case 'zakazyi':
      if (rest.length) return <AccountOrderRoute id={rest[0]} locale={locale} />
      return <AccountRoute query={{ ...query, section: 'orders' }} locale={locale} />
    case 'checkout':
      return <CheckoutRoute locale={locale} />
    case 'order-success':
    case 'success':
      return <OrderResultRoute locale={locale} variant="success" />
    case 'eroare':
    case 'error':
      return <OrderResultRoute locale={locale} variant="error" />
    case 'b2b':
      return <B2BPage />
    case 'resetati-parola':
    case 'password-reset':
    case 'password-recovery':
      return <ResetPasswordPage locale={locale} />
    default: {
      const menuPage = await getLegalPage(slug.join('/'), 'ro')
      if (menuPage) return <LegalPage uri={menuPage.uri} locale="ro" />
      notFound()
    }
  }
}

async function CheckoutRoute({ locale }: { locale: StoreLocale }) {
  const [options, customer] = await Promise.all([
    getCheckoutOptions(locale),
    getCheckoutCustomerPrefill(),
  ])
  return <CheckoutPage locale={locale} {...options} customer={customer} />
}

async function CollectionRoute({ locale, collection, query }: {
  locale: StoreLocale
  collection: 'new' | 'hits' | 'sale'
  query: Record<string, QueryValue>
}) {
  const { CollectionCatalogPage } = await import('@/components/site/collection-catalog-page')
  return <CollectionCatalogPage locale={locale} collection={collection} searchParams={Promise.resolve(query)} />
}

export default function Page(props: RouteProps) {
  return (
    <Suspense fallback={<main className="site-shell" aria-busy="true" />}>
      <RomanianRoute {...props} />
    </Suspense>
  )
}
