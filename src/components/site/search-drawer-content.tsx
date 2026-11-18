'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Clock3, Heart, Search, TrendingUp } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import type { CatalogProduct } from '@/lib/catalog'
import { formatPrice } from '@/lib/format'
import { legacyAsset } from '@/lib/legacy-assets'
import type { StoreLocale } from '@/lib/locale-routing'
import { addRecentSearch, clearRecentSearches, readRecentSearches } from '@/lib/search/recent-searches'
import type { SearchEntitySuggestion } from '@/lib/search/types'

type Suggestions = {
  products: CatalogProduct[]
  brands: SearchEntitySuggestion[]
  categories: SearchEntitySuggestion[]
  queries: string[]
}

type SearchResponse = { popular?: string[]; suggestions?: Suggestions }

type Props = {
  locale: StoreLocale
  inputRef?: (element: HTMLInputElement | null) => void
  onSubmit?: () => void
  compact?: boolean
}

const copy = {
  ru: {
    placeholder: 'Товар, бренд или артикул', input: 'Поисковый запрос', submit: 'Найти',
    recent: 'Недавние запросы', popular: 'Популярные запросы', clear: 'Очистить историю',
    products: 'Товары', brands: 'Бренды', categories: 'Категории', noResults: 'Совпадений пока нет',
    loading: 'Ищем…',
  },
  ro: {
    placeholder: 'Produs, brand sau cod', input: 'Caută un produs', submit: 'Caută',
    recent: 'Căutări recente', popular: 'Căutări populare', clear: 'Șterge istoricul',
    products: 'Produse', brands: 'Branduri', categories: 'Categorii', noResults: 'Nu am găsit potriviri',
    loading: 'Căutăm…',
  },
} as const

function searchPath(locale: StoreLocale) {
  return locale === 'ro' ? '/ro/cautare' : '/ru/search'
}

