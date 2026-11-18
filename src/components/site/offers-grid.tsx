'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ListFilter, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

import type { OfferFilter, OfferSummary } from '@/lib/offers'
import type { StoreLocale } from '@/lib/locale-routing'

const filterOrder: OfferFilter[] = ['gift', 'special-price', 'announcement']

type OfferCard = OfferSummary & { imageUrl: string | null }

function offerFilterLabel(filter: OfferFilter, locale: StoreLocale) {
  const labels: Record<OfferFilter, { ru: string; ro: string }> = {
    'promo-code': { ru: 'Промокод', ro: 'Cod promoțional' },
    gift: { ru: 'Подарок', ro: 'Cadou' },
    'special-price': { ru: 'Специальные цены', ro: 'Prețuri speciale' },
    announcement: { ru: 'Анонс', ro: 'Anunț' },
  }
  return labels[filter][locale]
}

function offerHref(offer: OfferSummary, locale: StoreLocale) {
  const slug = encodeURIComponent(offer.uri?.trim() || String(offer.id))
  return locale === 'ro' ? `/ro/promotii/${slug}` : `/ru/aktsii/${slug}`
}

function formatDate(value: string, locale: StoreLocale) {
  if (!value || value === '0000-00-00') return ''
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime())
    ? ''
    : new Intl.DateTimeFormat(locale === 'ro' ? 'ro-RO' : 'ru-RU', { day: 'numeric', month: 'long' }).format(date)
}

function offerTypeTagClass(filter: OfferFilter) {
  if (filter === 'promo-code' || filter === 'announcement') return 'bg-[#6d45a3] text-white'
  return 'bg-[#f2d451] text-[#111111]'
}

