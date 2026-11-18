import { LocalizedLink as Link } from '@/components/site/localized-link'
import { connection } from 'next/server'

import { CatalogFilterForm } from '@/components/site/catalog-filter-form'
import { getPopularSearchQueries, getSearchPage } from '@/lib/catalog'
import { catalogPageNumber, catalogQueryString, catalogSort, parseCatalogFilters, type CatalogQuery } from '@/lib/catalog-query'
import { catalogView } from '@/lib/catalog-view'
import { normalizeSearchQuery } from '@/lib/search'
import type { StoreLocale } from '@/lib/locale-routing'

import { CatalogProductGrid } from './catalog-product-grid'
import { SearchLandingSuggestions } from './search-landing-suggestions'
import { SearchQueryForm } from './search-query-form'
import { SearchTelemetry } from './search-telemetry'

export async function SearchPage({
  query,
  page,
  params = {},
  locale = 'ru',
}: {
  query: string
  page: number
  params?: CatalogQuery
  locale?: StoreLocale
}) {
  await connection()
  const search = normalizeSearchQuery(query)
  const searchParams: CatalogQuery = { ...params, q: search }
  const filters = { ...parseCatalogFilters(searchParams, 24), page }
  const [result, popular] = await Promise.all([
    search ? getSearchPage(search, filters, locale) : Promise.resolve(null),
    search ? Promise.resolve([] as string[]) : getPopularSearchQueries(8),
  ])
  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1
  const searchUrl = (nextPage: number) => {
    const queryString = catalogQueryString(searchParams, nextPage)
    return `/${locale === 'ro' ? 'cautare' : 'search'}${queryString ? `?${queryString}` : ''}`
  }
  const text = locale === 'ro'
    ? { title: 'Căutare', intro: 'Găsește produse după denumire, cod sau brand.', input: 'Termen de căutare', placeholder: 'De exemplu, Clarins sau 24417', find: 'Caută', start: 'Ce căutăm?', startHint: 'Introdu un termen pentru a vedea produsele și brandurile potrivite.', results: 'Rezultatele căutării', products: 'produse', brands: 'Branduri', categories: 'Categorii', empty: 'Nu am găsit rezultate', emptyHint: 'Încearcă un alt termen sau verifică ortografia.', catalog: 'Deschide catalogul', pages: 'Pagini rezultate', back: 'Înapoi', next: 'Înainte' }
    : { title: 'Поиск', intro: 'Найдите товар по названию, артикулу или бренду.', input: 'Поисковый запрос', placeholder: 'Например, Clarins или 24417', find: 'Найти', start: 'Что будем искать?', startHint: 'Введите запрос, чтобы увидеть подходящие товары и бренды.', results: 'Результаты поиска', products: 'товаров', brands: 'Бренды', categories: 'Категории', empty: 'Ничего не нашли', emptyHint: 'Попробуйте изменить запрос или проверить написание.', catalog: 'Открыть каталог', pages: 'Страницы поиска', back: 'Назад', next: 'Дальше' }
  const searchPath = locale === 'ro' ? '/ro/cautare' : '/ru/search'
  const catalogPath = locale === 'ro' ? '/ro/catalog' : '/ru/katalog'
  const sort = catalogSort(searchParams)
  const view = catalogView(searchParams.view)

  return (
    <main className="site-shell">
      <section className="search-page" aria-labelledby="search-title">
        <div className="search-heading">
          <p className="eyebrow">VIZAJE-NICA</p>
          <h1 id="search-title">{text.title}</h1>
          <p>{text.intro}</p>
        </div>

        <SearchQueryForm locale={locale} query={search} labels={{ input: text.input, placeholder: text.placeholder, find: text.find }} />

        {!search ? (
          <div className="search-empty search-empty-start">
            <h2>{text.start}</h2>
            <p>{text.startHint}</p>
            <SearchLandingSuggestions locale={locale} popular={popular} />
          </div>
        ) : result ? (
          <>
            <SearchTelemetry query={search} />
            <div className="search-result-heading">
              <div>
                <p className="eyebrow">{text.results}</p>
                <h2>«{search}»</h2>
              </div>
            </div>

            {result.brands.length ? (
              <section className="search-brands" aria-labelledby="search-brands-title">
                <p className="eyebrow" id="search-brands-title">{text.brands}</p>
                <div className="search-brand-list">
                  {result.brands.map((brand) => (
                    <Link className="search-brand-link" href={`/${locale}/brands/${brand.id}`} key={brand.id}>{brand.title}</Link>
                  ))}
                </div>
              </section>
            ) : null}

            {result.categories.length ? (
              <section className="search-brands" aria-labelledby="search-categories-title">
                <p className="eyebrow" id="search-categories-title">{text.categories}</p>
                <div className="search-brand-list">
                  {result.categories.map((category) => (
                    <Link className="search-brand-link" href={category.uri ? `${catalogPath}/${encodeURIComponent(category.uri)}` : catalogPath} key={category.id}>{category.title}</Link>
                  ))}
                </div>
              </section>
            ) : null}

            {result.total > 0 ? (
              <CatalogFilterForm action={searchPath} query={searchParams} locale={locale} mode="search" sort={sort} facets={result.facets} resultCount={result.total} countContext={{ kind: 'search', query: search }} />
            ) : null}

            {result.products.length ? (
              <CatalogProductGrid products={result.products} view={view} />
            ) : (
              <div className="search-empty">
                <h2>{text.empty}</h2>
                <p>{text.emptyHint}</p>
                <Link className="button button-dark" href={catalogPath}>{text.catalog}</Link>
              </div>
            )}

            {totalPages > 1 ? (
              <nav className="catalog-pagination" aria-label={text.pages}>
                {page > 1 ? <Link href={searchUrl(page - 1)}>{text.back}</Link> : <span aria-disabled="true">{text.back}</span>}
                <strong>{page} / {totalPages}</strong>
                {page < totalPages ? <Link href={searchUrl(page + 1)}>{text.next}</Link> : <span aria-disabled="true">{text.next}</span>}
              </nav>
            ) : null}
          </>
        ) : null}
      </section>
    </main>
  )
}