export function SearchDrawerContent({ locale, inputRef, onSubmit, compact = false }: Props) {
  const text = copy[locale]
  const [query, setQuery] = useState('')
  const [recent, setRecent] = useState<string[]>([])
  const [popular, setPopular] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const normalizedQuery = useMemo(() => query.trim().replace(/\s+/gu, ' '), [query])

  useEffect(() => {
    setRecent(readRecentSearches())
    const controller = new AbortController()
    fetch(`/api/search?locale=${locale}`, { signal: controller.signal })
      .then((response) => response.json() as Promise<SearchResponse>)
      .then((response) => setPopular(response.popular ?? []))
      .catch(() => setPopular([]))
    return () => controller.abort()
  }, [locale])

  useEffect(() => {
    if ([...normalizedQuery].length < 2) {
      setSuggestions(null)
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(() => {
      setIsLoading(true)
      fetch(`/api/search?locale=${locale}&q=${encodeURIComponent(normalizedQuery)}`, { signal: controller.signal })
        .then((response) => response.json() as Promise<SearchResponse>)
        .then((response) => setSuggestions(response.suggestions ?? null))
        .catch(() => { if (!controller.signal.aborted) setSuggestions(null) })
        .finally(() => { if (!controller.signal.aborted) setIsLoading(false) })
    }, 180)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [locale, normalizedQuery])

  const remember = (value: string) => setRecent(addRecentSearch(value))
  const navigateToSearch = (value: string) => {
    remember(value)
    onSubmit?.()
  }
  const submit = () => {
    remember(query)
    onSubmit?.()
  }
  const queryHref = (value: string) => `${searchPath(locale)}?q=${encodeURIComponent(value)}`
  const productPath = locale === 'ro' ? '/ro/catalog/product' : '/ru/katalog/product'
  const brandPath = locale === 'ro' ? '/ro/brands' : '/ru/brands'
  const categoryPath = locale === 'ro' ? '/ro/catalog' : '/ru/katalog'
  const hasSuggestions = Boolean(suggestions && (
    suggestions.products.length || suggestions.brands.length || suggestions.categories.length || suggestions.queries.length
  ))
  const chips = normalizedQuery.length < 2 ? popular : suggestions?.queries ?? []

  return (
    <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
      <form className={`mb-7 ${compact ? '' : 'sm:mb-8'}`} action={searchPath(locale)} method="get" onSubmit={submit}>
        <label className="relative block">
          <span className="sr-only">{text.input}</span>
          <Search className="pointer-events-none absolute top-1/2 left-5 size-5 -translate-y-1/2 text-[#111]" strokeWidth={1.5} aria-hidden="true" />
          <input
            ref={inputRef}
            className="h-[60px] w-full border-2 border-[#111] bg-white px-5 pl-12 text-[16px] text-[#111] outline-none placeholder:text-[#777] focus:border-[#111] sm:h-[68px] sm:text-[18px]"
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={text.placeholder}
            autoComplete="off"
          />
        </label>
        <button className="sr-only" type="submit">{text.submit}</button>
      </form>

      {normalizedQuery.length < 2 ? (
        <div className="grid gap-7 pt-1">
          {recent.length ? (
            <section aria-labelledby="recent-searches-title">
              <div className="mb-2 flex items-center justify-between">
                <h3 id="recent-searches-title" className="m-0 text-xs font-medium uppercase tracking-[.08em] text-graphite">{text.recent}</h3>
                <button className="text-xs text-graphite underline decoration-fog underline-offset-4 hover:text-hover-cream" type="button" onClick={() => { clearRecentSearches(); setRecent([]) }}>{text.clear}</button>
              </div>
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                {recent.map((item) => <li key={item}><Link className="inline-flex items-center gap-2 rounded-full border border-[#d2d2d2] px-4 py-2 text-[13px] text-midnight-ink transition-colors hover:border-[#111]" href={queryHref(item)} onClick={() => navigateToSearch(item)}><Clock3 className="size-3.5 text-graphite" aria-hidden="true" />{item}</Link></li>)}
              </ul>
            </section>
          ) : null}
          {chips.length ? (
            <section aria-labelledby="popular-searches-title">
              <h3 id="popular-searches-title" className="mb-4 flex items-center gap-2 text-[20px] leading-none font-medium tracking-[-.02em] text-[#111]"><TrendingUp className="size-5" aria-hidden="true" />{text.popular}</h3>
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                {chips.map((item) => <li key={item}><Link className="inline-flex rounded-full border border-[#d2d2d2] px-4 py-2.5 text-[13px] text-midnight-ink transition-colors hover:border-[#111]" href={queryHref(item)} onClick={() => navigateToSearch(item)}>{item}</Link></li>)}
              </ul>
            </section>
          ) : null}
        </div>
      ) : (
        <div id="search-suggestions" className="grid gap-7 pt-1" role="region" aria-label={locale === 'ro' ? 'Sugestii de căutare' : 'Подсказки поиска'}>
          {isLoading ? <p className="m-0 py-3 text-sm text-graphite" role="status">{text.loading}</p> : null}
          {hasSuggestions ? (
            <>
              {suggestions?.products.length ? <section aria-labelledby="search-product-suggestions">
                <h3 id="search-product-suggestions" className="mb-4 text-[20px] leading-none font-medium tracking-[-.02em] text-[#111]">{text.products}</h3>
                <ul className="m-0 grid list-none grid-cols-2 gap-x-1.5 gap-y-7 p-0 min-[992px]:grid-cols-3">
                  {suggestions.products.map((product) => {
                    const image = legacyAsset(product.image)
                    return <li key={product.id}>
                      <Link className="group block text-midnight-ink" href={`${productPath}/${product.id}`} onClick={() => navigateToSearch(normalizedQuery)}>
                        <div className="relative aspect-square overflow-hidden bg-[#f2f2f2]">
                          {image ? <Image src={image} alt="" fill sizes="(min-width: 992px) 15vw, 45vw" unoptimized className="object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-[1.03]" /> : <Search className="absolute top-1/2 left-1/2 size-5 -translate-x-1/2 -translate-y-1/2 text-graphite" aria-hidden="true" />}
                          <Heart className="absolute top-3 right-3 size-5" strokeWidth={1.5} aria-hidden="true" />
                        </div>
                        {product.variants?.length ? <div className="mt-2 flex items-center gap-1 overflow-hidden">
                          {product.variants.slice(0, 4).map((variant) => <span className="size-4 shrink-0 rounded-full border border-black/10 bg-[#e5e5e5]" key={variant.id} style={variant.colorHex ? { backgroundColor: variant.colorHex } : undefined} />)}
                        </div> : null}
                        <p className="mt-3 mb-1 text-[10px] font-medium uppercase tracking-[.14em] text-[#a36c23]">{product.discountPrice ? 'Sale' : product.variants?.length ? 'New color' : ''}</p>
                        <h4 className="m-0 line-clamp-2 text-[13px] leading-[1.25] font-medium">{product.title}</h4>
                        {product.brand ? <p className="m-0 mt-1 line-clamp-2 text-[12px] leading-[1.35] text-[#555]">{product.brand}</p> : null}
                        {product.price ? <p className="m-0 mt-1 text-[12px]">{formatPrice(product.discountPrice || product.price)}</p> : null}
                      </Link>
                    </li>
                  })}
                </ul>
              </section> : null}
              {suggestions?.queries.length ? (
                <section aria-labelledby="search-query-suggestions">
                  <h3 id="search-query-suggestions" className="mb-4 text-[20px] leading-none font-medium tracking-[-.02em] text-[#111]">{text.popular}</h3>
                  <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                    {suggestions.queries.map((item) => <li key={item}><Link className="inline-flex rounded-full border border-[#d2d2d2] px-4 py-2.5 text-[13px] text-midnight-ink transition-colors hover:border-[#111]" href={queryHref(item)} onClick={() => navigateToSearch(item)}>{item}</Link></li>)}
                  </ul>
                </section>
              ) : null}
              {suggestions?.brands.length ? (
                <section aria-labelledby="search-brand-suggestions">
                  <h3 id="search-brand-suggestions" className="mb-4 text-[20px] leading-none font-medium tracking-[-.02em] text-[#111]">{text.brands}</h3>
                  <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                    {suggestions.brands.map((brand) => <li key={brand.id}><Link className="inline-flex rounded-full border border-[#d2d2d2] px-4 py-2.5 text-[13px] text-midnight-ink transition-colors hover:border-[#111]" href={`${brandPath}/${brand.id}`} onClick={() => navigateToSearch(normalizedQuery)}>{brand.title}</Link></li>)}
                  </ul>
                </section>
              ) : null}
              {suggestions?.categories.length ? (
                <section aria-labelledby="search-category-suggestions">
                  <h3 id="search-category-suggestions" className="mb-4 text-[20px] leading-none font-medium tracking-[-.02em] text-[#111]">{text.categories}</h3>
                  <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                    {suggestions.categories.map((category) => <li key={category.id}><Link className="inline-flex rounded-full border border-[#d2d2d2] px-4 py-2.5 text-[13px] text-midnight-ink transition-colors hover:border-[#111]" href={category.uri ? `${categoryPath}/${encodeURIComponent(category.uri)}` : categoryPath} onClick={() => navigateToSearch(normalizedQuery)}>{category.title}</Link></li>)}
                  </ul>
                </section>
              ) : null}
            </>
          ) : !isLoading ? <p className="m-0 py-3 text-sm text-graphite">{text.noResults}</p> : null}
          <Link className="border-t border-midnight-ink/10 py-3 text-sm underline decoration-hover-cream underline-offset-4 hover:text-hover-cream" href={queryHref(normalizedQuery)} onClick={() => navigateToSearch(normalizedQuery)}>
            {locale === 'ro' ? `Vezi toate rezultatele pentru „${normalizedQuery}”` : `Все результаты по запросу «${normalizedQuery}»`}
          </Link>
        </div>
      )}
    </div>
  )
}
