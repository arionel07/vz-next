'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import type { CatalogProduct } from '@/lib/catalog'
import { formatPrice } from '@/lib/format'
import type { StoreLocale } from '@/lib/locale-routing'
import { addRecentSearch } from '@/lib/search/recent-searches'
import type { SearchEntitySuggestion } from '@/lib/search/types'

type Suggestions = {
  products: CatalogProduct[]
  brands: SearchEntitySuggestion[]
  categories: SearchEntitySuggestion[]
  queries: string[]
}

type Props = {
  locale: StoreLocale
  query: string
  labels: { input: string; placeholder: string; find: string }
}

export function SearchQueryForm({ locale, query: initialQuery, labels }: Props) {
  const [query, setQuery] = useState(initialQuery)
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const action = locale === 'ro' ? '/ro/cautare' : '/ru/search'
  const productRoot = locale === 'ro' ? '/ro/catalog/product' : '/ru/katalog/product'
  const brandRoot = `/${locale}/brands`
  const categoryRoot = locale === 'ro' ? '/ro/catalog' : '/ru/katalog'
  const normalized = query.trim().replace(/\s+/gu, ' ')

  useEffect(() => {
    if ([...normalized].length < 2 || !isOpen) {
      setSuggestions(null)
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(() => {
      setIsLoading(true)
      fetch(`/api/search?locale=${locale}&q=${encodeURIComponent(normalized)}`, { signal: controller.signal })
        .then((response) => response.json() as Promise<{ suggestions?: Suggestions }>)
        .then((response) => setSuggestions(response.suggestions ?? null))
        .catch(() => { if (!controller.signal.aborted) setSuggestions(null) })
        .finally(() => { if (!controller.signal.aborted) setIsLoading(false) })
    }, 180)
    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [isOpen, locale, normalized])

  const remember = (value: string) => addRecentSearch(value)
  const queryHref = (value: string) => `${action}?q=${encodeURIComponent(value)}`
  const hasSuggestions = Boolean(suggestions && (
    suggestions.products.length || suggestions.brands.length || suggestions.categories.length || suggestions.queries.length
  ))

  return (
    <div className="relative mt-7 mb-[70px] max-w-[760px]">
      <form className="flex gap-2" action={action} method="get" onSubmit={() => remember(query)}>
        <label className="flex min-w-0 flex-1">
          <span className="sr-only">{labels.input}</span>
          <input
            name="q"
            value={query}
            placeholder={labels.placeholder}
            autoFocus={!initialQuery}
            className="h-12 w-full rounded-lg border border-fog bg-white px-3 text-sm text-midnight-ink outline-none focus:border-hover-cream"
            autoComplete="off"
            onFocus={() => setIsOpen(true)}
            onChange={(event) => { setQuery(event.target.value); setIsOpen(true) }}
            onKeyDown={(event) => { if (event.key === 'Escape') setIsOpen(false) }}
          />
        </label>
        <button className="h-12 min-w-[120px] bg-midnight-ink px-5 text-sm text-white transition-colors hover:bg-button-hover hover:text-midnight-ink" type="submit">{labels.find}</button>
      </form>

      {isOpen && normalized.length >= 2 ? (
        <div id="search-page-suggestions" className="absolute top-[calc(100%+8px)] right-0 left-0 z-30 max-h-[min(60vh,480px)] overflow-y-auto border border-fog bg-white p-4 shadow-lg" role="region" aria-label={locale === 'ro' ? 'Sugestii de căutare' : 'Подсказки поиска'}>
          {isLoading ? <p className="m-0 py-2 text-sm text-graphite" role="status">{locale === 'ro' ? 'Căutăm…' : 'Ищем…'}</p> : null}
          {hasSuggestions ? (
            <div className="grid gap-4">
              {suggestions?.products.length ? (
                <section>
                  <h2 className="mb-2 text-xs font-medium uppercase tracking-[.08em] text-graphite">{locale === 'ro' ? 'Produse' : 'Товары'}</h2>
                  <ul className="m-0 grid list-none gap-1 p-0">
                    {suggestions.products.slice(0, 6).map((product) => <li key={product.id}><Link className="flex justify-between gap-4 py-1.5 text-sm text-midnight-ink hover:text-hover-cream" href={`${productRoot}/${product.id}`} onClick={() => remember(normalized)}><span className="min-w-0"><span className="block truncate">{product.title}</span><span className="block text-xs text-graphite">{product.brand}</span></span><span className="shrink-0">{formatPrice(product.discountPrice || product.price)}</span></Link></li>)}
                  </ul>
                </section>
              ) : null}
              {suggestions?.queries.length ? (
                <section>
                  <h2 className="mb-2 text-xs font-medium uppercase tracking-[.08em] text-graphite">{locale === 'ro' ? 'Căutări populare' : 'Популярные запросы'}</h2>
                  {suggestions.queries.map((item) => <Link className="mr-3 inline-block py-1 text-sm text-midnight-ink hover:text-hover-cream" href={queryHref(item)} key={item} onClick={() => remember(item)}>{item}</Link>)}
                </section>
              ) : null}
              {suggestions?.brands.length ? (
                <section>
                  <h2 className="mb-2 text-xs font-medium uppercase tracking-[.08em] text-graphite">{locale === 'ro' ? 'Branduri' : 'Бренды'}</h2>
                  {suggestions.brands.map((brand) => <Link className="mr-3 inline-block py-1 text-sm text-midnight-ink hover:text-hover-cream" href={`${brandRoot}/${brand.id}`} key={brand.id}>{brand.title}</Link>)}
                </section>
              ) : null}
              {suggestions?.categories.length ? (
                <section>
                  <h2 className="mb-2 text-xs font-medium uppercase tracking-[.08em] text-graphite">{locale === 'ro' ? 'Categorii' : 'Категории'}</h2>
                  {suggestions.categories.map((category) => <Link className="mr-3 inline-block py-1 text-sm text-midnight-ink hover:text-hover-cream" href={category.uri ? `${categoryRoot}/${encodeURIComponent(category.uri)}` : categoryRoot} key={category.id}>{category.title}</Link>)}
                </section>
              ) : null}
            </div>
          ) : !isLoading ? <p className="m-0 py-2 text-sm text-graphite">{locale === 'ro' ? 'Nu am găsit potriviri' : 'Совпадений пока нет'}</p> : null}
          <Link className="mt-3 block border-t border-fog pt-3 text-sm underline decoration-hover-cream underline-offset-4 hover:text-hover-cream" href={queryHref(normalized)} onClick={() => remember(normalized)}>
            {locale === 'ro' ? `Vezi toate rezultatele pentru „${normalized}”` : `Все результаты по запросу «${normalized}»`}
          </Link>
        </div>
      ) : null}
    </div>
  )
}
