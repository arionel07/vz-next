import { LocalizedLink as Link } from '@/components/site/localized-link'
import { connection } from 'next/server'
import { notFound } from 'next/navigation'

import { getBrandPage } from '@/lib/catalog'
import { catalogPageNumber, catalogQueryString, catalogSort, parseCatalogFilters, type CatalogQuery } from '@/lib/catalog-query'
import { catalogView } from '@/lib/catalog-view'
import type { StoreLocale } from '@/lib/locale-routing'

import { CatalogFilterForm } from './catalog-filter-form'
import { CatalogProductGrid } from './catalog-product-grid'

export async function BrandCatalogPage({ brandId, searchParams, locale = 'ru' }: { brandId: number; searchParams: Promise<CatalogQuery>; locale?: StoreLocale }) {
  await connection()
  const params = { ...await searchParams }
  delete params.q
  const filters = parseCatalogFilters(params, 16)
  const page = catalogPageNumber(params)
  const sort = catalogSort(params)
  const result = await getBrandPage(brandId, filters, locale)

  if (!result) notFound()

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize))
  if (page > totalPages) notFound()
  const brandUrl = (nextPage: number) => {
    const query = catalogQueryString(params, nextPage)
    return `/${locale}/brands/${brandId}${query ? `?${query}` : ''}`
  }
  const text = locale === 'ro'
    ? { home: 'Acasă', brands: 'Branduri', catalog: 'Catalog de brand', products: 'produse', empty: 'Nu există produse momentan', emptyHint: 'Nu sunt produse disponibile de la acest brand.', all: 'Toate brandurile', pages: 'Pagini catalog brand', back: 'Înapoi', next: 'Înainte', filtersApplied: 'Filtre aplicate' }
    : { home: 'Главная', brands: 'Бренды', catalog: 'Каталог бренда', products: 'товаров', empty: 'Товаров пока нет', emptyHint: 'В каталоге пока нет доступных товаров этого бренда.', all: 'Все бренды', pages: 'Страницы каталога бренда', back: 'Назад', next: 'Дальше', filtersApplied: 'Фильтры применены' }
  const brandPath = `/${locale}/brands/${brandId}`
  const view = catalogView(params.view)
  const hasActiveFilters = Object.entries(params).some(([key, value]) => key !== 'page' && key !== 'sort' && key !== 'view' && (Array.isArray(value) ? value.some(Boolean) : Boolean(value)))

  return (
    <main className="site-shell">
      <section className="brand-catalog-page" aria-labelledby="brand-catalog-title">
        <div className="product-breadcrumbs">
          <Link href={`/${locale}`}>{text.home}</Link>
          <span>/</span>
          <Link href={`/${locale}/brands`}>{text.brands}</Link>
          <span>/</span>
          <span>{result.brand.title}</span>
        </div>

        <div className="brand-catalog-heading">
          <div>
            <p className="eyebrow">{text.catalog}</p>
            <h1 className="max-[767px]:!text-[28px]" id="brand-catalog-title">{result.brand.title ?? (locale === 'ro' ? 'Brand' : 'Бренд')}</h1>
          </div>
        </div>

        <CatalogFilterForm action={brandPath} query={params} locale={locale} mode="brand" sort={sort} facets={result.facets} resultCount={result.total} countContext={{ kind: 'brand', brandId }} />

        {hasActiveFilters ? (
          <div className="catalog-active-filters">
            <span>{text.filtersApplied}</span>
            <Link href={brandPath}>{locale === 'ro' ? 'Resetează' : 'Сбросить'}</Link>
          </div>
        ) : null}

        {result.products.length ? (
          <CatalogProductGrid products={result.products} view={view} />
        ) : (
          <div className="brands-empty">
            <h2>{text.empty}</h2>
            <p>{text.emptyHint}</p>
            <Link className="button button-dark" href={`/${locale}/brands`}>{text.all}</Link>
          </div>
        )}

        {totalPages > 1 ? (
          <nav className="catalog-pagination" aria-label={text.pages}>
            {page > 1 ? <Link href={brandUrl(page - 1)}>{text.back}</Link> : <span aria-disabled="true">{text.back}</span>}
            <strong>{page} / {totalPages}</strong>
            {page < totalPages ? <Link href={brandUrl(page + 1)}>{text.next}</Link> : <span aria-disabled="true">{text.next}</span>}
          </nav>
        ) : null}
      </section>
    </main>
  )
}
