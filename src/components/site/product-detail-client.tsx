'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { LocalizedLink as Link } from '@/components/site/localized-link'
import { ArrowLeft, ArrowRight, BadgeCheck, ChevronDown, ChevronLeft, CircleHelp, PackageCheck, Plus, Search, Store, Truck, X } from 'lucide-react'

import type { CatalogProduct, ProductDetailData, ProductVariant } from '@/lib/catalog'
import { legacyAsset } from '@/lib/legacy-assets'
import { ProductCard } from './product-card'
import { ProductGallery } from './product-gallery'
import { FavoriteToggle } from './favorite-toggle'
import { ProductPromotion } from './product-promotion'
import { ProductPriceSummary, ProductPurchase } from './product-purchase'
import { ContentSlider } from './content-slider'

function variantHexColors(variant: ProductVariant) {
  const isHex = (value: unknown): value is string => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
  const colors: string[] = []

  if (isHex(variant.colorHex)) colors.push(variant.colorHex)
  try {
    const parsed: unknown = JSON.parse(variant.colorData ?? '')
    const rawColors = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === 'object' && 'colors' in parsed
        ? (parsed as { colors?: unknown }).colors
        : []
    if (Array.isArray(rawColors)) {
      for (const color of rawColors) {
        if (isHex(color) && !colors.includes(color)) colors.push(color)
        if (colors.length >= 6) break
      }
    }
  } catch {
    // Legacy shade data may be missing or malformed.
  }

  return colors
}

function colorStops(variant: ProductVariant) {
  const colors = variantHexColors(variant)
  if (colors.length === 0) return null
  if (colors.length === 1) return colors[0]
  return `linear-gradient(90deg, ${colors.map((color, index) => `${color} ${(index / colors.length) * 100}% ${((index + 1) / colors.length) * 100}%`).join(', ')})`
}

function shadeLabel(variant: ProductVariant | null, fallback: string) {
  if (!variant) return fallback
  const stripVolume = (value: string | null | undefined) => value?.trim()
    .replace(/\s*[|,·-]?\s*\d+(?:[.,]\d+)?\s*(?:ml|мл)\.?\s*$/i, '')
    .trim() ?? ''
  return stripVolume(variant.color) || stripVolume(variant.title) || fallback
}

function isMakeupProduct(product: Pick<ProductDetailData, 'title' | 'categoryTrail'>) {
  const categories = product.categoryTrail.map((category) => category.title).join(' ')
  return /макияж|губ|помад|тональн|тушь|тени|румян|консилер|палетк|карандаш|пудр|хайлайтер|бров|make[\s-]?up|lipstick|\blip\b|foundation|mascara|eyeshadow|blush|concealer|powder|eyebrow|machiaj|ruj|fond de ten|fard|rimel|pudr[ăa]|corector|sprâncene/i.test(`${categories} ${product.title ?? ''}`)
}

function volumeParts(value: string) {
  const match = value.trim().match(/^([\d]+(?:[.,][\d]+)?)\s*(.*)$/)
  return { amount: match?.[1]?.replace(',', '.') ?? value.trim(), unit: match?.[2]?.trim() ?? '' }
}

function ProductRail({ title, products }: { title: string; products: CatalogProduct[] }) {
  if (!products.length) return null
  return (
    <section className="pt-20 pb-4 lg:pt-28" aria-label={title}>
      <ContentSlider
        label={title}
        heading={<h2 className="m-0 text-2xl font-medium tracking-[-.035em] sm:text-4xl">{title}</h2>}
        slideClassName="basis-[calc(50%_-_6px)] sm:basis-[calc(33.333%_-_12px)] lg:basis-[calc(25%_-_13.5px)]"
        trackClassName="pb-8 sm:gap-[18px]"
      >
        {products.slice(0, 8).map((product) => <ProductCard key={product.id} product={product} />)}
      </ContentSlider>
    </section>
  )
}

