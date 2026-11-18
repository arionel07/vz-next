'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowUpRight, Clock3, MapPin, Phone, SlidersHorizontal, Store as StoreIcon, X } from 'lucide-react'

import type { Store } from '@/lib/stores'
import type { StoreLocale } from '@/lib/locale-routing'

function mapsRoute(store: Store) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${store.lat},${store.lng}`)}`
}

function embeddedMap(store: Store) {
  const latitude = store.lat
  const longitude = store.lng
  const offset = 0.012
  const bounds = [longitude - offset, latitude - offset, longitude + offset, latitude + offset]
    .map((coordinate) => coordinate.toFixed(6))
    .join('%2C')

  return `https://www.openstreetmap.org/export/embed.html?bbox=${bounds}&layer=mapnik&marker=${latitude}%2C${longitude}`
}

export function StoresExplorer({ stores, locale }: { stores: Store[]; locale: StoreLocale }) {
  const isRomanian = locale === 'ro'
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [activeStoreId, setActiveStoreId] = useState<number | null>(null)
  const [isHeaderCondensed, setIsHeaderCondensed] = useState(false)
  const reduceMotion = useReducedMotion()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const quickStoreLabels = isRomanian
    ? ['PORT', 'MALL', 'GEMINI', 'UNIC', 'SUN CITY']
    : ['ПОРТ', 'МОЛЛ', 'ГЕМИНИ', 'ЮНИК', 'САН СИТИ']
  const quickStores = stores.slice(0, 5).map((store, index) => ({ store, label: quickStoreLabels[index] }))

  useEffect(() => {
    if (!isDrawerOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsDrawerOpen(false)
        return
      }

      if (event.key !== 'Tab' || !drawerRef.current) return
      const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      previousFocusRef.current?.focus()
    }
  }, [isDrawerOpen])

  useEffect(() => {
    if (window.innerWidth <= 600) return

    let previousY = window.scrollY
    setIsHeaderCondensed(previousY > 4)

    function handleScroll() {
      const currentY = window.scrollY
      if (currentY <= 0) {
        setIsHeaderCondensed(false)
        previousY = currentY
        return
      }

      const delta = currentY - previousY
      if (Math.abs(delta) > 4) {
        setIsHeaderCondensed(delta > 0)
        previousY = currentY
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  function openDrawer() {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setIsDrawerOpen(true)
  }

  function goToStore(store: Store) {
    setActiveStoreId(store.id)
    setIsDrawerOpen(false)
    window.setTimeout(() => {
      document.getElementById(`store-location-${store.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  function goToStoreFromQuickFilter(store: Store) {
    setActiveStoreId(store.id)
    document.getElementById(`store-location-${store.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (stores.length === 0) {
    return (
      <div className="mx-auto max-w-[1600px] px-5 pb-24 sm:px-8 md:px-12">
        <div className="border-y border-[#e8e8e8] py-16 text-center">
          <StoreIcon aria-hidden="true" className="mx-auto mb-5 h-8 w-8 text-[#777]" strokeWidth={1.4} />
          <h2 className="m-0 text-xl font-medium">{isRomanian ? 'Magazinele nu sunt disponibile' : 'Магазины пока не добавлены'}</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="text-[#111]">
      <div
        className={`sticky z-40 border-y border-[#e7e7e7] bg-white/95 backdrop-blur-md transition-[top,transform,opacity] duration-300 ease-out max-[600px]:top-[58px] max-[600px]:translate-y-0 max-[600px]:opacity-100 max-[600px]:pointer-events-auto ${isHeaderCondensed ? 'pointer-events-none top-[112px] -translate-y-full opacity-0' : 'top-[180px] translate-y-0 opacity-100'}`}
      >
        <div className="mx-auto flex min-h-[58px] max-w-[1600px] items-center gap-5 px-5 sm:px-8 md:px-12">
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={isDrawerOpen}
            onClick={openDrawer}
            className="inline-flex min-h-11 shrink-0 items-center gap-2.5 rounded-full px-3 text-sm font-medium transition-colors hover:bg-[#f2f2f2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111]"
          >
            <SlidersHorizontal aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={1.7} />
            {isRomanian ? 'Filtre' : 'Фильтры'}
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {quickStores.map(({ store, label }) => (
              <button
                key={store.id}
                type="button"
                aria-pressed={activeStoreId === store.id}
                onClick={() => goToStoreFromQuickFilter(store)}
                className={`inline-flex min-h-9 shrink-0 items-center rounded-full border px-4 text-[10px] font-medium uppercase tracking-[0.12em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111] ${activeStoreId === store.id ? 'border-[#111] bg-[#111] text-white' : 'border-[#111] bg-white text-[#111] hover:border-[#cdbbb0] hover:bg-[#cdbbb0]'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="hidden shrink-0 text-xs text-[#777] md:inline">
            {quickStores.length} {isRomanian ? 'locații' : 'магазинов'}
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-5 sm:px-8 md:px-12">
        <div className="divide-y divide-[#e7e7e7]">
          {stores.map((store, index) => {
            const phoneHref = store.phone.replace(/[^\d+]/g, '')

            return (
              <section
                id={`store-location-${store.id}`}
                key={store.id}
                aria-labelledby={`store-title-${store.id}`}
                className="grid scroll-mt-[154px] grid-cols-1 gap-6 py-8 sm:gap-8 md:grid-cols-[minmax(260px,0.42fr)_minmax(0,1fr)] md:gap-10 md:py-11 max-[600px]:scroll-mt-[72px]"
              >
                <div className="flex min-w-0 flex-col justify-center md:py-5">
                  <p className="mb-4 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[#777]">
                    <span className="h-px w-6 bg-[#cdbbb0]" />
                    {quickStoreLabels[index] ?? (isRomanian ? `Magazin ${String(index + 1).padStart(2, '0')}` : `Магазин ${String(index + 1).padStart(2, '0')}`)}
                  </p>
                  <h2 id={`store-title-${store.id}`} className="m-0 text-[28px] font-medium leading-[1.1] tracking-[-0.04em] sm:text-[32px]">
                    {store.title}
                  </h2>

                  {store.address ? (
                    <p className="mb-0 mt-4 flex items-start gap-2.5 whitespace-pre-line text-[15px] leading-6 text-[#555]">
                      <MapPin aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-[#8b786d]" strokeWidth={1.6} />
                      <span>{store.address}</span>
                    </p>
                  ) : null}

                  {store.schedule ? (
                    <div className="mt-6 flex items-start gap-2.5 border-t border-[#ededed] pt-5 text-sm leading-[1.65] text-[#555]">
                      <Clock3 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#8b786d]" strokeWidth={1.6} />
                      <p className="m-0 whitespace-pre-line">{store.schedule}</p>
                    </div>
                  ) : null}

                  <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
                    <a
                      href={mapsRoute(store)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#111] px-5 text-xs font-medium text-white transition-colors hover:bg-[#cdbbb0] hover:text-[#111] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111]"
                    >
                      {isRomanian ? 'Traseu pe Google Maps' : 'Маршрут в Google Maps'}
                      <ArrowUpRight aria-hidden="true" className="h-4 w-4" strokeWidth={1.7} />
                    </a>
                    {phoneHref ? (
                      <a href={`tel:${phoneHref}`} className="inline-flex min-h-10 items-center gap-2 text-sm text-[#555] transition-colors hover:text-[#ab8a73]">
                        <Phone aria-hidden="true" className="h-4 w-4" strokeWidth={1.6} />
                        {store.phone}
                      </a>
                    ) : null}
                  </div>
                </div>

                <div className="relative isolate h-[300px] overflow-hidden border border-[#e5e5e5] bg-[#f2f2f2] sm:h-[360px] md:h-[500px]">
                  <iframe
                    title={`${isRomanian ? 'Locația magazinului' : 'Расположение магазина'}: ${store.title}`}
                    src={embeddedMap(store)}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="absolute inset-0 h-full w-full border-0 [filter:grayscale(1)_contrast(1.08)_brightness(1.02)]"
                  />
                  <div className="pointer-events-none absolute left-4 top-4 inline-flex items-center gap-2 bg-white/95 px-3 py-2 text-xs font-medium shadow-sm">
                    <MapPin aria-hidden="true" className="h-4 w-4 text-[#8b786d]" strokeWidth={1.7} />
                    {quickStoreLabels[index] ?? (isRomanian ? 'Locația magazinului' : 'Местоположение магазина')}
                  </div>
                </div>
              </section>
            )
          })}
        </div>
      </div>

      <AnimatePresence initial={false}>
      {isDrawerOpen ? (
        <motion.div
          className="fixed inset-0 z-[1000]"
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
          <button
            type="button"
            aria-label={isRomanian ? 'Închide lista magazinelor' : 'Закрыть список магазинов'}
            onClick={() => setIsDrawerOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-black/35"
          />
          <motion.aside
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="stores-drawer-title"
          className="absolute bottom-0 left-0 top-0 flex w-[min(440px,92vw)] flex-col border-r border-[#e5e5e5] bg-white shadow-[12px_0_48px_rgba(0,0,0,0.12)] min-[992px]:w-[48vw] min-[992px]:max-w-none max-[600px]:w-full"
            initial={reduceMotion ? { x: 0 } : { x: '-100%' }}
            animate={{ x: 0 }}
            exit={reduceMotion ? { x: 0 } : { x: '-100%' }}
            transition={{ duration: reduceMotion ? 0 : 0.48, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex min-h-[88px] items-center justify-between border-b border-[#e8e8e8] px-6 py-5 sm:px-8">
              <div className="flex items-baseline gap-5">
                <h2 id="stores-drawer-title" className="m-0 text-[26px] font-medium tracking-[-0.045em]">
                  {isRomanian ? 'Filtre' : 'Фильтры'}
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveStoreId(null)}
                  className="border-0 bg-transparent p-0 text-sm text-[#777] underline-offset-4 transition-colors hover:text-[#111] hover:underline"
                >
                  {isRomanian ? 'Resetează' : 'Сбросить'}
                </button>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label={isRomanian ? 'Închide' : 'Закрыть'}
                onClick={() => setIsDrawerOpen(false)}
                className="-mr-2 -mt-1 inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-[#f2f2f2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111]"
              >
                <X aria-hidden="true" className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 sm:px-7">
              <p className="mb-3 mt-6 px-2 text-[10px] font-medium uppercase tracking-[0.16em] text-[#777]">
                {isRomanian ? 'Alegeți magazinul' : 'Выберите магазин'}
              </p>
              {stores.map((store, index) => (
                <button
                  key={store.id}
                  type="button"
                  aria-current={activeStoreId === store.id ? 'location' : undefined}
                  onClick={() => goToStore(store)}
                  className={`group flex w-full items-center gap-4 border-b border-[#ededed] px-2 py-5 text-left transition-colors hover:bg-[#f7f5f3] sm:gap-5 sm:py-6 ${activeStoreId === store.id ? 'bg-[#f7f5f3]' : ''}`}
                >
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-[9px] font-medium uppercase tracking-[0.06em] transition-colors ${activeStoreId === store.id ? 'border-[#111] bg-[#111] text-white' : 'border-[#dedede] bg-white text-[#555] group-hover:border-[#cdbbb0] group-hover:bg-[#cdbbb0] group-hover:text-[#111]'}`}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <strong className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#777]">
                      {quickStoreLabels[index] ?? (isRomanian ? `Magazin ${String(index + 1).padStart(2, '0')}` : `Магазин ${String(index + 1).padStart(2, '0')}`)}
                    </strong>
                    <span className="mt-1 text-[16px] font-medium leading-5 text-[#111]">{store.title}</span>
                    {store.address ? <span className="mt-1 whitespace-pre-line text-[13px] leading-5 text-[#777]">{store.address}</span> : null}
                  </span>
                  <ArrowUpRight aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-[#777] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#111]" strokeWidth={1.6} />
                </button>
              ))}
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
      </AnimatePresence>
    </div>
  )
}
