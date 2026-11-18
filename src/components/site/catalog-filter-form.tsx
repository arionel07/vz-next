'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown, Percent, X } from 'lucide-react'
import { AnimatePresence, motion, type PanInfo, useReducedMotion } from 'motion/react'

import type {
  CatalogFeatureFacet,
  CatalogFacetOption,
  CatalogProductSort,
} from '@/lib/catalog'
import type { CatalogQuery } from '@/lib/catalog-query'
import type { CatalogCountContext } from '@/lib/catalog-count'
import { catalogView } from '@/lib/catalog-view'
import type { StoreLocale } from '@/lib/locale-routing'

type FilterMode = 'catalog' | 'category' | 'brand' | 'sale' | 'search'
type FilterFacets = {
  brands: CatalogFacetOption[]
  categories?: Array<CatalogFacetOption & { parentId?: number; order?: number }>
  sexes: string[]
  priceMin: number
  priceMax: number
  features?: CatalogFeatureFacet[]
}

type Props = {
  action: string
  query: CatalogQuery
  locale: StoreLocale
  mode: FilterMode
  sort: CatalogProductSort
  facets: FilterFacets
  resultCount?: number
  countContext?: CatalogCountContext
}

const SORT_VALUES: Record<CatalogProductSort, string> = {
  default: '',
  popular: '1',
  'price-asc': '2',
  'price-desc': '3',
  discount: '4',
  new: 'new',
}

function valuesFor(query: CatalogQuery, key: string) {
  const value = query[key]
  return Array.isArray(value) ? value : value === undefined ? [] : [value]
}

function featureTitle(feature: CatalogFeatureFacet) {
  return feature.title?.trim() || ''
}

function toMoney(value: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value)
}

function productCountLabel(count: number, locale: StoreLocale) {
  if (locale === 'ro') return 'produse'
  const lastTwo = count % 100
  if (lastTwo >= 11 && lastTwo <= 14) return 'товаров'
  switch (count % 10) {
    case 1: return 'товар'
    case 2:
    case 3:
    case 4: return 'товара'
    default: return 'товаров'
  }
}

const FILTER_QUERY_KEY = /^(brand(?:\[\])?|category(?:\[\])?|sex(?:\[\])?|feature\[\d+\](?:\[\])?|price_min|price_max|in_stock|discounted)$/
const PRICE_SHEET_DISMISS_OFFSET = 120
const PRICE_SHEET_DISMISS_VELOCITY = 600

function queryHref(action: string, query: CatalogQuery, updates: Record<string, string | null> = {}, resetFilters = false) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (key === 'page' || (resetFilters && FILTER_QUERY_KEY.test(key)) || Object.hasOwn(updates, key) || value === undefined) continue
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== '') params.append(key, item)
    }
  }
  for (const [key, value] of Object.entries(updates)) {
    if (value !== null && value !== '') params.set(key, value)
  }
  const search = params.toString()
  return search ? `${action}${action.includes('?') ? '&' : '?'}${search}` : action
}

function formDataToQuery(form: HTMLFormElement): CatalogQuery {
  const nextQuery: CatalogQuery = {}
  for (const [key, value] of new FormData(form).entries()) {
    if (typeof value !== 'string' || value === '') continue
    const current = nextQuery[key]
    nextQuery[key] = current === undefined
      ? value
      : Array.isArray(current)
        ? [...current, value]
        : [current, value]
  }
  return nextQuery
}

