import { LocalizedLink as Link } from '@/components/site/localized-link'
import { connection } from 'next/server'
import { notFound } from 'next/navigation'

import {
  getCatalogCollectionPage,
  type CatalogCollection,
} from '@/lib/catalog'
import { catalogPageNumber, catalogQueryString, catalogSort, parseCatalogFilters, type CatalogQuery } from '@/lib/catalog-query'
import { catalogView } from '@/lib/catalog-view'
import type { StoreLocale } from '@/lib/locale-routing'

import { CatalogFilterForm } from './catalog-filter-form'
import { CatalogProductGrid } from './catalog-product-grid'
import { CatalogQuickCategories } from './catalog-quick-categories'

type CollectionSearchParams = Promise<CatalogQuery>

function collectionDetails(collection: CatalogCollection, locale: StoreLocale) {
  const paths = locale === 'ro'
    ? { new: '/ro/nou', hits: '/ro/top-vanzari', sale: '/ro/reduceri' }
    : { new: '/ru/novinki', hits: '/ru/top-prodaz', sale: '/ru/skidki' }
  const titles = locale === 'ro'
    ? { new: 'Noutăți', hits: 'Cele mai vândute', sale: 'Reduceri' }
    : { new: 'Новинки', hits: 'Хиты продаж', sale: 'Распродажа' }
  return { title: titles[collection], path: paths[collection] }
}

export async function CollectionCatalogPage({
  collection,
  searchParams,
  locale = 'ru',
}: {
  collection: CatalogCollection
  searchParams: CollectionSearchParams
  locale?: StoreLocale
}) {
  await connection()
  const params = { ...await searchParams }
  delete params.q
  const page = catalogPageNumber(params)
  const sort = catalogSort(params)
  const parsedFilters = parseCatalogFilters(params, collection === 'sale' ? 16 : 32)
  const filters = collection === 'sale'
    ? parsedFilters
    : { page, pageSize: 32 }
  const details = collectionDetails(collection, locale)
  const result = await getCatalogCollectionPage(collection, filters, locale)
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize))
  const view = catalogView(params.view)
  const hasActiveFilters = Object.entries(params).some(([key, value]) => key !== 'page' && key !== 'sort' && key !== 'view' && (Array.isArray(value) ? value.some(Boolean) : Boolean(value)))
  if (page > totalPages) notFound()
  const text = locale === 'ro'
    ? { home: 'Acasă', catalog: 'Catalog', products: 'produse', empty: 'Nu există produse momentan', emptyHint: 'Revino puțin mai târziu.', show: 'Vezi toate produsele', pages: `Pagini pentru ${details.title}`, back: 'Înapoi', next: 'Înainte', filtersApplied: 'Filtre aplicate', reset: 'Resetează' }
    : { home: 'Главная', catalog: 'Каталог', products: 'товаров', empty: 'Товаров пока нет', emptyHint: 'Загляните сюда немного позже.', show: 'Показать все товары', pages: `Страницы раздела «${details.title}»`, back: 'Назад', next: 'Дальше', filtersApplied: 'Фильтры применены', reset: 'Сбросить' }

  const collectionUrl = (nextPage: number) => {
    const queryParams = collection === 'sale' ? { ...params } : {}
    const query = catalogQueryString(queryParams, nextPage)
    return query ? `${details.path}?${query}` : details.path
  }
  const selectedQuickCategoryIds = new Set(parseCatalogFilters(params, 16).categoryIds ?? [])
  const quickCategoryUrl = (categoryId: number) => {
    const nextParams = { ...params }
    delete nextParams.page
    delete nextParams.category
    delete nextParams['category[]']
    if (!selectedQuickCategoryIds.has(categoryId)) nextParams['category[]'] = String(categoryId)
    const query = catalogQueryString(nextParams, 1)
    return query ? `${details.path}?${query}` : details.path
  }

  return (
    <main className="site-shell">
      <section className="catalog-page" aria-labelledby="collection-title">
        <nav className="product-breadcrumbs" aria-label={locale === 'ro' ? 'Fir de navigare' : 'Хлебные крошки'}>
          <Link href={`/${locale}`}>{text.home}</Link>
          <span>/</span>
          <Link href={locale === 'ro' ? '/ro/catalog' : '/ru/katalog'}>{text.catalog}</Link>
          <span>/</span>
          <span>{details.title}</span>
        </nav>

        <div className="catalog-page-heading">
          <div>
            <p className="eyebrow">{text.catalog}</p>
            <h1 className="max-[767px]:!text-[28px]" id="collection-title">{details.title}</h1>
          </div>
          {collection !== 'sale' ? <p className="catalog-result-count">{result.total} {text.products}</p> : null}
        </div>

        {collection === 'sale' ? (
          <CatalogQuickCategories
            categories={result.quickCategories}
            locale={locale}
            selectedIds={selectedQuickCategoryIds}
            hrefForCategory={(category) => quickCategoryUrl(category.id)}
          />
        ) : null}

        {collection === 'sale' && result.facets ? (
          <CatalogFilterForm action={details.path} query={params} locale={locale} mode="sale" sort={sort} facets={result.facets} resultCount={result.total} countContext={{ kind: 'sale' }} />
        ) : null}

        {collection === 'sale' && hasActiveFilters ? (
          <div className="catalog-active-filters">
            <span>{text.filtersApplied}</span>
            <Link href={details.path}>{text.reset}</Link>
          </div>
        ) : null}

        {result.products.length ? (
          <CatalogProductGrid products={result.products} view={view} />
        ) : (
          <div className="catalog-empty">
            <h2>{text.empty}</h2>
            <p>{text.emptyHint}</p>
            {collection === 'sale' ? <Link className="button button-dark" href={details.path}>{text.show}</Link> : null}
          </div>
        )}

        {totalPages > 1 ? (
          <nav className="catalog-pagination" aria-label={text.pages}>
            {page > 1 ? <Link href={collectionUrl(page - 1)}>{text.back}</Link> : <span aria-disabled="true">{text.back}</span>}
            <strong>{page} / {totalPages}</strong>
            {page < totalPages ? <Link href={collectionUrl(page + 1)}>{text.next}</Link> : <span aria-disabled="true">{text.next}</span>}
          </nav>
        ) : null}
      </section>
    </main>
  )
}