function RichText({ html }: { html: string | null }) {
  if (!html?.trim()) return null
  return (
    <div
      className="max-w-none whitespace-pre-line text-sm leading-7 text-graphite [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-hover-cream [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-medium [&_li]:ml-5 [&_li]:list-disc [&_ol]:my-3 [&_p]:mb-3 [&_ul]:my-3"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function DetailAccordion({ title, html }: { title: string; html: string | null }) {
  if (!html?.trim()) return null
  return (
    <details className="group border-b border-black/10">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-[18px] text-xs leading-[1.4] font-medium tracking-[.04em] marker:hidden focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden">
        {title}
        <Plus className="size-4 shrink-0 text-graphite transition-transform duration-200 group-open:rotate-45" strokeWidth={1.4} />
      </summary>
      <div className="pb-[22px]"><RichText html={html} /></div>
    </details>
  )
}

export function ProductDetailClient({ product, bonusInfo, isB2B = false }: {
  product: ProductDetailData
  bonusInfo: { rate: number; balance: number } | null
  isB2B?: boolean
}) {
  const locale = product.locale ?? 'ru'
  const text = locale === 'ro'
    ? { unnamed: 'Produs fără nume', home: 'Acasă', catalog: 'Catalog', breadcrumbs: 'Fir de navigare', product: 'Produs', collapse: 'Restrânge', expand: 'Afișează complet', sku: 'Cod produs:', shade: 'Nuanță', chooseShade: 'Alege o nuanță', allShades: 'Toate cele', shadeCountSuffix: 'nuanțe', drawerShade: 'Alegeți nuanța', quickShade: 'Selectare rapidă a nuanței', outOfStock: 'Indisponibil', searchShade: 'Denumirea nuanței', shadeSearch: 'Caută nuanța', closeShade: 'Închide selectarea nuanței', closeDescription: 'Închide descrierea', selected: 'Selectat', noShades: 'Nu au fost găsite nuanțe', volume: 'Volum / ml', benefits: 'Avantaje și livrare', quality: 'Garanția calității produselor', freeDelivery: 'Livrare gratuită', pickup: 'Ridicare din magazin', collection: 'Colecția', about: 'Despre produs', descriptionFeatures: 'Descrierea și caracteristicile produsului', details: 'Detalii', description: 'Descriere', usage: 'Mod de utilizare', ingredients: 'Ingrediente', aboutBrand: 'Despre brand', characteristics: 'Caracteristici', detailedCharacteristics: 'Caracteristici detaliate', brand: 'Brand', gender: 'Gen', article: 'Cod produs', barcode: 'Cod de bare', needHelp: 'Ai nevoie de ajutor?', support: 'Serviciul de asistență', seeMore: 'Vezi și', similar: 'Produse similare', oftenTogether: 'Se cumpără frecvent împreună' }
    : { unnamed: 'Товар без названия', home: 'Главная', catalog: 'Каталог', breadcrumbs: 'Хлебные крошки', product: 'Товар', collapse: 'Свернуть', expand: 'Показать полностью', sku: 'Артикул:', shade: 'Оттенок', chooseShade: 'Выберите оттенок', allShades: 'Все', shadeCountSuffix: 'оттенков', drawerShade: 'Выберите оттенок', quickShade: 'Быстрый выбор оттенка', outOfStock: 'Нет в наличии', searchShade: 'Название оттенка', shadeSearch: 'Поиск оттенка', closeShade: 'Закрыть выбор оттенка', closeDescription: 'Закрыть описание', selected: 'Выбран', noShades: 'Оттенки не найдены', volume: 'Объём / мл', benefits: 'Преимущества и доставка', quality: 'Гарантия качества продукции', freeDelivery: 'Бесплатная доставка', pickup: 'Самовывоз из магазина', collection: 'Коллекция', about: 'О товаре', descriptionFeatures: 'Описание и характеристики товара', details: 'Подробности', description: 'Описание', usage: 'Способ применения', ingredients: 'Состав', aboutBrand: 'О бренде', characteristics: 'Характеристики', detailedCharacteristics: 'Подробные характеристики', brand: 'Бренд', gender: 'Пол', article: 'Артикул', barcode: 'Штрих-код', needHelp: 'Нужна помощь?', support: 'Служба поддержки', seeMore: 'Посмотрите ещё', similar: 'Похожие товары', oftenTogether: 'Часто покупают вместе' }
  const hasPrice = (variant: ProductVariant) => (variant.price ?? 0) > 0 || (variant.discountPrice ?? 0) > 0
  const firstVariant = product.variations.find((variant) => variant.quantity > 0 && hasPrice(variant))
    ?? product.variations.find(hasPrice)
    ?? product.variations.find((variant) => variant.quantity > 0 && variant.images.length > 0)
    ?? product.variations.find((variant) => variant.images.length > 0)
    ?? product.variations[0]
    ?? null
  const [activeVariantId, setActiveVariantId] = useState<number | null>(firstVariant?.id ?? null)
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false)
  const [isDescriptionDrawerOpen, setIsDescriptionDrawerOpen] = useState(false)
  const reduceMotion = useReducedMotion()
  const [colorSearch, setColorSearch] = useState('')
  const colorSearchRef = useRef<HTMLInputElement>(null)
  const descriptionTriggerRef = useRef<HTMLButtonElement>(null)
  const descriptionCloseRef = useRef<HTMLButtonElement>(null)
  const descriptionHtml = product.text || product.description
  const activeVariant = product.variations.find((variant) => variant.id === activeVariantId) ?? null
  const makeupProduct = isMakeupProduct(product)
  const colorVariants = useMemo(() => product.variations.filter((variant) =>
    variant.color?.trim() && variant.quantity > 0 && ((variant.price ?? 0) > 0 || (variant.discountPrice ?? 0) > 0) &&
    (!makeupProduct || variantHexColors(variant).length > 0),
  ), [makeupProduct, product.variations])
  const activeColorVariant = colorVariants.find((variant) => variant.id === activeVariantId) ?? colorVariants[0] ?? null
  const filteredColorVariants = useMemo(() => {
    const query = colorSearch.trim().toLocaleLowerCase()
    return query
      ? colorVariants.filter((variant) => `${variant.color ?? ''} ${variant.title ?? ''} ${variant.volume ?? ''}`.toLocaleLowerCase().includes(query))
      : colorVariants
  }, [colorSearch, colorVariants])
  const openColorPicker = () => {
    setColorSearch('')
    setIsColorPickerOpen(true)
  }
  const shadePreview = colorVariants.slice(0, 3).map((variant) => ({
    id: variant.id,
    label: shadeLabel(variant, text.shade),
    swatch: colorStops(variant),
    selected: variant.id === activeVariantId,
  }))
  useEffect(() => {
    if (!isColorPickerOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setIsColorPickerOpen(false); setColorSearch('') }
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    colorSearchRef.current?.focus()
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isColorPickerOpen])
  useEffect(() => {
    if (!isDescriptionDrawerOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    descriptionCloseRef.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsDescriptionDrawerOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
      descriptionTriggerRef.current?.focus()
    }
  }, [isDescriptionDrawerOpen])
  const volumeVariants = useMemo(() => product.variations.filter((variant) => !variant.color?.trim() && variant.volume?.trim()), [product.variations])
  const imageSet = activeVariant?.images.length
    ? activeVariant.images
    : product.images.length
      ? product.images
      : product.variations.find((variant) => variant.images.length > 0)?.images ?? []
  const currentPrice = activeVariant ? activeVariant.price : product.price
  const currentDiscountPrice = activeVariant ? activeVariant.discountPrice : product.discountPrice
  const selectedVolume = activeVariant ? activeVariant.volume : product.volume
  const selectedVolumeParts = selectedVolume?.trim() ? volumeParts(selectedVolume) : null
  const volumeUnitLabel = selectedVolumeParts?.unit && /(?:г|g)/i.test(selectedVolumeParts.unit)
    ? (locale === 'ro' ? 'greutate, g' : 'вес, г')
    : (locale === 'ro' ? 'volum, ml' : 'объём, мл')
  const selectedSku = activeVariant?.sku?.trim() || product.sku
  const isAvailable = activeVariant
    ? activeVariant.quantity > 0 && hasPrice(activeVariant)
    : Boolean(product.onStock) && ((product.price ?? 0) > 0 || (product.discountPrice ?? 0) > 0)
  const categoryPath = product.categoryTrail.filter((category) => category.uri)
  const categoryTitle = product.categoryTrail.at(-1)?.title ?? ''
  const productTitle = product.title?.trim() || text.unnamed
  const brandTitle = product.brand?.trim() || (product.brandId ? text.brand : '')
  useEffect(() => {
    setActiveVariantId(firstVariant?.id ?? null)
    setIsColorPickerOpen(false)
    setColorSearch('')
    setIsDescriptionDrawerOpen(false)
  }, [product.id])
  const genderLabel = product.gender?.trim()
    ? ((locale === 'ro'
      ? ({ 'Женский': 'Femei', 'Мужской': 'Bărbați', 'Унисекс': 'Unisex', Female: 'Femei', Male: 'Bărbați', Unisex: 'Unisex' } as Record<string, string>)
      : ({ 'Женский': 'Женский', 'Мужской': 'Мужской', 'Унисекс': 'Унисекс', Female: 'Женский', Male: 'Мужской', Unisex: 'Унисекс' } as Record<string, string>))[product.gender.trim()] ?? product.gender.trim())
    : null
  const purchaseProduct = {
    id: product.id,
    variantId: activeVariant?.id ?? null,
    variantLabel: activeVariant?.color
      ? shadeLabel(activeVariant, text.shade)
      : activeVariant?.volume || activeVariant?.title || null,
    title: product.title,
    brand: product.brand,
    price: currentPrice,
    discountPrice: currentDiscountPrice,
    bonusRate: bonusInfo?.rate ?? 0,
    bonusBalance: bonusInfo?.balance ?? 0,
    image: imageSet[0] ?? product.images[0] ?? null,
    available: isAvailable,
    locale,
  }
  const goBackToCatalog = () => {
    if (window.history.length > 1) {
      try {
        window.sessionStorage.setItem('vz:scroll-top-after-product-back', '1')
      } catch {
        // Continue with the browser back action when session storage is unavailable.
      }
      window.history.back()
      return
    }

    window.location.assign(locale === 'ro' ? '/ro/catalog' : '/ru/katalog')
  }
  return (
    <main className="relative mx-auto w-full max-w-[1670px] px-5 pt-5 pb-20 text-midnight-ink max-[900px]:pt-3 max-[600px]:pt-0 max-[600px]:pb-40 lg:pb-24 min-[1201px]:max-w-none min-[1201px]:px-0 min-[1201px]:pl-[3.3vw] min-[1201px]:pt-0">
      <nav className="sr-only" aria-label={text.breadcrumbs}>
        <Link className="transition-colors hover:text-hover-cream" href={`/${locale}`}>{text.home}</Link>
        <span aria-hidden="true">/</span>
        <Link className="transition-colors hover:text-hover-cream" href={locale === 'ro' ? '/ro/catalog' : '/ru/katalog'}>{text.catalog}</Link>
        {categoryPath.map((category) => (
          <span className="contents" key={category.id}>
            <span aria-hidden="true">/</span>
            <Link className="transition-colors hover:text-hover-cream" href={`${locale === 'ro' ? '/ro/catalog' : '/ru/katalog'}/${encodeURIComponent(category.uri!)}`}>{category.title}</Link>
          </span>
        ))}
      </nav>

      <nav className="mb-3 hidden items-center justify-between max-[600px]:flex" aria-label={text.product}>
        <button className="inline-flex size-10 items-center justify-start text-midnight-ink" type="button" onClick={goBackToCatalog} aria-label={locale === 'ro' ? 'Înapoi' : 'Назад'}><ArrowLeft className="size-5" strokeWidth={1.5} /></button>
        <FavoriteToggle productId={product.id} locale={locale} toastProduct={{ title: productTitle, image: imageSet[0] ?? null }} className="inline-flex size-[18px] items-center justify-center text-midnight-ink transition-colors hover:text-hover-cream focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-2" />
      </nav>

      <section className="grid items-start gap-[34px] min-[901px]:grid-cols-[minmax(0,1.35fr)_minmax(360px,.65fr)] min-[901px]:gap-[clamp(48px,5vw,84px)] max-[900px]:grid-cols-1 max-[1100px]:min-[901px]:grid-cols-[minmax(0,1fr)_380px] max-[1100px]:min-[901px]:gap-9 min-[1201px]:grid-cols-[minmax(0,1.75fr)_minmax(460px,.7fr)] min-[1201px]:gap-[clamp(32px,2.5vw,48px)]" aria-labelledby="product-title">
        <div className="min-w-0 max-[900px]:contents">
          <div className="min-w-0 max-[900px]:order-2">
            <ProductGallery key={`${product.id}-${activeVariant?.id ?? 'base'}`} images={imageSet} title={productTitle} productId={product.id} videoId={product.youtubeVideoId} locale={locale} shadePreview={shadePreview} shadePreviewMore={Math.max(0, colorVariants.length - 3)} shadePickerLabel={text.quickShade} onOpenShades={openColorPicker} toastImage={imageSet[0] ?? null} />
          </div>
          <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-3 max-[900px]:order-3 max-[600px]:hidden min-[1201px]:mt-8" aria-label={text.benefits}>
            <div className="flex items-start gap-3 max-[600px]:flex-col max-[600px]:gap-1"><BadgeCheck className="mt-0.5 size-6 shrink-0 max-[600px]:size-5" strokeWidth={1.4} /><p className="m-0 text-sm leading-5 max-[600px]:text-[10px] max-[600px]:leading-[1.35]">{text.quality}</p></div>
            <div className="flex items-start gap-3 max-[600px]:flex-col max-[600px]:gap-1"><Truck className="mt-0.5 size-6 shrink-0 max-[600px]:size-5" strokeWidth={1.4} /><p className="m-0 text-sm leading-5 max-[600px]:text-[10px] max-[600px]:leading-[1.35]">{text.freeDelivery}<br />{locale === 'ro' ? 'pentru comenzi de peste 500 MDL' : 'от 500 MDL'}</p></div>
            <div className="flex items-start gap-3 max-[600px]:flex-col max-[600px]:gap-1"><Store className="mt-0.5 size-6 shrink-0 max-[600px]:size-5" strokeWidth={1.4} /><p className="m-0 text-sm leading-5 max-[600px]:text-[10px] max-[600px]:leading-[1.35]">{text.pickup}<br />Shopping Malldova</p></div>
          </div>
          <div className="mt-16 hidden min-[901px]:block min-[1201px]:mt-20">
            <div className="border-t border-black/10">
              {descriptionHtml?.trim() ? (
                <button
                  ref={descriptionTriggerRef}
                  aria-controls={isDescriptionDrawerOpen ? 'product-description-drawer' : undefined}
                  aria-expanded={isDescriptionDrawerOpen}
                  aria-haspopup="dialog"
                  className="flex w-full cursor-pointer items-center justify-between gap-5 border-b border-black/10 py-[22px] text-left text-sm leading-[1.4] font-medium tracking-[.04em] focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-2"
                  onClick={() => setIsDescriptionDrawerOpen(true)}
                  type="button"
                >
                  {text.description}
                  <ArrowRight className="size-4 shrink-0 text-graphite" strokeWidth={1.4} />
                </button>
              ) : null}
              <DetailAccordion title={text.usage} html={product.instruction} />
              <DetailAccordion title={text.ingredients} html={product.components} />
              <DetailAccordion title={product.brand ? `${text.aboutBrand} ${product.brand}` : text.aboutBrand} html={product.brandDescription} />
            </div>
            {product.features.length ? (
              <section className="mt-16" aria-label={text.detailedCharacteristics}>
                <p className="mb-3 text-[11px] font-medium tracking-[.15em] text-graphite uppercase">{text.characteristics}</p>
                <h2 className="mb-6 text-2xl font-medium tracking-[-.025em]">{text.detailedCharacteristics}</h2>
                <dl className="grid grid-cols-2 gap-x-8 gap-y-0">
                  {product.features.map((feature, index) => (
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 border-b border-black/10 py-5 text-sm" key={`desktop-${feature.name}-${index}`}>
                      <dt className="flex min-w-0 items-baseline gap-2 text-graphite after:mt-0 after:min-w-3 after:flex-1 after:border-b after:border-dotted after:border-ash">{feature.name}</dt>
                      <dd className="m-0 min-w-0 [overflow-wrap:anywhere]">{feature.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}
          </div>
        </div>

        <div className="min-w-0 min-[901px]:sticky min-[901px]:top-[96px] max-[900px]:contents min-[1201px]:pr-[2vw]">
          <div className="border-b border-black/10 pb-[22px] max-[900px]:order-1 max-[600px]:border-0 max-[600px]:pb-1">
          {categoryTitle ? <p className="mb-1 text-[13px] leading-4 font-medium tracking-[1.4px] text-midnight-ink uppercase max-[767px]:hidden min-[901px]:mt-[15px]">{categoryTitle}</p> : null}
          {brandTitle && product.brandId ? (
            <Link className="mb-2 inline-flex text-[14px] leading-[18px] font-medium text-graphite transition-colors hover:text-hover-cream max-[767px]:text-[10px] max-[767px]:leading-[13px]" href={`/${locale}/brands/${product.brandId}`}>
              {brandTitle}
            </Link>
          ) : brandTitle ? (
            <p className="mb-2 text-[14px] leading-[18px] font-medium text-graphite max-[767px]:text-[10px] max-[767px]:leading-[13px]">{brandTitle}</p>
          ) : null}
          <h1 id="product-title" className="m-0 block max-w-[560px] text-[36px] leading-[1.08] font-normal tracking-[-.045em] text-midnight-ink max-[767px]:!text-[22px] max-[767px]:!leading-[26px] min-[1201px]:text-[32px]">
            {productTitle}
          </h1>
          </div>

          <div className="pt-6 max-[900px]:order-4 max-[600px]:pt-2">

          {product.offer ? <ProductPromotion offer={product.offer} locale={locale} /> : null}

          <div className="mb-6">
            <ProductPriceSummary product={purchaseProduct} isB2B={isB2B} />
          </div>

          {colorVariants.length ? (
            <fieldset className="mb-7 min-w-0">
              <legend className="sr-only">{text.shade}</legend>
              <div className="mb-3 flex items-center justify-between gap-4">
                <span className="min-w-0 truncate text-[15px] leading-5 font-medium tracking-[.12em] text-midnight-ink uppercase">
                  {shadeLabel(activeColorVariant, text.chooseShade)}
                </span>
                <button
                  className="inline-flex shrink-0 items-center gap-2 text-[13px] leading-4 font-medium text-black underline decoration-1 underline-offset-2 transition-colors hover:text-hover-cream focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-2"
                  type="button"
                  onClick={openColorPicker}
                  aria-expanded={isColorPickerOpen}
                  aria-controls={isColorPickerOpen ? 'product-color-drawer' : undefined}
                >
                  {text.allShades} {colorVariants.length} {text.shadeCountSuffix}
                  <ChevronDown className="size-4" strokeWidth={1.5} />
                </button>
              </div>
              <div className="flex min-w-0 items-center gap-[14px] overflow-x-auto overflow-y-hidden pt-8 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-[600px]:gap-1 max-[600px]:pt-1" role="group" aria-label={text.quickShade}>
                {colorVariants.slice(0, 9).map((variant) => {
                  const selected = variant.id === activeVariantId
                  const label = shadeLabel(variant, text.shade)
                  const swatch = colorStops(variant)
                  return (
                    <button
                      className="group relative grid size-11 shrink-0 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-2 max-[600px]:size-[58px]"
                      type="button"
                      key={variant.id}
                      onClick={() => setActiveVariantId(variant.id)}
                      aria-label={label}
                      aria-pressed={selected}
                      disabled={variant.quantity <= 0 || !hasPrice(variant)}
                      title={label}
                    >
                      <span className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-20 hidden -translate-x-1/2 whitespace-nowrap rounded-[2px] bg-[#111] px-2 py-1 text-[10px] leading-none font-medium text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 min-[601px]:block max-[600px]:hidden">{label}</span>
                      <span className={`grid size-9 shrink-0 place-items-center rounded-full transition-shadow max-[600px]:size-[50px] ${selected ? 'ring-1 ring-midnight-ink ring-offset-1' : 'group-hover:ring-1 group-hover:ring-midnight-ink/50'}`} style={swatch ? { background: swatch } : undefined} aria-hidden="true">
                        {swatch ? <span className="size-full rounded-full border border-black/10" /> : <span className="max-w-10 truncate text-[8px] leading-none text-midnight-ink">{label}</span>}
                      </span>
                    </button>
                  )
                })}
              </div>
            </fieldset>
          ) : null}

          {volumeVariants.length ? (
            <fieldset className="mb-6">
              <legend className="sr-only">{text.volume}</legend>
              <div className="flex flex-wrap items-center gap-3">
                {volumeVariants.map((variant) => {
                  const selected = variant.id === activeVariantId
                  const available = variant.quantity > 0 && hasPrice(variant)
                  const volumeValue = variant.volume.trim()
                  const volumeAmount = volumeParts(volumeValue).amount
                  return (
                    <button
                      className={`relative grid size-[50px] shrink-0 place-items-center border text-[11px] leading-none font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-2 disabled:cursor-not-allowed ${!available ? 'border-[#b3b3b3] bg-white text-[#b3b3b3]' : selected ? 'border-midnight-ink bg-white text-midnight-ink' : 'border-[#b3b3b3] bg-white text-midnight-ink hover:border-hover-cream hover:bg-button-hover/20'}`}
                      type="button"
                      key={variant.id}
                      onClick={() => setActiveVariantId(variant.id)}
                      aria-pressed={selected}
                      disabled={!available}
                      aria-label={`${volumeValue} ${text.volume}${available ? '' : `, ${text.outOfStock}`}`}
                      title={available ? volumeValue : text.outOfStock}
                    >
                      <span className="whitespace-nowrap text-[13px] font-normal">{volumeAmount}</span>
                      {!available ? <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,transparent_49%,#b3b3b3_50%,transparent_51%)]" /> : null}
                    </button>
                  )
                })}
                <span className="text-[14px] leading-5 font-medium">{volumeUnitLabel}</span>
              </div>
            </fieldset>
          ) : selectedVolume ? (
            <div className="mb-6 flex items-center gap-4">
              <span className="inline-flex size-[50px] shrink-0 items-center justify-center border border-midnight-ink bg-white text-[13px] leading-none font-normal">{selectedVolumeParts?.amount ?? selectedVolume}</span>
              <span className="text-[14px] leading-5 font-medium">{volumeUnitLabel}</span>
            </div>
          ) : null}

          <ProductPurchase product={purchaseProduct} isB2B={isB2B} showSummary={false} stickyOnMobile />

          <dl className="my-[26px] flex flex-col gap-1">
            {[
              { name: text.article, value: selectedSku },
              ...(product.barcode ? [{ name: text.barcode, value: product.barcode }] : []),
              ...(genderLabel ? [{ name: text.gender, value: genderLabel }] : []),
              ...(selectedVolume ? [{ name: text.volume, value: selectedVolume }] : []),
            ]
              .filter((item): item is { name: string; value: string } => Boolean(item.name && item.value))
              .map((item, index) => (
                <div className={`grid min-h-[42px] grid-cols-[minmax(90px,.7fr)_minmax(0,1.3fr)] items-center gap-[18px] rounded-[9px] px-[13px] py-[10px] text-xs ${index % 2 === 0 ? 'bg-[#f7f7f7]' : 'bg-white'}`} key={`${item.name}-${index}`}>
                  <dt className="min-w-0 text-black/50">{item.name}</dt>
                  <dd className="m-0 min-w-0 text-right [overflow-wrap:anywhere]">{item.value}</dd>
                </div>
              ))}
          </dl>

          <div className="mt-7 border-t border-black/10 max-[900px]:block min-[901px]:hidden">
            {descriptionHtml?.trim() ? (
              <button
                ref={descriptionTriggerRef}
                aria-controls={isDescriptionDrawerOpen ? 'product-description-drawer' : undefined}
                aria-expanded={isDescriptionDrawerOpen}
                aria-haspopup="dialog"
                className="flex w-full cursor-pointer items-center justify-between gap-5 border-b border-black/10 py-[18px] text-left text-xs leading-[1.4] font-medium tracking-[.04em] focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-2"
                onClick={() => setIsDescriptionDrawerOpen(true)}
                type="button"
              >
                {text.description}
                <ArrowRight className="size-4 shrink-0 text-graphite" strokeWidth={1.4} />
              </button>
            ) : null}
            <DetailAccordion title={text.usage} html={product.instruction} />
            <DetailAccordion title={text.ingredients} html={product.components} />
            <DetailAccordion title={product.brand ? `${text.aboutBrand} ${product.brand}` : text.aboutBrand} html={product.brandDescription} />
          </div>

          {product.features.length ? (
            <section className="mt-8 max-[900px]:block min-[901px]:hidden" aria-label={text.detailedCharacteristics}>
              <p className="mb-3 text-[11px] font-medium tracking-[.15em] text-graphite uppercase">{text.characteristics}</p>
              <h2 className="mb-4 text-lg font-medium tracking-[-.025em]">{text.detailedCharacteristics}</h2>
              <dl className="flex flex-col gap-1">
                {product.features.map((feature, index) => (
                  <div className={`grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 rounded-[9px] px-[13px] py-3 text-xs ${index % 2 === 0 ? 'bg-[#f7f7f7]' : 'bg-white'}`} key={`${feature.name}-${index}`}>
                    <dt className="flex min-w-0 items-baseline gap-2 text-graphite after:mt-0 after:min-w-3 after:flex-1 after:border-b after:border-dotted after:border-ash">{feature.name}</dt>
                    <dd className="m-0 min-w-0 [overflow-wrap:anywhere]">{feature.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          <div className="hidden max-[600px]:grid max-[600px]:grid-cols-3 max-[600px]:gap-2 max-[600px]:border-t max-[600px]:border-fog max-[600px]:pt-5" aria-label={text.benefits}>
            <div className="flex flex-col items-start gap-1"><BadgeCheck className="size-5 shrink-0" strokeWidth={1.4} /><p className="m-0 text-[10px] leading-[1.35]">{text.quality}</p></div>
            <div className="flex flex-col items-start gap-1"><Truck className="size-5 shrink-0" strokeWidth={1.4} /><p className="m-0 text-[10px] leading-[1.35]">{text.freeDelivery}<br />{locale === 'ro' ? 'pentru comenzi de peste 500 MDL' : 'от 500 MDL'}</p></div>
            <div className="flex flex-col items-start gap-1"><Store className="size-5 shrink-0" strokeWidth={1.4} /><p className="m-0 text-[10px] leading-[1.35]">{text.pickup}<br />Shopping Malldova</p></div>
          </div>

          <Link className="mt-8 flex w-fit items-center gap-4 rounded-md py-3 transition-colors hover:text-hover-cream" href={locale === 'ro' ? '/ro/contacte' : '/ru/kontaktyi'}>
            <span className="flex size-12 items-center justify-center rounded-full border border-midnight-ink"><CircleHelp className="size-5" strokeWidth={1.4} /></span>
            <span className="flex flex-col gap-1"><span className="text-xs text-graphite">{text.needHelp}</span><span className="text-base">{text.support}</span></span>
            <ArrowRight className="ml-2 size-4" strokeWidth={1.4} />
          </Link>
          </div>
        </div>
      </section>

      {product.brandId || categoryPath.length ? (
        <section className="mx-auto mt-20 w-full max-w-[1440px] border-t border-fog pt-12 lg:mt-28" aria-labelledby="product-links-title">
          <h2 className="mb-7 text-center text-2xl font-medium tracking-[-.035em] sm:text-4xl" id="product-links-title">{text.seeMore}</h2>
          <div className="flex flex-wrap justify-center gap-3 max-[600px]:w-full max-[600px]:flex-nowrap max-[600px]:justify-start max-[600px]:overflow-x-auto max-[600px]:overscroll-x-contain max-[600px]:touch-pan-x max-[600px]:snap-x max-[600px]:snap-mandatory max-[600px]:pb-3 max-[600px]:[scrollbar-width:none] max-[600px]:[&::-webkit-scrollbar]:hidden">
            {product.brandId ? (
              <Link className="group flex min-h-[72px] items-center gap-3 rounded-full border border-fog pr-5 text-sm transition-colors hover:border-hover-cream hover:bg-button-hover/20 max-[600px]:shrink-0 max-[600px]:snap-start" href={`/${locale}/brands/${product.brandId}`}>
                <span className="flex size-[70px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-mist">
                  {product.brandImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="size-full object-contain p-2" src={legacyAsset(product.brandImage, 'brands') ?? ''} alt="" />
                  ) : <PackageCheck className="size-5" strokeWidth={1.4} />}
                </span>
                <span className="transition-colors group-hover:text-hover-cream">{product.brand}</span>
              </Link>
            ) : null}
            {categoryPath.map((category) => (
              <Link className="group flex min-h-[72px] items-center gap-3 rounded-full border border-fog pr-5 text-sm transition-colors hover:border-hover-cream hover:bg-button-hover/20 max-[600px]:shrink-0 max-[600px]:snap-start" href={`${locale === 'ro' ? '/ro/catalog' : '/ru/katalog'}/${encodeURIComponent(category.uri!)}`} key={category.id}>
                <span className="flex size-[70px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-mist">
                  {category.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="size-full object-cover" src={legacyAsset(category.image, 'categories') ?? ''} alt="" />
                  ) : <PackageCheck className="size-5" strokeWidth={1.4} />}
                </span>
                <span className="transition-colors group-hover:text-hover-cream">{category.title}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <AnimatePresence initial={false} mode="wait">
      {isDescriptionDrawerOpen ? (
        <motion.div
          key="description"
          className="fixed inset-0 z-[125] flex justify-end"
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
          <button className="absolute inset-0 cursor-default bg-black/35" type="button" onClick={() => setIsDescriptionDrawerOpen(false)} aria-label={text.closeDescription} />
          <motion.aside
            className="relative z-10 flex h-dvh w-[48vw] max-w-none flex-col bg-white shadow-[-18px_0_48px_rgba(0,0,0,.12)] max-[600px]:w-full"
            id="product-description-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-description-drawer-title"
            initial={reduceMotion ? { x: 0 } : { x: '100%' }}
            animate={{ x: 0 }}
            exit={reduceMotion ? { x: 0 } : { x: '100%' }}
            transition={{ duration: reduceMotion ? 0 : 0.48, ease: [0.16, 1, 0.3, 1] }}
          >
            <header className="grid min-h-[64px] shrink-0 grid-cols-[minmax(0,1fr)_44px] items-center border-b border-[#eeeeee] px-6">
              <h2 className="m-0 text-[16px] leading-5 font-medium text-midnight-ink" id="product-description-drawer-title">{text.description}</h2>
              <button ref={descriptionCloseRef} className="inline-flex size-10 items-center justify-center text-midnight-ink transition-colors hover:text-hover-cream focus-visible:outline-2 focus-visible:outline-hover-cream" type="button" onClick={() => setIsDescriptionDrawerOpen(false)} aria-label={text.closeDescription}>
                <X className="size-5" strokeWidth={1.5} />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-7 sm:px-9 sm:py-9">
              <RichText html={descriptionHtml} />
            </div>
          </motion.aside>
        </motion.div>
      ) : null}

      {isColorPickerOpen ? (
        <motion.div
          key="colors"
          className="fixed inset-0 z-[120] flex justify-end"
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
          <button className="absolute inset-0 cursor-default bg-black/35" type="button" onClick={() => { setIsColorPickerOpen(false); setColorSearch('') }} aria-label={text.closeShade} />
          <motion.aside
            className="relative z-10 flex h-dvh w-[48vw] flex-col bg-white shadow-[-18px_0_48px_rgba(0,0,0,.12)] max-[600px]:w-full"
            id="product-color-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-color-drawer-title"
            initial={reduceMotion ? { x: 0 } : { x: '100%' }}
            animate={{ x: 0 }}
            exit={reduceMotion ? { x: 0 } : { x: '100%' }}
            transition={{ duration: reduceMotion ? 0 : 0.48, ease: [0.16, 1, 0.3, 1] }}
          >
            <header className="grid min-h-[58px] shrink-0 grid-cols-[40px_minmax(0,1fr)_40px] items-center border-b border-[#eeeeee] px-5">
              <button className="inline-flex size-10 items-center justify-start text-midnight-ink transition-colors hover:text-hover-cream focus-visible:outline-2 focus-visible:outline-hover-cream" type="button" onClick={() => { setIsColorPickerOpen(false); setColorSearch('') }} aria-label={text.closeShade}>
                <ChevronLeft className="size-5" strokeWidth={1.5} />
              </button>
              <h2 className="m-0 text-center text-[15px] leading-5 font-medium text-midnight-ink" id="product-color-drawer-title">{text.drawerShade}</h2>
              <span aria-hidden="true" />
            </header>

            <label className="mx-6 mt-4 flex h-[48px] shrink-0 items-center gap-3 border-b border-[#eeeeee]">
              <input
                ref={colorSearchRef}
                className="min-w-0 flex-1 bg-transparent text-[15px] leading-5 text-midnight-ink outline-none placeholder:text-[#d2d2d2]"
                type="search"
                value={colorSearch}
                onChange={(event) => setColorSearch(event.target.value)}
                placeholder={text.searchShade}
                aria-label={text.shadeSearch}
              />
              <Search className="size-5 shrink-0 text-[#b9b9b9]" strokeWidth={1.5} aria-hidden="true" />
            </label>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-2 pb-[max(16px,env(safe-area-inset-bottom))]">
              {filteredColorVariants.length ? filteredColorVariants.map((variant) => {
                const selected = variant.id === activeVariantId
                const label = shadeLabel(variant, text.shade)
                const swatch = colorStops(variant)
                return (
                  <button
                    className="flex min-h-[70px] w-full items-center gap-4 border-b border-[#f1f1f1] text-left text-[15px] text-midnight-ink transition-colors hover:bg-[#f7f7f7] disabled:cursor-not-allowed disabled:opacity-45"
                    type="button"
                    key={variant.id}
                    onClick={() => { setActiveVariantId(variant.id); setIsColorPickerOpen(false); setColorSearch('') }}
                    aria-pressed={selected}
                    disabled={variant.quantity <= 0 || !hasPrice(variant)}
                  >
                    <span className={`grid size-[52px] shrink-0 place-items-center rounded-full ${selected ? 'border border-midnight-ink p-[2px]' : ''}`}>
                      {swatch ? <span className="size-[46px] rounded-full border border-black/10" style={{ background: swatch }} aria-hidden="true" /> : null}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                    {selected ? <span className="sr-only">{text.selected}</span> : null}
                    {variant.quantity <= 0 || !hasPrice(variant) ? <span className="text-xs text-graphite">{text.outOfStock}</span> : null}
                  </button>
                )
              }) : <p className="px-1 py-6 text-sm text-graphite">{text.noShades}</p>}
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
      </AnimatePresence>

      {product.brandProducts.length ? (
        <ProductRail title={`${text.collection} ${product.brand ?? (locale === 'ro' ? 'brandului' : 'бренда')}`} products={product.brandProducts} />
      ) : null}

      <ProductRail title={text.similar} products={product.similarProducts} />
      <ProductRail title={text.oftenTogether} products={product.frequentlyBoughtProducts} />
    </main>
  )
}