export function OffersGrid({ offers, locale }: { offers: OfferCard[]; locale: StoreLocale }) {
  const [activeFilter, setActiveFilter] = useState<OfferFilter | null>(null)
  const [desktopFiltersOpen, setDesktopFiltersOpen] = useState(false)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!mobileFiltersOpen) return
    const previousOverflow = document.body.style.overflow
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileFiltersOpen(false)
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', closeOnEscape)
    closeButtonRef.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
      previousFocus?.focus()
    }
  }, [mobileFiltersOpen])

  const visibleOffers = activeFilter
    ? offers.filter((offer) => offer.filterTypes.includes(activeFilter))
    : offers
  const text = locale === 'ro'
    ? { title: 'Promoții', filter: 'Filtre', clear: 'Toate promoțiile', emptyTitle: 'Nu există promoții în această categorie', empty: 'Alege alt filtru sau revino la toate promoțiile.', apply: 'Afișează promoțiile' }
    : { title: 'акции', filter: 'Фильтры', clear: 'Все акции', emptyTitle: 'В этой категории пока нет акций', empty: 'Выберите другой фильтр или покажите все акции.', apply: 'Показать акции' }

  function selectFilter(filter: OfferFilter) {
    setActiveFilter((current) => current === filter ? null : filter)
  }

  function renderFilterButtons(onSelect?: () => void) {
    return filterOrder.map((filter) => {
      const active = activeFilter === filter
      return (
        <button
          aria-pressed={active}
          className={`min-h-11 shrink-0 rounded-full border px-5 text-[11px] font-semibold tracking-[0.12em] uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111111] ${active ? 'border-black bg-black text-white' : 'border-[#111111] bg-white text-[#111111] hover:border-[#ab8a73] hover:text-[#ab8a73]'}`}
          key={filter}
          onClick={() => { selectFilter(filter); onSelect?.() }}
          type="button"
        >
          {offerFilterLabel(filter, locale)}
        </button>
      )
    })
  }

  return (
    <main aria-labelledby="offers-title" className="mx-auto min-h-[900px] w-full max-w-[1920px] bg-white px-[5vw] pt-20 pb-32 max-[900px]:px-4 max-[900px]:pt-14 max-[900px]:pb-20">
      <header className="mb-[60px] text-center max-[900px]:mb-10 max-[900px]:text-left">
        <h1 className="m-0 text-[clamp(62px,6vw,102px)] leading-[0.95] font-medium tracking-[-0.08em] text-[#111111] max-[900px]:text-[56px]">
          <span id="offers-title">{text.title}</span>{' '}
          <span aria-label={`${offers.length} ${locale === 'ro' ? 'promoții' : 'акции'}`} className="align-[0.18em] text-[0.5em] tracking-[-0.05em] text-[#707070]">/ {offers.length}</span>
        </h1>
      </header>

      <div className="mb-12 grid min-h-11 grid-cols-[minmax(160px,1fr)_auto_minmax(160px,1fr)] items-center max-[900px]:mb-8 max-[900px]:flex max-[900px]:justify-start">
        <button
          aria-expanded={desktopFiltersOpen}
          className="hidden items-center gap-3 justify-self-start text-[20px] font-semibold text-[#111111] transition-colors hover:text-[#ab8a73] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#111111] min-[901px]:inline-flex"
          onClick={() => setDesktopFiltersOpen((open) => !open)}
          type="button"
        >
          <ListFilter aria-hidden="true" size={20} strokeWidth={1.7} />{text.filter}
        </button>
        <div className={`hidden flex-wrap items-center justify-center gap-2.5 ${desktopFiltersOpen ? 'min-[901px]:flex' : ''}`}>
          {renderFilterButtons()}
        </div>
        <button
          aria-expanded={mobileFiltersOpen}
          className="inline-flex h-11 items-center gap-2.5 rounded-full border border-[#111111] px-5 text-[12px] font-semibold tracking-[0.1em] uppercase text-[#111111] transition-colors hover:border-[#ab8a73] hover:text-[#ab8a73] min-[901px]:hidden"
          onClick={() => setMobileFiltersOpen(true)}
          type="button"
        >
          <ListFilter aria-hidden="true" size={17} strokeWidth={1.7} />{text.filter}
          {activeFilter ? <span aria-hidden="true" className="grid size-5 place-items-center rounded-full bg-black text-[10px] text-white">1</span> : null}
        </button>
        <span aria-hidden="true" className="hidden min-[901px]:block" />
      </div>

      {visibleOffers.length ? (
        <div className="grid grid-cols-2 gap-x-[5.4vw] gap-y-[75px] max-[900px]:grid-cols-1 max-[900px]:gap-y-[55px]">
          {visibleOffers.map((offer) => {
            const href = offerHref(offer, locale)
            const title = offer.title ?? (locale === 'ro' ? 'Promoție Vizaje-Nica' : 'Акция Vizaje-Nica')
            const imageUrl = offer.imageUrl
            const date = formatDate(offer.dateTo, locale)
            const channel = offer.isOnline === 0 ? (locale === 'ro' ? 'Offline' : 'Офлайн') : offer.isOnline === 2 ? (locale === 'ro' ? 'Online și offline' : 'Онлайн и офлайн') : 'Online'

            return (
              <article className="group min-w-0" key={offer.id}>
                <Link aria-label={title} className="relative mb-0 block aspect-[1.79/1] overflow-hidden bg-[#f2f2f2] max-[900px]:aspect-[1.32/1]" href={href}>
                  {imageUrl ? (
                    <Image alt={title} className="object-cover transition-transform duration-[400ms] group-hover:scale-[1.025]" fill priority={visibleOffers.indexOf(offer) < 2} sizes="(max-width: 900px) 100vw, 45vw" src={imageUrl} unoptimized />
                  ) : (
                    <span className="absolute inset-0 grid place-items-center text-[20px] text-[#707070]">Vizaje-Nica</span>
                  )}
                  <div aria-label={locale === 'ro' ? 'Tipuri de promoție' : 'Типы акции'} className="absolute top-0 left-0 flex flex-wrap">
                    {offer.filterTypes.map((filter) => <span className={`px-2.5 py-2 text-[10px] leading-none font-bold tracking-[0.04em] ${offerTypeTagClass(filter)}`} key={filter}>{offerFilterLabel(filter, locale)}</span>)}
                  </div>
                  <span className="absolute top-2.5 right-2.5 rounded-full bg-white/90 px-2.5 py-1 text-[9px] font-medium text-[#333333]">{channel}</span>
                  {date ? <time className="absolute right-[4%] bottom-5 text-[clamp(16px,1.45vw,25px)] font-semibold text-black max-[900px]:bottom-[22px] max-[900px]:text-[15px]" dateTime={offer.dateTo}>{date}</time> : null}
                </Link>
                <div className="relative z-[1] -mt-1 max-w-[90%] bg-white pl-11 max-[900px]:max-w-full max-[900px]:pl-0">
                  <h2 className="m-0 mb-5 text-[clamp(32px,3.2vw,57px)] leading-[0.95] font-semibold tracking-[-0.07em] text-[#111111] max-[900px]:mb-4 max-[900px]:text-[34px]">
                    <Link className="transition-colors hover:text-[#ab8a73]" href={href}>{title}</Link>
                  </h2>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="border-t border-[#dedede] py-[70px] text-center">
          <h2 className="mb-3 text-[24px] font-medium text-[#111111]">{text.emptyTitle}</h2>
          <p className="m-0 text-[14px] leading-6 text-[#707070]">{text.empty}</p>
          {activeFilter ? <button className="mt-5 text-[12px] font-medium underline underline-offset-4" onClick={() => setActiveFilter(null)} type="button">{text.clear}</button> : null}
        </div>
      )}

      <AnimatePresence initial={false}>
      {mobileFiltersOpen ? (
        <motion.div
          className="fixed inset-0 z-[120] bg-black/45 min-[901px]:hidden"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setMobileFiltersOpen(false) }}
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.aside
            aria-labelledby="offer-filters-title"
            aria-modal="true"
            className="absolute inset-y-0 right-0 flex w-full max-w-[420px] flex-col bg-white shadow-2xl min-[992px]:w-[48vw] min-[992px]:max-w-none"
            role="dialog"
            initial={reduceMotion ? { x: 0 } : { x: '100%' }}
            animate={{ x: 0 }}
            exit={reduceMotion ? { x: 0 } : { x: '100%' }}
            transition={{ duration: reduceMotion ? 0 : 0.48, ease: [0.16, 1, 0.3, 1] }}
          >
            <header className="flex items-center justify-between border-b border-[#e8e8e8] px-5 py-5">
              <h2 className="m-0 text-[19px] font-medium text-[#111111]" id="offer-filters-title">{text.filter}</h2>
              <button aria-label={locale === 'ro' ? 'Închide filtrele' : 'Закрыть фильтры'} className="grid size-10 place-items-center rounded-full transition hover:bg-[#f2f2f2] focus-visible:outline-2 focus-visible:outline-[#111111]" onClick={() => setMobileFiltersOpen(false)} ref={closeButtonRef} type="button"><X aria-hidden="true" size={21} /></button>
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              <button aria-pressed={activeFilter === null} className={`flex min-h-12 w-full items-center justify-between rounded-xl border px-4 text-left text-[13px] font-medium ${activeFilter === null ? 'border-black bg-black text-white' : 'border-[#dedede] bg-white text-[#111111]'}`} onClick={() => setActiveFilter(null)} type="button">{text.clear}{activeFilter === null ? <span aria-hidden="true">✓</span> : null}</button>
              {filterOrder.map((filter) => (
                <button aria-pressed={activeFilter === filter} className={`flex min-h-12 w-full items-center justify-between rounded-xl border px-4 text-left text-[13px] font-medium ${activeFilter === filter ? 'border-black bg-black text-white' : 'border-[#dedede] bg-white text-[#111111]'}`} key={filter} onClick={() => selectFilter(filter)} type="button">
                  {offerFilterLabel(filter, locale)}{activeFilter === filter ? <span aria-hidden="true">✓</span> : null}
                </button>
              ))}
            </div>
            <footer className="border-t border-[#e8e8e8] p-5">
              <button className="h-12 w-full rounded-full bg-black px-5 text-[11px] font-semibold tracking-[0.12em] text-white uppercase transition hover:bg-[#2a2a2a]" onClick={() => setMobileFiltersOpen(false)} type="button">{text.apply} ({visibleOffers.length})</button>
            </footer>
          </motion.aside>
        </motion.div>
      ) : null}
      </AnimatePresence>
    </main>
  )
}
