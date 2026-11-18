import { LocalizedLink as Link } from '@/components/site/localized-link'
import { connection } from 'next/server'
import { notFound } from 'next/navigation'

import { getCategoryPage } from '@/lib/catalog'
import { catalogPageNumber, catalogQueryString, catalogSort, parseCatalogFilters, type CatalogQuery } from '@/lib/catalog-query'
import { catalogView } from '@/lib/catalog-view'
import type { StoreLocale } from '@/lib/locale-routing'
import { breadcrumbJsonLd } from '@/lib/structured-data'

import { CatalogFilterForm } from './catalog-filter-form'
import { CatalogProductGrid } from './catalog-product-grid'
import { CatalogQuickCategories } from './catalog-quick-categories'
import { JsonLd } from './json-ld'

function buildCategoryUrl(uri: string, locale: StoreLocale, params: CatalogQuery, page: number) {
  const query = catalogQueryString(params, page)
  const prefix = locale === 'ro' ? '/ro/catalog' : '/ru/katalog'
  return `${prefix}/${encodeURIComponent(uri)}${query ? `?${query}` : ''}`
}

export async function CategoryCatalogPage({ uri, searchParams, locale = 'ru' }: { uri: string; searchParams: Promise<CatalogQuery>; locale?: StoreLocale }) {
  await connection()
  const params = { ...await searchParams }
  delete params.q
  const page = catalogPageNumber(params)
  const sort = catalogSort(params)
  const filters = parseCatalogFilters(params, 16)
  delete filters.categoryIds
  const result = await getCategoryPage(uri, filters, locale)

  if (!result) notFound()

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize))
  if (page > totalPages) notFound()
  const categoryTitle = result.category.h1 ?? result.category.title ?? (locale === 'ro' ? 'Catalog' : 'Каталог')
  const categoryUri = result.category.uri ?? uri
  const text = locale === 'ro'
    ? { home: 'Acasă', catalog: 'Catalog', subcategories: 'Subcategorii', reset: 'Resetează', empty: 'Nu am găsit produse în această categorie', emptyHint: 'Modifică filtrele sau alege o subcategorie.', show: 'Vezi toate produsele', pages: 'Pagini categorie', back: 'Înapoi', next: 'Înainte', filtersApplied: 'Filtre aplicate' }
    : { home: 'Главная', catalog: 'Каталог', subcategories: 'Подкатегории', reset: 'Сбросить', empty: 'В этой категории ничего не найдено', emptyHint: 'Измените фильтры или выберите подкатегорию.', show: 'Показать все товары', pages: 'Страницы категории', back: 'Назад', next: 'Дальше', filtersApplied: 'Фильтры применены' }
  const categoryPath = `${locale === 'ro' ? '/ro/catalog' : '/ru/katalog'}/${encodeURIComponent(categoryUri)}`
  const hasActiveFilters = Object.entries(params).some(([key, value]) => key !== 'page' && key !== 'sort' && key !== 'view' && (Array.isArray(value) ? value.some(Boolean) : Boolean(value)))
  const view = catalogView(params.view)
  const catalogPrefix = locale === 'ro' ? '/ro/catalog' : '/ru/katalog'
  const breadcrumbItems = [
    { name: text.home, path: `/${locale}` },
    { name: text.catalog, path: catalogPrefix },
    ...result.breadcrumbs.map((breadcrumb) => ({
      name: (breadcrumb.breadcrumbTitle ?? breadcrumb.title) ?? '',
      path: `${catalogPrefix}/${encodeURIComponent(breadcrumb.uri ?? '')}`,
    })),
  ]

  return (
    <main className="site-shell">
      <JsonLd data={breadcrumbJsonLd(breadcrumbItems)} />
      <section className="mx-auto w-full max-w-[1600px] pb-24 pt-7 sm:pt-10" aria-labelledby="category-catalog-title">
        <nav className="mb-9 flex min-w-0 items-center gap-2 overflow-x-auto whitespace-nowrap text-[12px] leading-5 text-[#707070] sm:mb-12 sm:text-[13px]" aria-label={locale === 'ro' ? 'Fir de navigare' : 'Хлебные крошки'}>
          <Link href={locale === 'ro' ? '/ro' : '/ru'}>{text.home}</Link>
          <span aria-hidden="true">/</span>
          <Link href={locale === 'ro' ? '/ro/catalog' : '/ru/katalog'}>{text.catalog}</Link>
          {result.breadcrumbs.map((breadcrumb) => (
            <span key={breadcrumb.id} className="inline-flex shrink-0 items-center gap-2">
              <span aria-hidden="true">/</span>
              {breadcrumb.id === result.category.id ? (breadcrumb.breadcrumbTitle ?? breadcrumb.title) : (
                <Link href={`${locale === 'ro' ? '/ro/catalog' : '/ru/katalog'}/${encodeURIComponent(breadcrumb.uri ?? '')}`}>{breadcrumb.breadcrumbTitle ?? breadcrumb.title}</Link>
              )}
            </span>
          ))}
        </nav>

        <div className="mb-7 sm:mb-9">
          <div className="min-w-0">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-[#707070]">{text.catalog}</p>
            <h1 id="category-catalog-title" className="m-0 max-w-none text-[28px] font-normal leading-[1.12] tracking-[-0.035em] text-[#141414] max-[767px]:!text-[28px] sm:text-[40px]">{categoryTitle}</h1>
          </div>
        </div>

        <CatalogQuickCategories
          categories={result.children}
          locale={locale}
          label={text.subcategories}
          hrefForCategory={(child) => child.uri ? `${locale === 'ro' ? '/ro/catalog' : '/ru/katalog'}/${encodeURIComponent(child.uri)}` : categoryPath}
        />

        <CatalogFilterForm action={categoryPath} query={params} locale={locale} mode="category" sort={sort} facets={result.facets} resultCount={result.total} countContext={{ kind: 'category', uri: categoryUri }} />

        {hasActiveFilters ? (
          <div className="mb-5 flex items-center gap-3 text-[12px] text-[#707070]">
            <span>{text.filtersApplied}</span>
            <Link className="underline decoration-[#cdbbb0] underline-offset-4 transition-colors hover:text-[#ab8a73]" href={categoryPath}>{text.reset}</Link>
          </div>
        ) : null}

        {result.products.length ? (
          <CatalogProductGrid products={result.products} view={view} />
        ) : (
          <div className="border-t border-[#ededed] py-14 sm:py-20">
            <h2 className="mb-2 text-[22px] font-normal tracking-[-0.02em] sm:text-[26px]">{text.empty}</h2>
            <p className="mb-6 max-w-lg text-[14px] leading-6 text-[#707070]">{text.emptyHint}</p>
            <Link className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#141414] px-5 text-[12px] font-medium text-white transition-colors hover:bg-[#cdbbb0] hover:text-[#141414]" href={categoryPath}>{text.show}</Link>
          </div>
        )}

        {totalPages > 1 ? (
          <nav className="mt-12 flex items-center justify-center gap-6 text-[13px]" aria-label={text.pages}>
            {page > 1 ? <Link className="border-b border-[#cdbbb0] pb-1 hover:text-[#ab8a73]" href={buildCategoryUrl(categoryUri, locale, params, page - 1)}>{text.back}</Link> : <span className="pb-1 text-[#adadad]" aria-disabled="true">{text.back}</span>}
            <strong className="font-normal">{page} / {totalPages}</strong>
            {page < totalPages ? <Link className="border-b border-[#cdbbb0] pb-1 hover:text-[#ab8a73]" href={buildCategoryUrl(categoryUri, locale, params, page + 1)}>{text.next}</Link> : <span className="pb-1 text-[#adadad]" aria-disabled="true">{text.next}</span>}
          </nav>
        ) : null}

        {result.category.seoText?.trim() ? (
          <section className="mt-16 border-t border-[#ededed] pt-7 text-[14px] leading-[1.7] text-[#707070] [&_a]:underline [&_a]:decoration-[#cdbbb0] [&_a]:underline-offset-4 [&_h2]:mb-3 [&_h2]:mt-7 [&_h2]:text-[22px] [&_h2]:font-medium [&_h2]:leading-tight [&_h2]:text-[#141414] [&_h3]:mb-3 [&_h3]:mt-7 [&_h3]:text-[18px] [&_h3]:font-medium [&_h3]:text-[#141414] [&_p]:mb-4" aria-label={categoryTitle} dangerouslySetInnerHTML={{ __html: result.category.seoText }} />
        ) : null}
      </section>
    </main>
  )
}
