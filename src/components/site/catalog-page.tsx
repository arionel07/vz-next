import { LocalizedLink as Link } from '@/components/site/localized-link'
import { connection } from 'next/server'
import { notFound } from 'next/navigation'

import { getCatalogPage } from '@/lib/catalog'
import { catalogPageNumber, catalogQueryString, catalogSort, parseCatalogFilters, type CatalogQuery } from '@/lib/catalog-query'
import { catalogView } from '@/lib/catalog-view'
import type { StoreLocale } from '@/lib/locale-routing'

import { CatalogFilterForm } from './catalog-filter-form'
import { CatalogProductGrid } from './catalog-product-grid'
import { CatalogQuickCategories } from './catalog-quick-categories'

function catalogPageUrl(params: CatalogQuery, locale: StoreLocale, page: number) {
  const base = locale === 'ro' ? '/ro/catalog' : '/ru/katalog'
  const query = catalogQueryString(params, page)
  return query ? `${base}?${query}` : base
}

export async function CatalogPage({ searchParams, locale = 'ru' }: { searchParams: Promise<CatalogQuery>; locale?: StoreLocale }) {
  await connection()
  const params = await searchParams
  const page = catalogPageNumber(params)
  const parsedFilters = parseCatalogFilters(params, 32)
  const sort = catalogSort(params)
  const catalog = await getCatalogPage({ ...parsedFilters, page, pageSize: 32 }, locale)
  const totalPages = Math.max(1, Math.ceil(catalog.total / catalog.pageSize))
  if (page > totalPages) notFound()
  const text = locale === 'ro'
    ? { title: 'Catalog', products: 'produse', filters: 'Filtre aplicate', reset: 'Resetează', empty: 'Nu am găsit produse', emptyHint: 'Modifică termenul de căutare sau alege altă categorie.', show: 'Vezi întregul catalog', pages: 'Pagini catalog', back: 'Înapoi', next: 'Înainte' }
    : { title: 'Каталог', products: 'товаров', filters: 'Фильтры применены', reset: 'Сбросить', empty: 'Ничего не найдено', emptyHint: 'Попробуйте изменить запрос или выбрать другую категорию.', show: 'Показать весь каталог', pages: 'Страницы каталога', back: 'Назад', next: 'Дальше' }
  const catalogPath = locale === 'ro' ? '/ro/catalog' : '/ru/katalog'
  const view = catalogView(params.view)
  const selectedQuickCategoryIds = new Set(parsedFilters.categoryIds ?? [])
  const quickCategories = [
    ...catalog.categories,
  ]
  const quickCategoryUrl = (categoryId: number) => {
    const nextParams = { ...params }
    delete nextParams.page
    if (categoryId === -1) {
      delete nextParams.discounted
      delete nextParams.category
      delete nextParams['category[]']
      if (!parsedFilters.discounted) nextParams.discounted = '1'
    } else {
      delete nextParams.category
      delete nextParams['category[]']
      if (!selectedQuickCategoryIds.has(categoryId)) nextParams['category[]'] = String(categoryId)
    }
    const query = catalogQueryString(nextParams, 1)
    return query ? `${catalogPath}?${query}` : catalogPath
  }
  const hasActiveFilters = Boolean(
    parsedFilters.categoryIds?.length || parsedFilters.brandIds?.length
      || parsedFilters.sex?.length || parsedFilters.priceMin !== undefined || parsedFilters.priceMax !== undefined
      || parsedFilters.inStock || parsedFilters.discounted
      || Object.keys(parsedFilters.features ?? {}).length,
  )

  return (
    <main className="min-h-[calc(100vh-136px)] px-5 md:px-[42px] min-[1024px]:px-[max(2rem,3.33vw)]">
      <section className="mx-auto w-full max-w-[1600px] pb-24 pt-7 sm:pt-10 min-[1024px]:max-w-none" aria-labelledby="catalog-page-title">
        <div className="mb-7 flex items-end justify-between gap-5 sm:mb-9">
          <div>
            <h1 id="catalog-page-title" className="m-0 text-[34px] font-medium leading-[1.1] tracking-[-0.035em] text-[#141414] max-[767px]:!text-[28px] sm:text-[46px]">{text.title}</h1>
            <nav className="mt-4 flex items-center gap-2 text-[12px] leading-5 text-[#707070] sm:text-[13px]" aria-label={locale === 'ro' ? 'Fir de navigare' : 'Хлебные крошки'}>
              <Link href={`/${locale}`}>{locale === 'ro' ? 'Acasă' : 'Главная'}</Link>
              <span aria-hidden="true">/</span>
              <span className="text-[#141414]">{text.title}</span>
            </nav>
          </div>
        </div>

        <CatalogQuickCategories
          categories={quickCategories}
          locale={locale}
          selectedIds={selectedQuickCategoryIds}
          hrefForCategory={(category) => quickCategoryUrl(category.id)}
          label={locale === 'ro' ? 'Categorii rapide' : 'Быстрые категории'}
        />

        <CatalogFilterForm action={catalogPath} query={params} locale={locale} mode="catalog" sort={sort} facets={catalog.facets} resultCount={catalog.total} countContext={{ kind: 'catalog' }} />

        {parsedFilters.search && !hasActiveFilters ? (
          <div className="mb-5 flex items-center gap-3 text-[12px] text-[#707070]">
            <span>{text.filters}</span>
            <Link className="underline decoration-[#cdbbb0] underline-offset-4 transition-colors hover:text-[#ab8a73]" href={catalogPath}>{text.reset}</Link>
          </div>
        ) : null}

        {catalog.products.length ? (
          <CatalogProductGrid products={catalog.products} view={view} />
        ) : (
          <div className="border-t border-[#ededed] py-14 sm:py-20">
            <h2 className="mb-2 text-[22px] font-normal tracking-[-0.02em] sm:text-[26px]">{text.empty}</h2>
            <p className="mb-6 max-w-lg text-[14px] leading-6 text-[#707070]">{text.emptyHint}</p>
            <Link className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#141414] px-5 text-[12px] font-medium text-white transition-colors hover:bg-[#cdbbb0] hover:text-[#141414]" href={catalogPath}>{text.show}</Link>
          </div>
        )}

        {totalPages > 1 ? (
          <nav className="mt-12 flex items-center justify-center gap-6 text-[13px]" aria-label={text.pages}>
            {page > 1 ? (
              <Link className="border-b border-[#cdbbb0] pb-1 hover:text-[#ab8a73]" href={catalogPageUrl(params, locale, page - 1)}>{text.back}</Link>
            ) : (
              <span className="pb-1 text-[#adadad]" aria-disabled="true">{text.back}</span>
            )}
            <strong className="font-normal">{page} / {totalPages}</strong>
            {page < totalPages ? (
              <Link className="border-b border-[#cdbbb0] pb-1 hover:text-[#ab8a73]" href={catalogPageUrl(params, locale, page + 1)}>{text.next}</Link>
            ) : (
              <span className="pb-1 text-[#adadad]" aria-disabled="true">{text.next}</span>
            )}
          </nav>
        ) : null}
      </section>
    </main>
  )
}
