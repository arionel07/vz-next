'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, type PanInfo, useReducedMotion } from 'motion/react'
import { createPortal } from 'react-dom'
import { LocalizedLink as Link } from '@/components/site/localized-link'
import { ArrowRight, ChevronDown, ChevronUp, Minus, Plus, X } from 'lucide-react'

import { addValidatedCartItem } from '@/lib/cart-actions'
import { formatPrice } from '@/lib/format'
import { legacyAsset } from '@/lib/legacy-assets'
import type { CatalogCardVariant, CatalogProduct } from '@/lib/catalog'
import { useCartStore } from '@/store/cart-store'
import { CartIcon } from './cart-icon'
import { FavoriteToggle } from './favorite-toggle'

function variantCurrentPrice(variant: CatalogCardVariant) {
  return variant.discountPrice && variant.discountPrice > 0 ? variant.discountPrice : variant.price
}

function getVariantColors(variant: CatalogCardVariant) {
  const colors: string[] = []
  if (variant.colorHex && /^#[\da-f]{6}$/i.test(variant.colorHex)) colors.push(variant.colorHex)
  try {
    const parsed: unknown = JSON.parse(variant.colorData ?? '')
    const rawColors = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === 'object' && 'colors' in parsed
        ? (parsed as { colors?: unknown }).colors
        : []
    if (Array.isArray(rawColors)) {
      for (const color of rawColors) {
        if (typeof color === 'string' && /^#[\da-f]{6}$/i.test(color) && !colors.includes(color)) colors.push(color)
        if (colors.length >= 6) break
      }
    }
  } catch {
    // Legacy color data is optional and may contain invalid JSON.
  }
  return colors
}

function variantColorBackground(variant: CatalogCardVariant | null) {
  const colors = variant ? getVariantColors(variant) : []
  if (!colors.length) return '#f3d3b8'
  if (colors.length === 1) return colors[0]
  return 'conic-gradient(' + colors.map((color, index) =>
    color + ' ' + (index / colors.length) * 360 + 'deg ' + ((index + 1) / colors.length) * 360 + 'deg',
  ).join(', ') + ')'
}

function colorOptionLabel(variant: CatalogCardVariant, index: number) {
  const label = variant.color?.trim()
    .replace(/\s*\(?\s*\d+(?:[.,]\d+)?\s*(?:ml|мл)\.?\)?\s*$/i, '')
    .trim()
  return label || String(index + 1)
}

function optionLabel(variant: CatalogCardVariant, kind: 'color' | 'volume' = 'volume') {
  if (kind === 'color') return variant.color || variant.volume || 'Оттенок'
  if (variant.volume) {
    const volume = variant.volume.match(/[\d]+(?:[.,][\d]+)?/)
    if (volume) return volume[0].replace(',', '.')
  }
  return variant.color || variant.volume || 'Вариант'
}

function getOptionKind(variants: CatalogCardVariant[]) {
  return variants.some((variant) => variant.color?.trim() || getVariantColors(variant).length)
    ? 'color'
    : 'volume'
}

function isMakeupProduct(product: Pick<CatalogProduct, 'category' | 'title'>) {
  return /макияж|губ|помад|тональн|тушь|тени|румян|консилер|палетк|карандаш|пудр|хайлайтер|бров|make[\s-]?up|lipstick|\blip\b|foundation|mascara|eyeshadow|blush|concealer|powder|eyebrow|machiaj|ruj|fond de ten|fard|rimel|pudr[ăa]|corector|sprâncene/i.test(`${product.category ?? ''} ${product.title ?? ''}`)
}

function variantColorKey(variant: CatalogCardVariant) {
  return getVariantColors(variant).join(',') || variant.color?.trim() || ''
}

function volumeParts(value: string) {
  const match = value.match(/^\s*([\d]+(?:[.,][\d]+)?)\s*(.*)$/)
  return { amount: match?.[1]?.replace(',', '.') ?? value, unit: match?.[2]?.trim() ?? '' }
}

function plainDescription(value: string) {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?\s*>|<\/(?:p|div|li|h[1-6])\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function ProductQuickView({
  product,
  selectedVariant,
  onSelectVariant,
  onClose,
  onAdd,
  isAdding,
}: {
  product: CatalogProduct
  selectedVariant: CatalogCardVariant | null
  onSelectVariant: (id: number) => void
  onClose: () => void
  onAdd: () => void
  isAdding: boolean
}) {
  const variants = product.variants ?? []
  const reduceMotion = useReducedMotion()
  const [isMobileViewport, setIsMobileViewport] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches)
  const [isClosing, setIsClosing] = useState(false)
  const makeupProduct = isMakeupProduct(product)
  const colorChoices = variants
    .filter((variant) => variantColorKey(variant) && (!makeupProduct || getVariantColors(variant).length > 0))
    .filter((variant, index, all) => all.findIndex((candidate) => variantColorKey(candidate) === variantColorKey(variant)) === index)
  const volumeOptions = Array.from(new Set(variants.map((variant) => variant.volume?.trim()).filter((value): value is string => Boolean(value))))
  const galleryImages = selectedVariant?.images.length
    ? selectedVariant.images
    : product.gallery?.length
      ? product.gallery
      : product.image
        ? [product.image]
        : []
  const [galleryIndex, setGalleryIndex] = useState(0)
  const [isColorSelectOpen, setColorSelectOpen] = useState(false)
  const [colorSelectOpensUp, setColorSelectOpensUp] = useState(false)
  const [colorSelectMenuHeight, setColorSelectMenuHeight] = useState(240)
  const [description, setDescription] = useState<string | null>(null)
  const colorSelectOpenRef = useRef(false)
  const colorSelectRef = useRef<HTMLDivElement>(null)
  const mobileColorSelectRef = useRef<HTMLDivElement>(null)
  const mobileColorDrawerRef = useRef<HTMLDivElement>(null)
  const desktopColorSelectTriggerRef = useRef<HTMLButtonElement>(null)
  const mobileColorSelectTriggerRef = useRef<HTMLButtonElement>(null)
  const colorOptionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const colorDrawerDirection = useRef(1)
  const closeTimerRef = useRef<number | null>(null)
  const isMobileQuickView = isMobileViewport
  const imageUrl = legacyAsset(galleryImages[galleryIndex] ?? galleryImages[0])
  const selectedPrice = selectedVariant ? variantCurrentPrice(selectedVariant) : (product.discountPrice || product.price)
  const originalPrice = selectedVariant?.discountPrice && selectedVariant.price && selectedVariant.discountPrice < selectedVariant.price
    ? selectedVariant.price
    : product.discountPrice && product.price && product.discountPrice < product.price
      ? product.price
      : null
  const discountPercent = originalPrice && selectedPrice && originalPrice > selectedPrice
    ? Math.round(((originalPrice - selectedPrice) / originalPrice) * 100)
    : 0
  const selectedColorKey = selectedVariant ? variantColorKey(selectedVariant) : ''
  const activeVolume = selectedVariant?.volume?.trim() ?? product.volume?.trim() ?? volumeOptions[0] ?? ''
  const activeColorVariant = colorChoices.find((variant) =>
    variantColorKey(variant) === selectedColorKey &&
    (!activeVolume || variant.volume?.trim() === activeVolume),
  ) ?? colorChoices.find((variant) => variantColorKey(variant) === selectedColorKey) ?? colorChoices[0]
  const activeColorChoiceIndex = Math.max(0, colorChoices.findIndex((variant) =>
    variantColorKey(variant) === variantColorKey(activeColorVariant ?? selectedVariant ?? colorChoices[0]),
  ))
  const activeVolumeParts = activeVolume ? volumeParts(activeVolume) : null
  const selectedColorBackground = variantColorBackground(activeColorVariant)
  const thumbnailStart = Math.min(galleryIndex, Math.max(0, galleryImages.length - 3))

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const updateViewport = () => setIsMobileViewport(media.matches)
    updateViewport()
    media.addEventListener('change', updateViewport)
    return () => media.removeEventListener('change', updateViewport)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const locale = product.locale ?? 'ru'
    fetch(`/api/products/${product.id}/description?locale=${locale}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<{ description?: string | null }> : null)
      .then((payload) => setDescription(payload?.description?.trim() || null))
      .catch(() => { if (!controller.signal.aborted) setDescription(null) })
    return () => controller.abort()
  }, [product.id, product.locale])

  const descriptionPreview = description ? plainDescription(description) : ''

  const requestClose = useCallback(() => {
    if (isClosing) return
    if (reduceMotion) {
      onClose()
      return
    }
    setIsClosing(true)
    closeTimerRef.current = window.setTimeout(onClose, 480)
  }, [isClosing, onClose, reduceMotion])

  useEffect(() => () => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current)
  }, [])

  const setColorSelect = useCallback((open: boolean) => {
    colorSelectOpenRef.current = open
    colorDrawerDirection.current = open ? 1 : -1
    setColorSelectOpen(open)
  }, [])

  const focusColorOption = (index: number) => {
    const safeIndex = Math.max(0, Math.min(colorChoices.length - 1, index))
    colorOptionRefs.current[safeIndex]?.focus()
  }

  const handleMobileQuickViewDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) requestClose()
  }

  const openColorSelect = () => {
    const isMobile = window.matchMedia('(max-width: 767px)').matches
    if (isMobile) {
      setColorSelectOpensUp(false)
      setColorSelect(true)
      requestAnimationFrame(() => {
        mobileColorDrawerRef.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus()
      })
      return
    }

    const triggerBounds = desktopColorSelectTriggerRef.current?.getBoundingClientRect()
    const desiredHeight = Math.min(colorChoices.length * 60 + 24, 280)
    const sheetBounds = mobileColorSelectRef.current?.closest('[role="dialog"]')?.getBoundingClientRect()
    const roomBelow = triggerBounds
      ? sheetBounds ? sheetBounds.bottom - triggerBounds.bottom - 96 : window.innerHeight - triggerBounds.bottom
      : window.innerHeight
    const roomAbove = triggerBounds
      ? sheetBounds ? triggerBounds.top - sheetBounds.top : triggerBounds.top
      : 0
    const opensUp = roomBelow < desiredHeight + 24 && roomAbove > roomBelow
    const availableHeight = opensUp ? roomAbove : roomBelow
    setColorSelectOpensUp(opensUp)
    setColorSelectMenuHeight(Math.max(120, Math.min(desiredHeight, availableHeight - 12)))
    setColorSelect(true)
    requestAnimationFrame(() => focusColorOption(activeColorChoiceIndex))
  }

  useEffect(() => setGalleryIndex(0), [selectedVariant?.id])

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (colorSelectOpenRef.current) {
        event.preventDefault()
        event.stopPropagation()
        setColorSelect(false)
        if (window.matchMedia('(max-width: 767px)').matches) mobileColorSelectTriggerRef.current?.focus()
        else desktopColorSelectTriggerRef.current?.focus()
        return
      }
      requestClose()
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [requestClose, setColorSelect])

  useEffect(() => {
    if (!isColorSelectOpen) return
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !colorSelectRef.current?.contains(event.target) && !mobileColorSelectRef.current?.contains(event.target) && !mobileColorDrawerRef.current?.contains(event.target)) setColorSelect(false)
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer)
  }, [isColorSelectOpen, setColorSelect])

  useEffect(() => {
    if (makeupProduct && selectedVariant && !getVariantColors(selectedVariant).length && colorChoices[0]) {
      onSelectVariant(colorChoices[0].id)
    }
  }, [colorChoices, makeupProduct, onSelectVariant, selectedVariant])

  return typeof document !== 'undefined' ? createPortal((
    <motion.div
      className="fixed inset-0 z-[100] flex justify-end max-[767px]:items-end"
      initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 1, y: 0 } : isMobileQuickView ? { opacity: 0, y: '100%' } : { opacity: 0, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.42, ease: [0.22, 1, 0.36, 1] }}
    >
      <button aria-label="Закрыть быстрый просмотр" className="absolute inset-0 cursor-default bg-black/30" onClick={requestClose} type="button" />
      <motion.section
        aria-labelledby="quick-view-title"
        aria-modal="true"
        className="relative flex h-dvh w-full flex-col overflow-y-auto bg-white shadow-2xl min-[768px]:w-[48vw] min-[768px]:max-w-none max-[767px]:touch-none max-[767px]:h-[78dvh] max-[767px]:max-h-[calc(100dvh-24px)] max-[767px]:min-h-[480px] max-[767px]:overflow-hidden max-[767px]:rounded-t-[22px]"
        role="dialog"
        initial={reduceMotion ? { x: 0, y: 0 } : isMobileQuickView ? { x: 0, y: '100%' } : { x: '100%', y: 0 }}
        animate={isClosing ? isMobileQuickView ? { x: 0, y: '100%' } : { x: '100%', y: 0 } : { x: 0, y: 0 }}
        exit={reduceMotion ? { x: 0, y: 0 } : isMobileQuickView ? { x: 0, y: '100%' } : { x: '100%', y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.48, ease: [0.16, 1, 0.3, 1] }}
        drag={isMobileQuickView ? 'y' : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={isMobileQuickView ? handleMobileQuickViewDragEnd : undefined}
      >
        <button
          aria-label={product.locale === 'ro' ? 'Închide' : 'Закрыть'}
          className="absolute top-7 right-7 z-30 inline-flex size-10 items-center justify-center text-midnight-ink transition-colors hover:text-hover-cream focus-visible:outline-2 focus-visible:outline-hover-cream max-[767px]:hidden"
          onClick={requestClose}
          type="button"
        >
          <X className="size-5" strokeWidth={1.5} />
        </button>

        <div className="hidden w-full justify-center pt-3 max-[767px]:flex" aria-hidden="true"><span className="h-1 w-10 rounded-full bg-black/20" /></div>

        <div className="absolute top-[80px] right-20 left-20 z-20 max-[767px]:hidden">
          {product.category ? <p className="m-0 text-[10px] leading-[14px] font-semibold tracking-[.12em] text-midnight-ink uppercase">{product.category}</p> : null}
          <h2 className="mt-3 mb-0 max-w-[610px] pr-12 text-[34px] leading-[1.16] font-semibold text-midnight-ink max-[767px]:text-[25px] max-[767px]:leading-[1.16]" id="quick-view-title">{product.title ?? 'Товар без названия'}</h2>
          {discountPercent > 0 ? <span className="absolute top-[42px] right-0 inline-flex min-w-8 items-center justify-center bg-[#8e1f2d] px-1.5 py-1 text-[11px] leading-none font-semibold text-white">{discountPercent}%</span> : null}
        </div>

        <div className="relative mt-[168px] flex h-[clamp(360px,53vh,520px)] shrink-0 items-center justify-center bg-[#f2f2f2] max-[767px]:hidden">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="h-auto w-auto max-h-[78%] max-w-[60%] object-contain mix-blend-multiply max-[767px]:max-w-[64%]" src={imageUrl} alt={product.title ?? 'Товар'} />
          ) : null}

          {galleryImages.length > 1 ? (
            <div className="absolute top-1/2 left-11 z-10 flex -translate-y-1/2 flex-col items-center gap-2 max-[767px]:top-auto max-[767px]:bottom-4 max-[767px]:left-1/2 max-[767px]:-translate-x-1/2 max-[767px]:translate-y-0 max-[767px]:flex-row">
              <button aria-label="Предыдущее изображение" className="inline-flex size-6 items-center justify-center text-midnight-ink/40 hover:text-midnight-ink" disabled={galleryIndex === 0} onClick={() => setGalleryIndex((index) => Math.max(0, index - 1))} type="button"><ChevronUp className="size-4 max-[767px]:-rotate-90" /></button>
              <div className="flex flex-col gap-2 max-[767px]:flex-row">
                {galleryImages.slice(thumbnailStart, thumbnailStart + 3).map((path, index) => {
                  const imageIndex = thumbnailStart + index
                  const thumbnailUrl = legacyAsset(path)
                  return thumbnailUrl ? (
                    <button aria-label={'Изображение ' + (imageIndex + 1)} aria-pressed={imageIndex === galleryIndex} className={'inline-flex size-[50px] items-center justify-center border bg-white/70 p-1 ' + (imageIndex === galleryIndex ? 'border-midnight-ink' : 'border-midnight-ink/40')} key={path + '-' + imageIndex} onClick={() => setGalleryIndex(imageIndex)} type="button">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img alt="" className="h-full w-full object-contain mix-blend-multiply" src={thumbnailUrl} />
                    </button>
                  ) : null
                })}
              </div>
              <button aria-label="Следующее изображение" className="inline-flex size-6 items-center justify-center text-midnight-ink/40 hover:text-midnight-ink" disabled={galleryIndex >= galleryImages.length - 1} onClick={() => setGalleryIndex((index) => Math.min(galleryImages.length - 1, index + 1))} type="button"><ChevronDown className="size-4 max-[767px]:-rotate-90" /></button>
            </div>
          ) : null}

          <Link className="absolute right-20 bottom-7 inline-flex items-center gap-2 text-[10px] leading-none font-semibold tracking-[.1em] text-midnight-ink uppercase transition-colors hover:text-hover-cream focus-visible:outline-2 focus-visible:outline-hover-cream max-[767px]:right-5 max-[767px]:bottom-4" href={'/' + (product.locale === 'ro' ? 'ro/catalog' : 'ru/katalog') + '/product/' + product.id} onClick={requestClose}>
            {product.locale === 'ro' ? 'Mai multe detalii' : 'Подробнее'} <ArrowRight className="size-4" strokeWidth={1.5} />
          </Link>
        </div>

        <div className="px-20 pt-10 pb-12 max-[767px]:hidden">
          {activeVolumeParts ? (
            <div className="flex items-center gap-4">
              {volumeOptions.length > 1 ? volumeOptions.map((volume) => {
                const parts = volumeParts(volume)
                const active = volume === activeVolume
                return (
                  <button
                    aria-pressed={active}
                    className={'inline-flex size-[50px] shrink-0 items-center justify-center border text-[12px] leading-none font-medium transition-colors ' + (active ? 'border-midnight-ink text-midnight-ink' : 'border-midnight-ink/30 text-graphite hover:border-midnight-ink')}
                    key={volume}
                    onClick={() => {
                      const selectedColor = selectedVariant ? variantColorKey(selectedVariant) : ''
                      const matching = variants.find((variant) => variant.volume?.trim() === volume && (!selectedColor || variantColorKey(variant) === selectedColor))
                        ?? variants.find((variant) => variant.volume?.trim() === volume)
                      if (matching) onSelectVariant(matching.id)
                    }}
                    type="button"
                  >{parts.amount}</button>
                )
              }) : <span className="inline-flex size-[50px] shrink-0 items-center justify-center border border-midnight-ink text-[12px] leading-none font-medium text-midnight-ink">{activeVolumeParts.amount}</span>}
              <span className="text-[10px] leading-[1.4] font-semibold tracking-[.12em] text-midnight-ink uppercase">
                {activeVolumeParts.unit.toLowerCase().includes('g')
                  ? (product.locale === 'ro' ? 'Greutate / g' : 'Вес / г')
                  : (product.locale === 'ro' ? 'Volum / ml' : 'Объём / мл')}
              </span>
            </div>
          ) : null}

          {colorChoices.length ? (
            <div ref={colorSelectRef} className={(activeVolumeParts ? 'mt-8 ' : '') + 'relative'}>
              <button
                ref={desktopColorSelectTriggerRef}
                aria-label={product.locale === 'ro' ? 'Alege nuanța' : 'Выберите оттенок'}
                aria-controls={isColorSelectOpen ? 'quick-view-color-options' : undefined}
                aria-expanded={isColorSelectOpen}
                aria-haspopup="listbox"
                className="flex min-h-12 w-full items-center gap-4 border-b-2 border-midnight-ink pb-3 text-left focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-2"
                onClick={() => {
                  if (isColorSelectOpen) setColorSelect(false)
                  else openColorSelect()
                }}
                onKeyDown={(event) => {
                  if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return
                  event.preventDefault()
                  if (!isColorSelectOpen) {
                    openColorSelect()
                  } else {
                    focusColorOption(activeColorChoiceIndex + (event.key === 'ArrowDown' ? 1 : -1))
                  }
                }}
                type="button"
              >
                <span aria-hidden="true" className="size-10 shrink-0 rounded-full border border-black/5" style={{ background: selectedColorBackground }} />
                <span className="min-w-0 flex-1 truncate text-[20px] leading-6 font-medium text-hover-cream">{activeColorVariant ? colorOptionLabel(activeColorVariant, activeColorChoiceIndex) : ''}</span>
                <ChevronDown aria-hidden="true" className={'size-5 shrink-0 text-hover-cream transition-transform ' + (isColorSelectOpen ? 'rotate-180' : '')} strokeWidth={1.7} />
              </button>

              {isColorSelectOpen ? (
                <div
                  className={'absolute inset-x-0 z-40 max-h-[min(42vh,240px)] overflow-y-auto bg-white p-4 shadow-[0_18px_38px_rgba(0,0,0,.14)] ' + (colorSelectOpensUp ? 'bottom-full mb-3' : 'top-full mt-3')}
                  id="quick-view-color-options"
                  role="listbox"
                  aria-label={product.locale === 'ro' ? 'Nuanțe disponibile' : 'Доступные оттенки'}
                  style={{ height: `${colorSelectMenuHeight}px` }}
                >
                  {colorChoices.map((variant, index) => {
                    const selected = variantColorKey(variant) === variantColorKey(activeColorVariant ?? selectedVariant ?? colorChoices[0])
                    return (
                      <button
                        aria-selected={selected}
                        className="flex min-h-[60px] w-full items-center gap-5 px-2 text-left text-[20px] leading-6 text-midnight-ink transition-colors hover:bg-[#f8f6f4] focus-visible:bg-[#f8f6f4] focus-visible:outline-none"
                        key={variant.id}
                        onClick={() => {
                          const matching = colorChoices.find((candidate) => variantColorKey(candidate) === variantColorKey(variant) && (!selectedVariant?.volume || candidate.volume === selectedVariant.volume))
                            ?? variant
                          onSelectVariant(matching.id)
                          setColorSelect(false)
                          desktopColorSelectTriggerRef.current?.focus()
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                            event.preventDefault()
                            focusColorOption(index + (event.key === 'ArrowDown' ? 1 : -1))
                          } else if (event.key === 'Home' || event.key === 'End') {
                            event.preventDefault()
                            focusColorOption(event.key === 'Home' ? 0 : colorChoices.length - 1)
                          }
                        }}
                        ref={(element) => { colorOptionRefs.current[index] = element }}
                        role="option"
                        tabIndex={selected ? 0 : -1}
                        type="button"
                      >
                        <span aria-hidden="true" className="size-10 shrink-0 rounded-full border border-black/5" style={{ background: variantColorBackground(variant) }} />
                        <span className={selected ? 'font-semibold' : 'font-normal'}>{colorOptionLabel(variant, index)}</span>
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className={(activeVolumeParts || colorChoices.length ? 'mt-9 ' : '') + 'flex flex-wrap items-baseline gap-x-4 gap-y-2'}>
            <p className="m-0 text-[25px] leading-7 font-semibold tabular-nums text-midnight-ink">{selectedPrice ? formatPrice(selectedPrice) : 'Нет в наличии'}</p>
            {originalPrice && selectedPrice && originalPrice > selectedPrice ? <p className="m-0 text-[25px] leading-7 font-medium tabular-nums text-[#b3b3b3] line-through">{formatPrice(originalPrice)}</p> : null}
          </div>

          {descriptionPreview ? <p className="mt-5 mb-0 line-clamp-4 text-[13px] leading-5 text-graphite">{descriptionPreview}</p> : null}

          <button
            className="mt-7 inline-flex h-[52px] w-full items-center justify-center rounded-full bg-midnight-ink px-4 text-[11px] leading-4 font-medium text-white uppercase transition-colors hover:bg-button-hover hover:text-midnight-ink focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:bg-fog disabled:text-graphite"
            disabled={Boolean(variants.length && (!selectedVariant || !selectedVariant.quantity)) || !selectedPrice || isAdding}
            onClick={onAdd}
            type="button"
          >
            {isAdding ? 'Добавляем…' : product.locale === 'ro' ? 'Adaugă în coș' : 'Добавить в корзину'}
          </button>
        </div>

        <div className="hidden min-h-0 flex-1 flex-col max-[767px]:flex">
          <div className="min-h-0 flex-1 overflow-y-auto px-7 pt-5 pb-5">
            <div className="flex gap-4">
              <div className="flex aspect-square w-[44%] shrink-0 items-center justify-center overflow-hidden bg-[#f2f2f2]">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="size-full object-contain p-5 mix-blend-multiply" src={imageUrl} alt={product.title ?? 'Товар'} />
                ) : null}
              </div>
              <div className="flex min-w-0 flex-1 flex-col items-start justify-center py-2">
                {product.category ? <p className="mb-2 text-[10px] leading-[1.3] font-semibold tracking-[.12em] text-midnight-ink uppercase">{product.category}</p> : null}
                <h2 className="m-0 line-clamp-3 text-[18px] leading-[1.2] font-medium text-midnight-ink">{product.title ?? 'Товар без названия'}</h2>
                <Link className="mt-4 inline-flex items-center gap-2 text-[10px] leading-none font-semibold tracking-[.1em] text-midnight-ink uppercase" href={'/' + (product.locale === 'ro' ? 'ro/catalog' : 'ru/katalog') + '/product/' + product.id} onClick={requestClose}>
                  {product.locale === 'ro' ? 'Mai multe detalii' : 'Подробнее'} <ArrowRight className="size-4" strokeWidth={1.5} />
                </Link>
              </div>
            </div>

            {colorChoices.length ? (
              <div ref={mobileColorSelectRef} className="relative mt-7">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-[17px] leading-5 font-medium text-midnight-ink">{activeColorChoiceIndex + 1}</span>
                  <button
                    ref={mobileColorSelectTriggerRef}
                    aria-controls={isColorSelectOpen ? 'quick-view-color-drawer-mobile' : undefined}
                    aria-expanded={isColorSelectOpen}
                    aria-haspopup="dialog"
                    className="inline-flex items-center gap-2 text-[15px] leading-5 text-midnight-ink italic"
                    onClick={() => isColorSelectOpen ? setColorSelect(false) : openColorSelect()}
                    type="button"
                  >
                    {product.locale === 'ro' ? `Toate cele ${colorChoices.length} nuanțe` : `Все ${colorChoices.length} цветов`}
                    <ChevronDown className={'size-5 transition-transform ' + (isColorSelectOpen ? 'rotate-180' : '')} strokeWidth={1.6} />
                  </button>
                </div>
                <div className="flex items-center gap-1 overflow-x-auto overflow-y-hidden py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label={product.locale === 'ro' ? 'Nuanțe disponibile' : 'Доступные оттенки'}>
                  {colorChoices.map((variant, index) => {
                    const selected = variantColorKey(variant) === variantColorKey(activeColorVariant ?? selectedVariant ?? colorChoices[0])
                    return (
                      <button
                        aria-label={colorOptionLabel(variant, index)}
                        aria-pressed={selected}
                        className="grid size-[58px] shrink-0 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-2"
                        key={variant.id}
                        onClick={() => {
                          const matching = colorChoices.find((candidate) => variantColorKey(candidate) === variantColorKey(variant) && (!activeVolume || candidate.volume?.trim() === activeVolume)) ?? variant
                          onSelectVariant(matching.id)
                          setColorSelect(false)
                        }}
                        type="button"
                      >
                        <span className={'size-[50px] rounded-full border border-black/10 ' + (selected ? 'ring-1 ring-midnight-ink ring-offset-1' : '')} style={{ background: variantColorBackground(variant) }} />
                      </button>
                    )
                  })}
                </div>

              </div>
            ) : null}

            {activeVolumeParts ? (
              <div className="mt-5 flex items-center gap-4">
                {volumeOptions.length > 1 ? volumeOptions.map((volume) => {
                  const parts = volumeParts(volume)
                  const active = volume === activeVolume
                  return <button aria-pressed={active} className={'inline-flex size-[56px] shrink-0 items-center justify-center border text-[14px] font-medium ' + (active ? 'border-midnight-ink' : 'border-midnight-ink/25')} key={volume} onClick={() => {
                    const selectedColor = selectedVariant ? variantColorKey(selectedVariant) : ''
                    const matching = variants.find((variant) => variant.volume?.trim() === volume && (!selectedColor || variantColorKey(variant) === selectedColor)) ?? variants.find((variant) => variant.volume?.trim() === volume)
                    if (matching) onSelectVariant(matching.id)
                  }} type="button">{parts.amount}</button>
                }) : <span className="inline-flex size-[56px] shrink-0 items-center justify-center border border-midnight-ink text-[14px] font-medium">{activeVolumeParts.amount}</span>}
                <span className="text-[14px] font-medium">{activeVolumeParts.unit.toLowerCase().includes('g') ? (product.locale === 'ro' ? 'greutate, g' : 'вес, г') : (product.locale === 'ro' ? 'volum, ml' : 'объём, мл')}</span>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <p className="m-0 text-[27px] leading-8 font-medium tabular-nums text-midnight-ink">{selectedPrice ? formatPrice(selectedPrice) : 'Нет в наличии'}</p>
              {originalPrice && selectedPrice && originalPrice > selectedPrice ? <p className="m-0 text-[19px] leading-6 font-medium tabular-nums text-[#b3b3b3] line-through">{formatPrice(originalPrice)}</p> : null}
            </div>
            {discountPercent > 0 ? <p className="mt-1 mb-0 text-[13px] leading-5 font-semibold text-graphite">{product.locale === 'ro' ? `Reducere −${discountPercent}%` : `Скидка −${discountPercent}%`}</p> : null}
            {descriptionPreview ? <p className="mt-3 mb-0 line-clamp-3 text-[12px] leading-[1.55] text-graphite">{descriptionPreview}</p> : null}
          </div>

          <div className="flex shrink-0 items-center border-t border-black/5 bg-white px-7 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] min-[768px]:sticky min-[768px]:bottom-0 min-[768px]:z-20 min-[768px]:shadow-[0_-12px_24px_rgba(0,0,0,0.06)]">
            <button
              className="inline-flex h-[52px] w-full min-w-0 items-center justify-center rounded-full bg-midnight-ink px-4 text-[12px] leading-4 font-medium text-white uppercase disabled:cursor-not-allowed disabled:bg-fog disabled:text-graphite"
              disabled={Boolean(variants.length && (!selectedVariant || !selectedVariant.quantity)) || !selectedPrice || isAdding}
              onClick={onAdd}
              type="button"
            >{isAdding ? (product.locale === 'ro' ? 'Se adaugă…' : 'Добавляем…') : product.locale === 'ro' ? 'Adaugă în coș' : 'Добавить в корзину'}</button>
          </div>
        </div>

        <AnimatePresence mode="wait" custom={colorDrawerDirection.current} initial={false}>
        {isColorSelectOpen ? (
          <motion.div
            ref={mobileColorDrawerRef}
            className="absolute inset-0 z-[130] flex flex-col bg-white min-[768px]:hidden"
            custom={colorDrawerDirection.current}
            id="quick-view-color-drawer-mobile"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-view-color-drawer-title"
            variants={{
              enter: (direction: number) => ({ x: direction > 0 ? 28 : -28, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (direction: number) => ({ x: direction > 0 ? -28 : 28, opacity: 0 }),
            }}
            initial={reduceMotion ? 'center' : 'enter'}
            animate="center"
            exit={reduceMotion ? 'center' : 'exit'}
            transition={{ duration: reduceMotion ? 0 : 0.28, ease: 'easeOut' }}
          >
            <header className="grid min-h-[58px] shrink-0 grid-cols-[44px_minmax(0,1fr)_44px] items-center border-b border-fog px-4">
              <button className="flex size-10 items-center justify-start text-[26px] leading-none" type="button" onClick={() => { setColorSelect(false); mobileColorSelectTriggerRef.current?.focus() }} aria-label={product.locale === 'ro' ? 'Înapoi' : 'Назад'}>‹</button>
              <h3 className="m-0 text-center text-[15px] leading-5 font-medium" id="quick-view-color-drawer-title">{product.locale === 'ro' ? 'Alege nuanța' : 'Выберите оттенок'}</h3>
              <button className="flex size-10 items-center justify-center" type="button" onClick={() => { setColorSelect(false); mobileColorSelectTriggerRef.current?.focus() }} aria-label={product.locale === 'ro' ? 'Închide' : 'Закрыть'}><X className="size-5" strokeWidth={1.5} /></button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-2" role="group" aria-label={product.locale === 'ro' ? 'Nuanțe disponibile' : 'Доступные оттенки'}>
              {colorChoices.map((variant, index) => {
                const selected = variantColorKey(variant) === variantColorKey(activeColorVariant ?? selectedVariant ?? colorChoices[0])
                return (
                  <button
                    aria-pressed={selected}
                    className="flex min-h-[64px] w-full items-center gap-4 border-b border-[#f1f1f1] px-2 text-left text-[16px] text-midnight-ink"
                    key={variant.id}
                    onClick={() => {
                      const matching = colorChoices.find((candidate) => variantColorKey(candidate) === variantColorKey(variant) && (!activeVolume || candidate.volume?.trim() === activeVolume)) ?? variant
                      onSelectVariant(matching.id)
                      setColorSelect(false)
                      mobileColorSelectTriggerRef.current?.focus()
                    }}
                    type="button"
                  >
                    <span aria-hidden="true" className={'grid size-[48px] shrink-0 place-items-center rounded-full ' + (selected ? 'border border-midnight-ink p-[2px]' : '')}>
                      <span className="size-10 rounded-full border border-black/5" style={{ background: variantColorBackground(variant) }} />
                    </span>
                    <span className={selected ? 'font-semibold' : 'font-normal'}>{colorOptionLabel(variant, index)}</span>
                  </button>
                )
              })}
            </div>
          </motion.div>
        ) : null}
        </AnimatePresence>
      </motion.section>
    </motion.div>
  ), document.body) : null
}

export function ProductCard({ product, featured = false, home = false, firstHomeCard = false, catalog = false, brandSection = false }: { product: CatalogProduct; featured?: boolean; home?: boolean; firstHomeCard?: boolean; catalog?: boolean; brandSection?: boolean }) {
  const locale = product.locale ?? 'ru'
  const productHref = `/${locale === 'ro' ? 'ro/catalog' : 'ru/katalog'}/product/${product.id}`
  const quantityInCart = useCartStore((state) => state.items.reduce((total, item) =>
    item.id === product.id && !item.isGift ? total + item.quantity : total, 0,
  ))
  const decreaseItem = useCartStore((state) => state.decreaseItem)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [isQuickViewOpen, setQuickViewOpen] = useState(false)
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const imageFrame = useRef<HTMLAnchorElement>(null)
  const activeImageIndexRef = useRef(0)
  const variants = product.variants ?? []
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId)
    ?? variants.find((variant) => variant.quantity > 0 && variantCurrentPrice(variant))
    ?? variants[0]
    ?? null
  const imagePaths = product.gallery?.length ? product.gallery : product.image ? [product.image] : []
  const imageUrls = imagePaths.map((path) => legacyAsset(path)).filter((path): path is string => Boolean(path)).slice(0, 4)
  const imageUrl = imageUrls[activeImageIndex] ?? legacyAsset(product.image)
  const parentPrice = product.discountPrice && product.discountPrice > 0 ? product.discountPrice : product.price
  const variantPrices = variants.map(variantCurrentPrice).filter((price): price is number => Boolean(price))
  const currentPrice = parentPrice && parentPrice > 0 ? parentPrice : variantPrices.length ? Math.min(...variantPrices) : null
  const previousPrice = product.discountPrice && product.discountPrice > 0
    ? product.price
    : !parentPrice && selectedVariant?.discountPrice && selectedVariant.price ? selectedVariant.price : null
  const discountPercent = previousPrice && currentPrice && previousPrice > currentPrice
    ? Math.round(((previousPrice - currentPrice) / previousPrice) * 100)
    : 0
  const isVariable = variants.length > 0
  const isInStock = isVariable ? variants.some((variant) => variant.quantity > 0 && Boolean(variantCurrentPrice(variant))) : (product.stock ?? 1) > 0
  const optionKind = getOptionKind(variants)

  const cartItemForVariant = (variant: CatalogCardVariant) => ({
    id: product.id,
    variantId: variant.id,
    title: product.title ?? 'Товар без названия',
    variantLabel: variant.color || variant.volume,
    brand: product.brand ?? 'VIZAJE-NICA',
    price: variantCurrentPrice(variant),
    image: variant.images[0] ?? product.image,
  })

  const addSelectedVariant = async () => {
    if (!selectedVariant) return
    setIsAdding(true)
    await addValidatedCartItem(cartItemForVariant(selectedVariant))
    setIsAdding(false)
    setQuickViewOpen(false)
  }

  const addSimpleProduct = () => void addValidatedCartItem({
    id: product.id,
    variantId: null,
    title: product.title ?? 'Товар без названия',
    brand: product.brand ?? 'VIZAJE-NICA',
    price: currentPrice,
    image: product.image,
  })

  const openQuickView = () => {
    setSelectedVariantId(selectedVariant?.id ?? null)
    setQuickViewOpen(true)
  }

  const closeQuickView = useCallback(() => setQuickViewOpen(false), [])

  const showGalleryImage = (index: number) => {
    if (activeImageIndexRef.current === index) return
    activeImageIndexRef.current = index
    setActiveImageIndex(index)
  }

  const changeGalleryFromPointer = (clientX: number) => {
    const bounds = imageFrame.current?.getBoundingClientRect()
    if (!bounds?.width || imageUrls.length < 2) return
    const progress = Math.max(0, Math.min(0.999, (clientX - bounds.left) / bounds.width))
    showGalleryImage(Math.floor(progress * imageUrls.length))
  }

  const makeupProduct = isMakeupProduct(product)
  const miniOptions = (() => {
    const seen = new Set<string>()
    return variants.filter((variant) => {
      if (variant.quantity <= 0 || !variantCurrentPrice(variant)) return false
      const colors = getVariantColors(variant)
      if (makeupProduct && optionKind === 'color' && colors.length === 0) return false
      const key = optionKind === 'color'
        ? colors.join(',') || variant.color?.toLocaleLowerCase() || ''
        : optionLabel(variant)
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
  })()
  const stackOptions = miniOptions.length > 3
  const staticVolume = !variants.length && /парф|духи|аромат|fragrance|perfume|parfum/i.test(product.category ?? '')
    ? product.volume?.match(/[\d]+(?:[.,][\d]+)?/)?.[0]?.replace(',', '.')
    : null

  if (!imageUrl || !currentPrice || currentPrice <= 0) return null

  return (
    <>
      <article className={`group/product-card ${catalog ? 'mx-0' : 'mx-auto'} w-full min-w-0 text-left font-normal ${featured ? 'max-w-none' : brandSection ? 'max-w-[225px]' : catalog ? 'max-w-[320px] min-[1024px]:max-w-none max-[767px]:max-w-[187px]' : 'max-w-[320px] max-[767px]:max-w-[225px]'}`}>
        <div className="relative w-full">
          <Link
            ref={imageFrame}
            href={`${product.locale === 'ro' ? '/ro/catalog' : '/ru/katalog'}/product/${product.id}`}
            className={`relative flex w-full items-center justify-center overflow-hidden bg-[#f2f2f2] focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-2 ${featured ? 'aspect-[1.08/1] max-[900px]:aspect-square' : 'aspect-square'} ${home ? 'max-[767px]:h-[225px] max-[767px]:w-[225px]' : ''} ${brandSection ? 'h-[225px] w-[225px]' : ''} ${catalog && !featured ? 'max-[767px]:h-[220px]' : ''}`}
            onPointerEnter={(event) => {
              if (event.pointerType === 'mouse' && imageUrls.length > 1) {
                imageUrls.slice(1).forEach((source) => { const preload = new Image(); preload.src = source })
                changeGalleryFromPointer(event.clientX)
              }
            }}
            onPointerMove={(event) => { if (event.pointerType === 'mouse') changeGalleryFromPointer(event.clientX) }}
            onPointerLeave={(event) => { if (event.pointerType === 'mouse') showGalleryImage(0) }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={`h-auto w-auto max-h-[78%] max-w-[78%] object-contain mix-blend-multiply transition-transform duration-[450ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] group-hover/product-card:scale-[1.035] motion-reduce:transition-none ${!isInStock ? 'grayscale opacity-70' : ''}`}
              src={imageUrl}
              alt={product.title ?? 'Товар'}
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          </Link>

          {catalog ? <FavoriteToggle productId={product.id} locale={locale} toastProduct={{ title: product.title ?? 'Товар без названия', image: product.image }} className="absolute top-4 right-4 z-10 inline-flex size-8 items-center justify-center bg-transparent text-midnight-ink transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-2" /> : null}

          {isInStock && quantityInCart > 0 ? (
            <div className="absolute right-2 bottom-2 inline-flex h-10 w-[106px] min-w-[106px] items-center justify-between gap-0.5 rounded-full border border-midnight-ink bg-midnight-ink px-2 text-white" aria-label={`Количество в корзине: ${quantityInCart}`}>
              <button
                className="inline-flex size-7 items-center justify-center rounded-full text-current transition-colors hover:text-hover-cream focus-visible:outline-2 focus-visible:outline-hover-cream"
                type="button"
                onClick={() => {
                  const item = useCartStore.getState().items.find((cartItem) => cartItem.id === product.id && !cartItem.isGift)
                  if (item) decreaseItem(item.id, item.variantId ?? null)
                }}
                aria-label="Уменьшить количество"
              ><Minus size={15} /></button>
              <span className="min-w-6 text-center text-[13px] leading-none font-semibold tabular-nums">{quantityInCart}</span>
              <button
                className="inline-flex size-7 items-center justify-center rounded-full text-current transition-colors hover:text-hover-cream focus-visible:outline-2 focus-visible:outline-hover-cream"
                type="button"
                onClick={isVariable ? openQuickView : addSimpleProduct}
                aria-label="Увеличить количество"
              ><Plus size={15} /></button>
            </div>
          ) : isInStock ? (
            <button
              className={`absolute top-3 right-3 inline-flex items-center justify-center rounded-full border border-black/20 bg-white text-midnight-ink shadow-[0_6px_18px_rgba(17,17,17,0.12)] transition-[background-color,border-color,color,transform,box-shadow,opacity] duration-200 hover:-translate-y-px hover:border-hover-cream hover:bg-button-hover hover:text-midnight-ink hover:shadow-[0_10px_26px_rgba(17,17,17,0.16)] active:scale-95 focus-visible:outline-0 focus-visible:ring-2 focus-visible:ring-hover-cream focus-visible:ring-offset-2 min-[1024px]:top-auto min-[1024px]:bottom-3 min-[1024px]:opacity-0 min-[1024px]:group-hover/product-card:opacity-100 ${brandSection ? 'size-[35px]' : 'size-[45px] max-[767px]:size-[35px]'}`}
              type="button"
              onClick={isVariable ? openQuickView : addSimpleProduct}
              aria-label={isVariable ? 'Выбрать вариант и добавить в корзину' : 'Добавить в корзину'}
              title={isVariable ? 'Выбрать вариант' : 'Добавить в корзину'}
            ><CartIcon size={brandSection ? 20 : 25} className={brandSection ? 'size-5' : 'size-5 min-[768px]:size-[25px]'} /></button>
          ) : null}
        </div>

        {miniOptions.length || staticVolume ? (
          <div className={`flex min-h-4 items-center justify-start gap-1 pt-[10px] ${firstHomeCard ? 'max-[767px]:pl-[10px]' : ''} ${catalog ? 'max-[767px]:pl-[15px] min-[1024px]:px-3' : ''}`} role="group" aria-label={optionKind === 'color' ? 'Доступные оттенки' : 'Доступные объёмы'}>
            {staticVolume ? <span className="inline-flex h-[17px] min-w-[25px] items-center justify-center rounded-full border border-[#c9c9c9] bg-white px-[5px] text-[10px] leading-none font-normal text-midnight-ink transition-colors group-hover/product-card:text-hover-cream">{staticVolume}</span> : null}
            <div className="flex min-w-0 items-center gap-1">
              {(optionKind === 'color' && stackOptions ? miniOptions.slice(0, 3) : miniOptions).map((variant, index) => {
                const colors = getVariantColors(variant)
                const background = colors.length > 1
                  ? `conic-gradient(${colors.map((color, index) => `${color} ${(index / colors.length) * 360}deg ${((index + 1) / colors.length) * 360}deg`).join(', ')})`
                  : colors[0]
                return optionKind === 'color' && background ? (
                  <span key={variant.id} aria-label={variant.color ?? colors.join(', ')} className={`relative size-4 shrink-0 rounded-full border border-black/[.12] ${stackOptions && index > 0 ? '-ml-[10px]' : ''}`} role="img" title={variant.color ?? undefined} style={{ background, zIndex: 1 }} />
                ) : optionKind === 'color' ? (
                  <span key={variant.id} className={`relative max-w-24 overflow-hidden text-ellipsis whitespace-nowrap text-[10px] leading-[1.2] text-midnight-ink transition-colors group-hover/product-card:text-hover-cream ${stackOptions && index > 0 ? '-ml-[3px] text-[9px]' : ''}`} style={{ zIndex: 1 }}>
                    {variant.color || variant.volume || 'Оттенок'}
                  </span>
                ) : (
                  <span key={variant.id} className={`relative inline-flex h-[17px] min-w-[25px] items-center justify-center rounded-full border border-[#c9c9c9] bg-white px-[5px] text-[10px] leading-none font-normal text-midnight-ink transition-colors group-hover/product-card:text-hover-cream ${stackOptions && index > 0 ? '-ml-[10px] text-[9px]' : ''}`} style={{ zIndex: 1 }}>
                    {optionLabel(variant, optionKind)}
                  </span>
                )
              })}
              {optionKind === 'color' && stackOptions ? <span className="relative ml-0.5 text-[9px] leading-none font-semibold text-graphite transition-colors group-hover/product-card:text-hover-cream">+{miniOptions.length - 3}</span> : null}
            </div>
          </div>
        ) : null}

        <div className={`${miniOptions.length || staticVolume ? 'pt-1' : 'pt-[10px]'} text-left ${catalog ? 'mt-[15px] max-[767px]:pl-[15px] min-[1024px]:px-3' : ''} ${firstHomeCard ? 'max-[767px]:pl-[10px]' : ''}`}>
          <div className="flex min-w-0 flex-col gap-2">
            {product.category ? <p className={`m-0 w-full truncate text-[9px] leading-[1.2] font-medium tracking-[1.4px] text-black/60 uppercase transition-colors group-hover/product-card:text-hover-cream ${brandSection ? '' : 'min-[768px]:text-[11px]'}`}>{product.category}</p> : null}
            <h3 className={`m-0 min-h-[2.7em] w-full min-w-0 overflow-hidden text-[16px] leading-[1.35] font-medium text-midnight-ink transition-colors group-hover/product-card:text-hover-cream line-clamp-2 ${brandSection ? '' : 'min-[768px]:text-[20px]'}`}>
              <Link className="text-inherit no-underline" href={productHref}>{product.title ?? 'Товар без названия'}</Link>
            </h3>
          </div>
          <div className="mt-3 flex flex-col items-start">
            {discountPercent > 0 && previousPrice ? (
              <div className={`mb-1 flex flex-wrap items-baseline gap-x-2 ${brandSection ? 'text-[13px]' : 'text-[15px]'} leading-[1.25] ${home && !brandSection ? 'max-[767px]:text-[13px]' : ''}`}>
                <span className="font-medium text-[#8e1f2d] transition-colors group-hover/product-card:text-hover-cream">
                  {locale === 'ro' ? 'Cu reducere' : 'Со скидкой'} {discountPercent}%
                </span>
                <span className="font-normal text-[#b3b3b3] line-through transition-colors group-hover/product-card:text-hover-cream">{formatPrice(previousPrice)}</span>
              </div>
            ) : null}
            <p className={`m-0 text-[17px] leading-[1.2] font-medium text-midnight-ink transition-colors group-hover/product-card:text-hover-cream ${brandSection ? '' : 'min-[768px]:text-[21px]'}`}>
              {isVariable && product.hasBasePrice === false ? 'от ' : ''}{formatPrice(currentPrice)}
            </p>
          </div>
          {!isInStock ? <p className="mt-2 mb-0 text-xs text-graphite transition-colors group-hover/product-card:text-hover-cream">Нет в наличии</p> : null}
        </div>
      </article>

      <AnimatePresence initial={false}>
      {isQuickViewOpen ? (
        <ProductQuickView
          key="quick-view"
          product={product}
          selectedVariant={selectedVariant}
          onSelectVariant={setSelectedVariantId}
          onClose={closeQuickView}
          onAdd={() => void addSelectedVariant()}
          isAdding={isAdding}
        />
      ) : null}
      </AnimatePresence>
    </>
  )
}