export function CatalogFilterForm({ action, query, locale, mode, sort, facets, resultCount, countContext }: Props) {
  const ru = locale === 'ru'
  const formId = `catalog-filter-form-${mode}`
  const drawerTitleId = useId()
  const [open, setOpen] = useState(false)
  const [drawerMounted, setDrawerMounted] = useState(false)
  const [openSection, setOpenSection] = useState('')
  const [brandSearch, setBrandSearch] = useState('')
  const [categorySearch, setCategorySearch] = useState('')
  const [isHeaderCondensed, setIsHeaderCondensed] = useState(false)
  const [isMobileViewport, setIsMobileViewport] = useState(false)
  const [isHeaderHidden, setIsHeaderHidden] = useState(false)
  const view = catalogView(query.view)
  const [priceMin, setPriceMin] = useState(Number(valuesFor(query, 'price_min')[0] ?? facets.priceMin))
  const [priceMax, setPriceMax] = useState(Number(valuesFor(query, 'price_max')[0] ?? facets.priceMax))
  const [pendingCount, setPendingCount] = useState<number | null>(null)
  const [isCountLoading, setIsCountLoading] = useState(false)
  const reduceMotion = useReducedMotion()
  const formRef = useRef<HTMLFormElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const countRequestRef = useRef<AbortController | null>(null)
  const countDebounceRef = useRef<number | null>(null)
  const isHeaderHiddenRef = useRef(false)
  const features = facets.features ?? []
  const categories = facets.categories ?? []
  const checkedBrands = valuesFor(query, 'brand[]').concat(valuesFor(query, 'brand'))
  const checkedCategories = valuesFor(query, 'category[]').concat(valuesFor(query, 'category'))
  const checkedSexes = valuesFor(query, 'sex[]').concat(valuesFor(query, 'sex'))
  const currentSort = SORT_VALUES[sort]
  const labels = ru
    ? {
        filters: 'Фильтры', sort: 'По популярности', result: 'продукта', view: 'Вид каталога', standard: 'Обычный вид', featured: 'Увеличенный вид',
        price: 'Цена', brand: 'Бренд', color: 'Цвет', spf: 'SPF', texture: 'Текстура',
        available: 'В наличии', discounted: 'Со скидкой', categories: 'Категория', sex: 'Для кого',
        close: 'Закрыть фильтры', min: 'от', max: 'до', show: 'Показать', search: 'Поиск в каталоге',
        searchPlaceholder: 'Например, Clarins', facetSearch: 'Поиск по названию', brandSearchPlaceholder: 'Найти бренд', categorySearchPlaceholder: 'Найти категорию', noFacetResults: 'Ничего не найдено', reset: 'Отменить фильтры',
        empty: 'Нет доступных параметров',
      }
    : {
        filters: 'Filtre', sort: 'Cele mai populare', result: 'produse', view: 'Vizualizare catalog', standard: 'Standard', featured: 'Vizualizare mare',
        price: 'Preț', brand: 'Brand', color: 'Culoare', spf: 'SPF', texture: 'Textură',
        available: 'În stoc', discounted: 'Cu reducere', categories: 'Categorie', sex: 'Pentru cine',
        close: 'Închide filtrele', min: 'de la', max: 'până la', show: 'Afișează', search: 'Caută în catalog',
        searchPlaceholder: 'De exemplu, Clarins', facetSearch: 'Caută după denumire', brandSearchPlaceholder: 'Caută brandul', categorySearchPlaceholder: 'Caută categoria', noFacetResults: 'Nu am găsit rezultate', reset: 'Anulează filtrele',
        empty: 'Nu există opțiuni disponibile',
      }

  const formattedCount = resultCount?.toLocaleString(ru ? 'ru-RU' : 'ro-RO')
  const resultLabel = resultCount === undefined ? labels.result : productCountLabel(resultCount, locale)
  const activeFilterCount = Object.entries(query).reduce((count, [key, value]) => {
    if (['page', 'sort', 'sorder', 'view', 'q'].includes(key)) return count
    if (!FILTER_QUERY_KEY.test(key)) return count
    return count + (Array.isArray(value) ? value.filter(Boolean).length : value ? 1 : 0)
  }, 0)
  const filterParams = Object.entries(query).flatMap(([key, value]) => {
    if (!FILTER_QUERY_KEY.test(key)) return []
    return (Array.isArray(value) ? value : value === undefined ? [] : [value])
      .filter((item): item is string => typeof item === 'string' && item.length > 0)
      .map((item) => ({ key, value: item }))
  })
  const hasPriceFilter = valuesFor(query, 'price_min').length > 0 || valuesFor(query, 'price_max').length > 0
  const hasStockFilter = valuesFor(query, 'in_stock').some((value) => ['1', 'true', 'on'].includes(value))
  const hasDiscountFilter = valuesFor(query, 'discounted').some((value) => ['1', 'true', 'on'].includes(value))

  function cancelCountRequest() {
    if (countDebounceRef.current !== null) window.clearTimeout(countDebounceRef.current)
    countDebounceRef.current = null
    countRequestRef.current?.abort()
    countRequestRef.current = null
  }

  async function fetchPendingCount() {
    const form = formRef.current
    if (!countContext || !form) return
    const controller = new AbortController()
    countRequestRef.current?.abort()
    countRequestRef.current = controller
    setIsCountLoading(true)
    try {
      const response = await fetch('/api/catalog/count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: countContext, locale, query: formDataToQuery(form) }),
        signal: controller.signal,
      })
      if (!response.ok) throw new Error('Catalog count request failed')
      const payload = await response.json() as { count?: number }
      if (!controller.signal.aborted) setPendingCount(typeof payload.count === 'number' ? payload.count : 0)
    } catch {
      // Keep the last known count while a preview request is unavailable.
    } finally {
      if (!controller.signal.aborted) setIsCountLoading(false)
    }
  }

  function schedulePendingCount(force = false) {
    if ((!open && !force) || !countContext) return
    if (countDebounceRef.current !== null) window.clearTimeout(countDebounceRef.current)
    countDebounceRef.current = window.setTimeout(() => {
      countDebounceRef.current = null
      void fetchPendingCount()
    }, 180)
  }

  function sectionOwnsKey(section: string, key: string) {
    if (section === 'price') return key === 'price_min' || key === 'price_max'
    if (section === 'brands') return key === 'brand[]' || key === 'brand'
    if (section === 'categories') return key === 'category[]' || key === 'category'
    if (section === 'sex') return key === 'sex[]' || key === 'sex'
    if (section === 'in_stock') return key === 'in_stock'
    if (section === 'discounted') return key === 'discounted'
    const match = /^feature-(\d+)$/.exec(section)
    return Boolean(match && (key === `feature[${match[1]}][]` || key === `feature[${match[1]}]`))
  }

  const drawerShowsAll = openSection === ''
  const drawerTitle = drawerShowsAll
    ? labels.filters
    : ({
        price: labels.price,
        brands: labels.brand,
        categories: labels.categories,
        in_stock: labels.available,
        discounted: labels.discounted,
        sex: labels.sex,
      } as Record<string, string>)[openSection] ?? features.find((feature) => `feature-${feature.id}` === openSection)?.title ?? labels.filters

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDrawer()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
    // closeDrawer is intentionally stable as a local state setter wrapper.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (open) {
      setDrawerMounted(true)
      return
    }

    const timer = window.setTimeout(() => setDrawerMounted(false), 500)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    const media = window.matchMedia('(max-width: 600px)')
    const updateViewport = () => setIsMobileViewport(media.matches)
    updateViewport()
    media.addEventListener('change', updateViewport)
    return () => media.removeEventListener('change', updateViewport)
  }, [])

  useEffect(() => {
    let previousY = window.scrollY
    setIsHeaderCondensed(false)
    isHeaderHiddenRef.current = false
    setIsHeaderHidden(false)

    function handleScroll() {
      const currentY = window.scrollY
      if (currentY <= 0) {
        setIsHeaderCondensed(false)
        isHeaderHiddenRef.current = false
        setIsHeaderHidden(false)
        previousY = currentY
        return
      }
      const delta = currentY - previousY
      if (Math.abs(delta) > 4) {
        if (delta > 0) {
          setIsHeaderCondensed(false)
          isHeaderHiddenRef.current = true
          setIsHeaderHidden(true)
        } else {
          const wasHidden = isHeaderHiddenRef.current
          isHeaderHiddenRef.current = false
          setIsHeaderHidden(false)
          setIsHeaderCondensed(wasHidden)
        }
        previousY = currentY
      }
    }

    function handleResize() {
      previousY = window.scrollY
      setIsHeaderCondensed(false)
      isHeaderHiddenRef.current = false
      setIsHeaderHidden(false)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  function closeDrawer() {
    cancelCountRequest()
    setPendingCount(null)
    setIsCountLoading(false)
    setOpen(false)
    window.requestAnimationFrame(() => triggerRef.current?.focus())
  }

  function openDrawer(section = '') {
    setOpenSection(section)
    setPendingCount(resultCount ?? null)
    setOpen(true)
    window.requestAnimationFrame(() => schedulePendingCount(true))
  }

  function handlePriceSheetDragEnd(_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) {
    if (info.offset.y > PRICE_SHEET_DISMISS_OFFSET || info.velocity.y > PRICE_SHEET_DISMISS_VELOCITY) closeDrawer()
  }

  function sectionButton(id: string, title: string, count?: number) {
    const expanded = openSection === id
    return (
      <div key={id} className="border-b border-[#ededed]">
        <button type="button" aria-expanded={expanded} onClick={() => setOpenSection(expanded ? '' : id)} className="flex min-h-[58px] w-full items-center justify-between gap-4 text-left text-[16px] font-medium text-[#141414]">
          <span>{title}</span>
          <span className="flex items-center gap-3 text-[#737373]">
            {count ? <span className="text-[12px]">{count}</span> : null}
            <span aria-hidden="true" className="text-[20px] font-normal leading-none">{expanded ? '−' : '+'}</span>
          </span>
        </button>
        <div className={expanded ? 'pb-5' : 'hidden'}>{sectionContent(id)}</div>
      </div>
    )
  }

  function checkboxList(name: string, options: CatalogFacetOption[] | Array<{ id: number; title: string | null; count?: number }>, checked: string[], searchable?: 'brands' | 'categories') {
    if (!options.length) return <p className="m-0 text-[13px] text-[#777]">{labels.empty}</p>
    const searchValue = searchable === 'brands' ? brandSearch : searchable === 'categories' ? categorySearch : ''
    const filteredOptions = searchValue.trim()
      ? options.filter((option) => (option.title || '').toLocaleLowerCase(locale).includes(searchValue.trim().toLocaleLowerCase(locale)))
      : options
    const visibleIds = new Set(filteredOptions.map((option) => String(option.id)))
    const selectedOutsideSearch = searchable
      ? options.filter((option) => checked.includes(String(option.id)) && !visibleIds.has(String(option.id)))
      : []
    return (
      <div className="space-y-4">
        {searchable ? <label className="block"><span className="sr-only">{labels.facetSearch}</span><input type="search" value={searchValue} onChange={(event) => searchable === 'brands' ? setBrandSearch(event.target.value) : setCategorySearch(event.target.value)} placeholder={searchable === 'brands' ? labels.brandSearchPlaceholder : labels.categorySearchPlaceholder} className="h-10 w-full rounded-full border border-[#dedede] px-4 text-[13px] outline-none placeholder:text-[#999] focus:border-[#141414]" /></label> : null}
        {selectedOutsideSearch.map((option) => <input key={`preserved-${option.id}`} type="hidden" name={name} value={option.id} />)}
        {filteredOptions.length ? <div className="max-h-64 space-y-3 overflow-y-auto pr-2">
        {filteredOptions.map((option) => (
          <label key={option.id} className="flex cursor-pointer items-center justify-between gap-4 text-[14px] text-[#242424]">
            <span className="flex items-center gap-3">
              <input className="size-4 accent-black" type="checkbox" name={name} value={option.id} defaultChecked={checked.includes(String(option.id))} />
              <span>{option.title || (ru ? 'Без названия' : 'Fără denumire')}</span>
            </span>
            {'count' in option && typeof option.count === 'number' ? <span className="text-[12px] text-[#888]">{option.count}</span> : null}
          </label>
        ))}
        </div> : <p className="m-0 text-[13px] text-[#777]">{searchValue ? labels.noFacetResults : labels.empty}</p>}
      </div>
    )
  }

  function sectionContent(id: string) {
    if (id === 'in_stock' || id === 'discounted') {
      const discounted = id === 'discounted'
      const title = discounted ? labels.discounted : labels.available
      const checked = discounted ? hasDiscountFilter : hasStockFilter
      return (
        <div className="flex items-center justify-between py-4">
          <span className="flex items-center gap-2 text-[14px] font-medium">{discounted ? <Percent aria-hidden="true" className="size-4 text-[#b5d600]" /> : null}{title}</span>
          <label className="relative inline-flex cursor-pointer items-center" aria-label={title}>
            <input className="peer sr-only" type="checkbox" name={discounted ? 'discounted' : 'in_stock'} value="1" defaultChecked={checked} />
            <span className="relative h-6 w-11 rounded-full bg-[#f0f0f0] transition-colors before:absolute before:left-0.5 before:top-0.5 before:size-5 before:rounded-full before:border before:border-[#111] before:bg-white before:transition-transform peer-checked:bg-[#171717] peer-checked:before:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-[#cdbbb0] peer-focus-visible:ring-offset-2" />
          </label>
        </div>
      )
    }
    if (id === 'price') {
      const min = facets.priceMin
      const max = Math.max(facets.priceMax, min + 1)
      const range = max - min
      const lowerPercent = ((Math.min(priceMin, priceMax) - min) / range) * 100
      const upperPercent = ((Math.max(priceMax, priceMin) - min) / range) * 100
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 text-[12px] text-[#646464]">
            <span className="rounded-full bg-[#f2f2f2] px-3 py-1.5 font-medium text-black">{labels.min} {toMoney(priceMin)} MDL</span>
            <span className="rounded-full bg-[#f2f2f2] px-3 py-1.5 font-medium text-black">{labels.max} {toMoney(priceMax)} MDL</span>
          </div>
          <div className="relative h-8 touch-none">
            <span className="absolute inset-x-2 top-1/2 h-px -translate-y-1/2 bg-[#dedede]" />
            <span className="absolute top-1/2 h-px -translate-y-1/2 bg-[#141414]" style={{ left: `calc(${lowerPercent}% + 8px)`, right: `calc(${100 - upperPercent}% + 8px)` }} />
            <input aria-label={labels.min} className="pointer-events-none absolute inset-x-0 top-1/2 h-6 w-full -translate-y-1/2 appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-black [&::-moz-range-thumb]:bg-white [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:h-px [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-black [&::-webkit-slider-thumb]:bg-white" type="range" min={min} max={Math.max(min, priceMax)} step="1" value={Math.min(priceMin, priceMax)} onChange={(event) => setPriceMin(Math.min(Number(event.target.value), priceMax))} />
            <input aria-label={labels.max} className="pointer-events-none absolute inset-x-0 top-1/2 h-6 w-full -translate-y-1/2 appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-black [&::-moz-range-thumb]:bg-white [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:h-px [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-black [&::-webkit-slider-thumb]:bg-white" type="range" min={Math.min(priceMin, priceMax)} max={max} step="1" value={Math.max(priceMax, priceMin)} onChange={(event) => setPriceMax(Math.max(Number(event.target.value), priceMin))} />
          </div>
          <input type="hidden" name="price_min" value={priceMin === facets.priceMin ? '' : priceMin} />
          <input type="hidden" name="price_max" value={priceMax === facets.priceMax ? '' : priceMax} />
        </div>
      )
    }
    if (id === 'brands') return checkboxList('brand[]', facets.brands, checkedBrands, 'brands')
    if (id === 'categories') return checkboxList('category[]', categories, checkedCategories, 'categories')
    if (id === 'sex') {
      return facets.sexes.length ? (
        <div className="space-y-3">
          {facets.sexes.map((sex) => <label key={sex} className="flex cursor-pointer items-center gap-3 text-[14px]"><input className="size-4 accent-black" type="checkbox" name="sex[]" value={sex} defaultChecked={checkedSexes.includes(sex)} />{sex}</label>)}
        </div>
      ) : <p className="m-0 text-[13px] text-[#777]">{labels.empty}</p>
    }
    const match = /^feature-(\d+)$/.exec(id)
    if (match) {
      const featureId = Number(match[1])
      const feature = features.find((item) => item.id === featureId)
      if (!feature) return null
      const selected = valuesFor(query, `feature[${featureId}][]`).concat(valuesFor(query, `feature[${featureId}]`))
      return feature.values.length ? (
        <div className="max-h-64 space-y-3 overflow-y-auto pr-2">
          {feature.values.map((value) => (
            <label key={value.id} className="flex cursor-pointer items-center justify-between gap-4 text-[14px]">
              <span className="flex items-center gap-3"><input className="size-4 accent-black" type="checkbox" name={`feature[${featureId}][]`} value={value.id} defaultChecked={selected.includes(String(value.id))} />{value.title || (ru ? 'Без названия' : 'Fără denumire')}</span>
              <span className="text-[12px] text-[#888]">{value.count}</span>
            </label>
          ))}
        </div>
      ) : <p className="m-0 text-[13px] text-[#777]">{labels.empty}</p>
    }
    return null
  }

  const quickFeatures = [
    { key: 'color', title: labels.color, match: /цвет|culoare|color/i },
    { key: 'spf', title: labels.spf, match: /\bspf\b/i },
    { key: 'texture', title: labels.texture, match: /текстур|textur/i },
  ].map((item) => {
    const feature = features.find((candidate) => item.match.test(featureTitle(candidate)))
    const selected = feature ? valuesFor(query, `feature[${feature.id}][]`).concat(valuesFor(query, `feature[${feature.id}]`)).length > 0 : false
    return { ...item, feature, selected }
  })
  const isPriceSheet = isMobileViewport && openSection === 'price'

  return (
    <form ref={formRef} id={formId} action={action} method="get" onChange={() => schedulePendingCount()} className={`sticky ${open ? 'z-[1001]' : 'z-40'} mb-7 border-y border-[#e8e8e8] bg-white transition-[transform,opacity,top] duration-300 ease-out max-[767px]:-mx-5 max-[767px]:w-[calc(100%+40px)] sm:mb-9 ${isHeaderCondensed ? 'top-[112px] max-[600px]:top-[58px]' : 'top-[180px] max-[600px]:top-[58px]'} ${open || drawerMounted ? 'transform-none opacity-100' : isHeaderHidden ? '-translate-y-full pointer-events-none opacity-0' : 'translate-y-0 opacity-100'}`}>
      {mode === 'search' && query.q ? <input type="hidden" name="q" value={Array.isArray(query.q) ? query.q[0] : query.q} /> : null}
      {mode === 'catalog' && (!drawerShowsAll || !open) && valuesFor(query, 'q')[0] ? <input type="hidden" name="q" value={valuesFor(query, 'q')[0]} /> : null}
      {filterParams.filter(({ key }) => !open || (!drawerShowsAll && !sectionOwnsKey(openSection, key))).map(({ key, value }, index) => <input key={`${key}-${value}-${index}`} type="hidden" name={key} value={value} />)}
      <input type="hidden" name="sort" value={currentSort} />
      <input type="hidden" name="view" value={view} />

      <div className="relative flex min-h-[54px] items-center justify-between gap-3 border-b border-[#eeeeee] py-2 text-[13px] max-[600px]:pointer-events-auto">
        <div className={`${isHeaderCondensed ? 'contents' : 'flex min-w-0 items-center gap-4 sm:gap-6'}`}>
          <button ref={triggerRef} type="button" onClick={() => openDrawer()} className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-[#000000] px-4 text-[14px] font-medium text-[#000000] transition-colors hover:bg-[#f7f5f3] ${isHeaderCondensed ? 'order-1' : ''}`} aria-haspopup="dialog" aria-expanded={open}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M16 6a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm-2.45 1a2.5 2.5 0 0 1 4.9 0H21v1h-2.55a2.5 2.5 0 0 1-4.9 0H3V7h10.55ZM8 15a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm-2.45 1a2.5 2.5 0 0 1 4.9 0H21v1H10.45a2.5 2.5 0 0 1-4.9 0H3v-1h2.55Z" /></svg>
            <span>{labels.filters}</span>
            {activeFilterCount > 0 ? <span className="grid size-5 place-items-center rounded-full bg-black text-[10px] text-white">{activeFilterCount}</span> : null}
          </button>
        </div>

        {resultCount !== undefined && !isHeaderCondensed ? <p className="m-0 whitespace-nowrap text-[13px] text-[#000000] max-[900px]:hidden" aria-live="polite">{formattedCount} {resultLabel}</p> : null}
      </div>

      {resultCount !== undefined && !isHeaderCondensed ? <p className="m-0 border-b border-[#eeeeee] py-2 text-center text-[12px] text-[#555] min-[901px]:hidden" aria-live="polite">{formattedCount} {resultLabel}</p> : null}

      <div className="flex min-h-[52px] max-h-20 items-center gap-2 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-[600px]:pointer-events-auto">
        <span className="inline-flex shrink-0 items-center gap-1"><a href={queryHref(action, query, { discounted: hasDiscountFilter ? null : '1' })} aria-pressed={hasDiscountFilter} className={`inline-flex h-[31px] shrink-0 items-center gap-2 rounded-full border px-3 text-[10px] font-medium uppercase tracking-[0.12em] transition-colors hover:border-[#cdbbb0] hover:bg-[#faf8f6] ${hasDiscountFilter ? 'border-[#141414] bg-[#141414] text-white hover:bg-[#141414]' : 'border-[#dedede] text-[#171717]'}`}><Percent aria-hidden="true" className="size-3 text-[#b5d600]" />{labels.discounted}</a>{hasDiscountFilter ? <a aria-label={ru ? 'Сбросить скидку' : 'Resetează reducerea'} href={queryHref(action, query, { discounted: null })} className="grid size-6 shrink-0 place-items-center rounded-full text-[#666] hover:bg-[#f2f2f2]"><X aria-hidden="true" className="size-3" /></a> : null}</span>
        {facets.brands.length ? <span className="hidden"><button type="button" onClick={() => openDrawer('brands')} className={`inline-flex h-[31px] shrink-0 items-center gap-2 rounded-full border px-3 text-[10px] font-medium uppercase tracking-[0.12em] transition-colors hover:border-[#cdbbb0] hover:bg-[#faf8f6] ${checkedBrands.length ? 'border-[#141414] bg-[#141414] text-white hover:bg-[#141414]' : 'border-[#dedede] text-[#171717]'}`}>{labels.brand}{checkedBrands.length ? <span>{checkedBrands.length}</span> : <ChevronDown aria-hidden="true" className="size-3" />}</button>{checkedBrands.length ? <a aria-label={ru ? 'Сбросить бренд' : 'Resetează brandul'} href={queryHref(action, query, { 'brand[]': null, brand: null })} className="grid size-6 shrink-0 place-items-center rounded-full text-[#666] hover:bg-[#f2f2f2]"><X aria-hidden="true" className="size-3" /></a> : null}</span> : null}
        {categories.length ? <span className="hidden"><button type="button" onClick={() => openDrawer('categories')} className={`inline-flex h-[31px] shrink-0 items-center gap-2 rounded-full border px-3 text-[10px] font-medium uppercase tracking-[0.12em] transition-colors hover:border-[#cdbbb0] hover:bg-[#faf8f6] ${checkedCategories.length ? 'border-[#141414] bg-[#141414] text-white hover:bg-[#141414]' : 'border-[#dedede] text-[#171717]'}`}>{labels.categories}{checkedCategories.length ? <span>{checkedCategories.length}</span> : <ChevronDown aria-hidden="true" className="size-3" />}</button>{checkedCategories.length ? <a aria-label={ru ? 'Сбросить категорию' : 'Resetează categoria'} href={queryHref(action, query, { 'category[]': null, category: null })} className="grid size-6 shrink-0 place-items-center rounded-full text-[#666] hover:bg-[#f2f2f2]"><X aria-hidden="true" className="size-3" /></a> : null}</span> : null}
        <span className="hidden">
          <button type="button" onClick={() => openDrawer('price')} className={`inline-flex h-[31px] shrink-0 items-center gap-2 rounded-full border px-3 text-[10px] font-medium uppercase tracking-[0.12em] transition-colors hover:border-[#cdbbb0] hover:bg-[#faf8f6] ${hasPriceFilter ? 'border-[#141414] bg-[#141414] text-white hover:bg-[#141414]' : 'border-[#dedede] text-[#171717]'}`}>{labels.price}<ChevronDown aria-hidden="true" className="size-3" /></button>
          {hasPriceFilter ? <a aria-label={ru ? 'Сбросить цену' : 'Resetează prețul'} href={queryHref(action, query, { price_min: null, price_max: null })} className="grid size-6 shrink-0 place-items-center rounded-full text-[#666] hover:bg-[#f2f2f2]" onClick={(event) => event.stopPropagation()}><X aria-hidden="true" className="size-3" /></a> : null}
        </span>
        <span className="hidden"><a href={queryHref(action, query, { in_stock: hasStockFilter ? null : '1' })} aria-pressed={hasStockFilter} className={`inline-flex h-[31px] shrink-0 items-center gap-2 rounded-full border px-3 text-[10px] font-medium uppercase tracking-[0.12em] transition-colors hover:border-[#cdbbb0] hover:bg-[#faf8f6] ${hasStockFilter ? 'border-[#141414] bg-[#141414] text-white hover:bg-[#141414]' : 'border-[#dedede] text-[#171717]'}`}>{labels.available}</a>{hasStockFilter ? <a aria-label={ru ? 'Сбросить наличие' : 'Resetează disponibilitatea'} href={queryHref(action, query, { in_stock: null })} className="grid size-6 shrink-0 place-items-center rounded-full text-[#666] hover:bg-[#f2f2f2]"><X aria-hidden="true" className="size-3" /></a> : null}</span>
        {quickFeatures.map(({ key, title, feature, selected }) => feature ? <span className="hidden" key={key}><button type="button" onClick={() => openDrawer(`feature-${feature.id}`)} className={`inline-flex h-[31px] shrink-0 items-center gap-2 rounded-full border px-3 text-[10px] font-medium uppercase tracking-[0.12em] transition-colors hover:border-[#cdbbb0] hover:bg-[#faf8f6] ${selected ? 'border-[#141414] bg-[#141414] text-white hover:bg-[#141414]' : 'border-[#dedede] text-[#171717]'}`}>{title}<ChevronDown aria-hidden="true" className="size-3" /></button>{selected ? <a aria-label={ru ? `Сбросить фильтр «${title}»` : `Resetează filtrul «${title}»`} href={queryHref(action, query, { [`feature[${feature.id}][]`]: null, [`feature[${feature.id}]`]: null })} className="grid size-6 shrink-0 place-items-center rounded-full text-[#666] hover:bg-[#f2f2f2]"><X aria-hidden="true" className="size-3" /></a> : null}</span> : null)}
        {activeFilterCount > 0 ? <a href={queryHref(action, query, {}, true)} className="inline-flex h-[31px] shrink-0 items-center gap-1.5 rounded-full px-3 text-[10px] font-medium uppercase tracking-[0.12em] text-[#666] underline decoration-[#cdbbb0] underline-offset-4 transition-colors hover:text-[#ab8a73]"><X aria-hidden="true" className="size-3" />{labels.reset}</a> : null}
      </div>

      <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[1000]"
          role="presentation"
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
          <button type="button" aria-label={ru ? 'Закрыть фильтры' : 'Închide filtrele'} onClick={closeDrawer} className="absolute inset-0 h-full w-full cursor-default bg-black/35" />
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby={drawerTitleId}
            className={`absolute inset-y-0 left-0 flex w-full flex-col bg-white shadow-[12px_0_40px_rgba(0,0,0,0.12)] sm:w-[min(460px,92vw)] min-[992px]:w-[48vw] min-[992px]:max-w-none ${isPriceSheet ? 'max-[600px]:inset-y-auto max-[600px]:top-auto max-[600px]:bottom-0 max-[600px]:h-auto max-[600px]:max-h-[calc(100dvh-24px)] max-[600px]:rounded-t-[28px] max-[600px]:shadow-[0_-12px_40px_rgba(0,0,0,0.16)] touch-none' : ''}`}
            initial={reduceMotion ? { x: 0, y: 0 } : isPriceSheet ? { x: 0, y: '100%' } : { x: '-100%', y: 0 }}
            animate={{ x: 0, y: 0 }}
            exit={reduceMotion ? { x: 0, y: 0 } : isPriceSheet ? { x: 0, y: '100%' } : { x: '-100%', y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.48, ease: [0.16, 1, 0.3, 1] }}
            drag={isPriceSheet ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={isPriceSheet ? handlePriceSheetDragEnd : undefined}
          >
            {isPriceSheet ? <span aria-hidden="true" className="mx-auto mt-3 mb-1 block h-1 w-10 shrink-0 rounded-full bg-[#e6e6e6] touch-none" /> : null}
            <header className="flex min-h-[86px] shrink-0 items-center justify-between gap-5 border-b border-[#ededed] px-6 sm:px-8">
              <h2 id={drawerTitleId} className="m-0 text-[27px] font-normal tracking-[-0.04em] text-[#111]">{drawerTitle}</h2>
              <button ref={closeRef} type="button" onClick={closeDrawer} aria-label={labels.close} className="grid size-10 shrink-0 place-items-center rounded-full text-[#171717] transition-colors hover:bg-[#f3f3f3]"><X aria-hidden="true" className="size-6" strokeWidth={1.4} /></button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-5 sm:px-8">
              {drawerShowsAll ? (
                <>
                  {mode === 'catalog' ? <label className="block border-b border-[#ededed] py-5"><span className="mb-2 block text-[12px] text-[#777]">{labels.search}</span><input name="q" defaultValue={valuesFor(query, 'q')[0] ?? ''} placeholder={labels.searchPlaceholder} className="h-11 w-full rounded-full border border-[#dedede] px-4 text-[14px] outline-none placeholder:text-[#999] focus:border-[#141414]" /></label> : null}
                  <div className="border-b border-[#ededed]">{sectionContent('in_stock')}</div>
                  <div className="border-b border-[#ededed]">{sectionContent('discounted')}</div>
                  {sectionButton('price', labels.price)}
                  {sectionButton('brands', labels.brand, facets.brands.length)}
                  {categories.length ? sectionButton('categories', labels.categories, categories.length) : null}
                  {facets.sexes.length ? sectionButton('sex', labels.sex) : null}
                  {features.map((feature) => sectionButton(`feature-${feature.id}`, featureTitle(feature) || (ru ? 'Характеристики' : 'Caracteristici'), feature.values.length))}
                </>
              ) : (
                <div className="pt-5">{sectionContent(openSection)}</div>
              )}
            </div>

            <footer className="shrink-0 border-t border-[#ededed] bg-white px-6 py-4 pb-[max(16px,env(safe-area-inset-bottom))] sm:px-8">
              <button type="submit" className="flex h-[50px] w-full items-center justify-center rounded-full bg-black px-6 text-[11px] font-medium uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#2d2d2d]" aria-live="polite">{labels.show}{(pendingCount ?? resultCount) !== undefined ? ` ${isCountLoading ? '…' : (pendingCount ?? resultCount)?.toLocaleString(ru ? 'ru-RU' : 'ro-RO')} ${productCountLabel(pendingCount ?? resultCount ?? 0, locale)}` : ''}</button>
            </footer>
          </motion.section>
        </motion.div>
      ) : null}
      </AnimatePresence>
    </form>
  )
}
